-- ============================================================
-- Student OS AI — Migration v21 FIX (Get or Create Private Chat)
-- ============================================================

-- BƯỚC 1: Dọn dẹp các phòng Private Chat bị lỗi (chỉ có 1 thành viên, hoặc bị duplicate)
-- XÓA TẤT CẢ private chat cũ để tạo lại đúng cách
-- (Chạy từng câu lệnh một)

-- Xem danh sách các Private Chat hiện có:
-- SELECT cc.id, cc.name, cc.description, cc.creator_id,
--        array_agg(cm.user_id) as members
-- FROM public.chat_channels cc
-- LEFT JOIN public.chat_members cm ON cm.channel_id = cc.id
-- WHERE cc.description = 'Private Chat'
-- GROUP BY cc.id;

-- Xóa toàn bộ Private Chat cũ (tin nhắn sẽ xóa theo do cascade):
DELETE FROM public.chat_channels WHERE description = 'Private Chat';

-- ============================================================
-- BƯỚC 2: Tạo lại hàm get_or_create_private_chat đúng cú pháp
-- ============================================================

CREATE OR REPLACE FUNCTION get_or_create_private_chat(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  found_channel_id UUID;
  other_name TEXT;
  new_channel_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create chat with yourself';
  END IF;

  -- Bypass RLS trong function SECURITY DEFINER để tìm kiếm không bị giới hạn
  SET LOCAL row_security = off;

  -- Tìm phòng Private Chat đã tồn tại giữa 2 người này
  SELECT cm1.channel_id INTO found_channel_id
  FROM public.chat_members cm1
  JOIN public.chat_members cm2 ON cm1.channel_id = cm2.channel_id
  JOIN public.chat_channels cc ON cc.id = cm1.channel_id
  WHERE cm1.user_id = current_user_id
    AND cm2.user_id = other_user_id
    AND cc.description = 'Private Chat'
  LIMIT 1;

  -- Nếu đã có rồi thì trả về luôn
  IF found_channel_id IS NOT NULL THEN
    RETURN found_channel_id;
  END IF;

  -- Lấy tên người kia để đặt tên phòng
  SELECT COALESCE(full_name, 'Người dùng') INTO other_name
  FROM public.profiles
  WHERE id = other_user_id;

  -- Tạo phòng chat mới
  INSERT INTO public.chat_channels (name, description, is_global, creator_id)
  VALUES ('Chat với ' || COALESCE(other_name, 'Người dùng'), 'Private Chat', false, current_user_id)
  RETURNING id INTO new_channel_id;

  -- Thêm cả 2 người vào phòng — dùng ON CONFLICT để tránh lỗi duplicate
  INSERT INTO public.chat_members (channel_id, user_id, role)
  VALUES 
    (new_channel_id, current_user_id, 'owner'),
    (new_channel_id, other_user_id, 'member')
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN new_channel_id;
END;
$$;

-- ============================================================
-- BƯỚC 3: Đảm bảo RLS cho chat_channels cho phép SELECT đúng
-- ============================================================

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Xóa hết policy cũ có thể bị conflict
DROP POLICY IF EXISTS "chat_channels: read all" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels: read public or member" ON public.chat_channels;

-- Tạo lại policy đọc đúng
CREATE POLICY "chat_channels: read public or member" ON public.chat_channels
  FOR SELECT USING (
    is_global = true OR
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.channel_id = id
      AND cm.user_id = auth.uid()
    )
  );

-- Đảm bảo chat_members có thể đọc được
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_members: read all" ON public.chat_members;
CREATE POLICY "chat_members: read all" ON public.chat_members
  FOR SELECT USING (true);

-- Cho phép function SECURITY DEFINER tự insert thành viên (bypass RLS)
DROP POLICY IF EXISTS "chat_members: insert own" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members: insert own or admin" ON public.chat_members;
CREATE POLICY "chat_members: insert own or admin" ON public.chat_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = channel_id AND cc.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.channel_id = chat_members.channel_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  );

-- Kích hoạt Realtime cho chat_members để bên kia thấy phòng chat mới ngay lập tức
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
  END IF;
END $$;
