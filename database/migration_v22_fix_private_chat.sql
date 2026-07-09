-- ============================================================
-- BƯỚC 1: Xem tất cả phòng Private Chat đang tồn tại
-- ============================================================
SELECT 
  cc.id as channel_id,
  cc.name,
  cc.creator_id,
  cc.created_at,
  json_agg(
    json_build_object('user_id', cm.user_id, 'name', p.full_name, 'role', cm.role)
    ORDER BY cm.role
  ) as members,
  count(cm.user_id) as member_count
FROM public.chat_channels cc
LEFT JOIN public.chat_members cm ON cm.channel_id = cc.id
LEFT JOIN public.profiles p ON p.id = cm.user_id
WHERE cc.description = 'Private Chat'
GROUP BY cc.id, cc.name, cc.creator_id, cc.created_at
ORDER BY cc.created_at DESC;

-- ============================================================
-- BƯỚC 2 (sau khi xem kết quả): Xóa sạch TẤT CẢ phòng Private Chat bị thiếu thành viên hoặc cũ
-- Bỏ comment dòng dưới khi đã sẵn sàng xóa:
-- ============================================================
-- DELETE FROM public.chat_channels WHERE description = 'Private Chat';

-- ============================================================
-- BƯỚC 3: Sửa hàm RPC — thêm logic tự động add thành viên còn thiếu vào phòng cũ
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

  -- Bypass RLS để tìm kiếm không bị giới hạn
  SET LOCAL row_security = off;

  -- Tìm phòng Private Chat có CẢ 2 người đều là thành viên
  SELECT cm1.channel_id INTO found_channel_id
  FROM public.chat_members cm1
  JOIN public.chat_members cm2 ON cm1.channel_id = cm2.channel_id
  JOIN public.chat_channels cc ON cc.id = cm1.channel_id
  WHERE cm1.user_id = current_user_id
    AND cm2.user_id = other_user_id
    AND cc.description = 'Private Chat'
  LIMIT 1;

  -- Đã có phòng với đủ 2 người → trả về ngay
  IF found_channel_id IS NOT NULL THEN
    RETURN found_channel_id;
  END IF;

  -- Kiểm tra: có phòng nào mà chỉ 1 trong 2 người là thành viên không?
  -- (trường hợp phòng cũ bị lỗi thiếu thành viên)
  SELECT cc.id INTO found_channel_id
  FROM public.chat_channels cc
  JOIN public.chat_members cm ON cm.channel_id = cc.id
  WHERE cc.description = 'Private Chat'
    AND cm.user_id IN (current_user_id, other_user_id)
    AND cc.id NOT IN (
      -- loại các phòng đã có cả 2 người
      SELECT cm1.channel_id FROM public.chat_members cm1
      JOIN public.chat_members cm2 ON cm1.channel_id = cm2.channel_id
      WHERE cm1.user_id = current_user_id AND cm2.user_id = other_user_id
    )
  LIMIT 1;

  -- Nếu tìm thấy phòng bị thiếu người: thêm người còn thiếu vào
  IF found_channel_id IS NOT NULL THEN
    -- Thêm current_user nếu chưa có
    INSERT INTO public.chat_members (channel_id, user_id, role)
    VALUES (found_channel_id, current_user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;
    
    -- Thêm other_user nếu chưa có  
    INSERT INTO public.chat_members (channel_id, user_id, role)
    VALUES (found_channel_id, other_user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;
    
    RETURN found_channel_id;
  END IF;

  -- Không có phòng nào → tạo mới hoàn toàn
  SELECT COALESCE(full_name, 'Người dùng') INTO other_name
  FROM public.profiles
  WHERE id = other_user_id;

  INSERT INTO public.chat_channels (name, description, is_global, creator_id)
  VALUES ('Chat với ' || COALESCE(other_name, 'Người dùng'), 'Private Chat', false, current_user_id)
  RETURNING id INTO new_channel_id;

  INSERT INTO public.chat_members (channel_id, user_id, role)
  VALUES 
    (new_channel_id, current_user_id, 'owner'),
    (new_channel_id, other_user_id, 'member')
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  -- Kích hoạt Realtime cho chat_members (nếu chưa có)
  RETURN new_channel_id;
END;
$$;
