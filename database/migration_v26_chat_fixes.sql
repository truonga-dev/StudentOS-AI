-- ============================================================
-- Student OS AI — Migration v26 (Chat Fixes)
-- 1. Fix Privacy Leak on chat_members
-- 2. Add Anti-spam Rate Limiting for community_messages
-- ============================================================

-- ── 1. Fix Privacy Leak trên chat_members ────────────

-- Xóa policy cũ
DROP POLICY IF EXISTS "chat_members: read all" ON public.chat_members;

-- Tạo policy mới an toàn hơn
CREATE POLICY "chat_members: read all" ON public.chat_members
  FOR SELECT USING (
    -- Chỉ cho phép nếu kênh là kênh Public (is_global = true)
    EXISTS (
      SELECT 1 FROM public.chat_channels cc 
      WHERE cc.id = chat_members.channel_id AND cc.is_global = true
    )
    OR
    -- Hoặc người dùng là thành viên của kênh đó
    EXISTS (
      SELECT 1 FROM public.chat_members cm 
      WHERE cm.channel_id = chat_members.channel_id AND cm.user_id = auth.uid()
    )
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
