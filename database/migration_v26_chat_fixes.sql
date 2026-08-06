-- ============================================================
-- Student OS AI — Migration v26 (Chat Fixes)
-- 1. Fix Privacy Leak on chat_members
-- 2. Add Anti-spam Rate Limiting for community_messages
-- ============================================================

-- ── 1. Fix Privacy Leak trên chat_members ────────────

-- Xóa policy cũ
DROP POLICY IF EXISTS "chat_members: read all" ON public.chat_members;

-- Tạo 2 helper function SECURITY DEFINER để tránh vòng lặp đệ quy RLS:
-- chat_channels policy → query chat_members → chat_members policy → query chat_channels → ♾️
-- Giải pháp: dùng SECURITY DEFINER function, chạy với quyền superuser, hoàn toàn bypass RLS

-- Function 1: Kiểm tra kênh có public không (bypass chat_channels RLS)
CREATE OR REPLACE FUNCTION public.is_channel_global(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_global FROM public.chat_channels WHERE id = p_channel_id),
    false
  );
$$;

-- Function 2: Kiểm tra user có là member của kênh không (bypass chat_members RLS)
CREATE OR REPLACE FUNCTION public.is_member_of_channel(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid()
  );
$$;

-- Tạo policy mới dùng 2 function trên (không tham chiếu trực tiếp sang bảng khác)
CREATE POLICY "chat_members: read all" ON public.chat_members
  FOR SELECT USING (
    public.is_channel_global(chat_members.channel_id)
    OR
    public.is_member_of_channel(chat_members.channel_id)
  );

-- ── 2. Add Anti-spam (Rate Limit) cho community_messages ────────────

CREATE OR REPLACE FUNCTION public.check_message_spam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_count INT;
BEGIN
  -- Đếm số tin nhắn user gửi trong 1 phút qua
  SELECT count(*) INTO msg_count 
  FROM public.community_messages
  WHERE user_id = auth.uid() 
    AND created_at > (now() - interval '1 minute');
  
  -- Nếu gửi quá 30 tin nhắn / phút thì chặn
  IF msg_count >= 30 THEN
    RAISE EXCEPTION 'Bạn gửi tin nhắn quá nhanh. Vui lòng chờ một lát!';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Xóa trigger nếu đã tồn tại để tránh lỗi duplicate
DROP TRIGGER IF EXISTS on_message_spam_check ON public.community_messages;

-- Tạo trigger kiểm tra trước khi insert tin nhắn mới
CREATE TRIGGER on_message_spam_check
  BEFORE INSERT ON public.community_messages
  FOR EACH ROW EXECUTE PROCEDURE public.check_message_spam();
