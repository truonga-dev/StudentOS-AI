-- ============================================================
-- Student OS AI — HOTFIX v26c (Optimize chat_channels RLS)
-- Vấn đề: 
--   chat_channels policy query trực tiếp chat_members, 
--   dễ bị ảnh hưởng bởi chính sách RLS của chat_members hoặc lỗi quyền.
-- Giải pháp: 
--   Chuyển sang dùng function SECURITY DEFINER is_member_of_channel
--   để bypass hoàn toàn RLS khi kiểm tra quyền truy cập kênh.
-- ============================================================

DROP POLICY IF EXISTS "chat_channels: read public or member" ON public.chat_channels;

CREATE POLICY "chat_channels: read public or member" ON public.chat_channels
  FOR SELECT USING (
    is_global = true
    OR
    public.is_member_of_channel(chat_channels.id)
  );

-- Hướng dẫn: Chạy script này trên Supabase SQL Editor và reload lại trang.
