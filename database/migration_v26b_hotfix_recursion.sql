-- ============================================================
-- Student OS AI — HOTFIX v26b (Fix Infinite Recursion)
-- Vấn đề: 
--   chat_channels policy → query chat_members
--   chat_members policy  → query chat_channels (gây vòng lặp)
-- Giải pháp: 
--   Bọc cả 2 sub-query trong SECURITY DEFINER function
--   để chúng chạy với quyền superuser, bypass hoàn toàn RLS
-- ============================================================

-- ── BƯỚC 1: Tạo helper function bypass RLS cho chat_channels ──

-- Function kiểm tra kênh có public không (bypass chat_channels RLS)
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

-- Function kiểm tra user có là member của kênh không (bypass chat_members RLS)
-- (Đã tạo ở v26 nhưng ghi lại để đảm bảo đã tồn tại)
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

-- ── BƯỚC 2: Sửa lại policy chat_members để không query trực tiếp chat_channels ──

DROP POLICY IF EXISTS "chat_members: read all" ON public.chat_members;

CREATE POLICY "chat_members: read all" ON public.chat_members
  FOR SELECT USING (
    -- Dùng function thay vì EXISTS trực tiếp để tránh vòng lặp đệ quy
    public.is_channel_global(chat_members.channel_id)
    OR
    public.is_member_of_channel(chat_members.channel_id)
  );

-- ── BƯỚC 3: Kiểm tra kết quả ──
-- Sau khi chạy, thử query sau để xác nhận không còn lỗi:
-- SELECT * FROM chat_channels LIMIT 5;
-- SELECT * FROM chat_members LIMIT 5;
