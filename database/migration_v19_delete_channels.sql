-- ============================================================
-- Student OS AI — Migration v19 (Fix Chat Channel Deletion RLS)
-- ============================================================

-- Cho phép Chủ phòng (creator) hoặc admin/owner xóa kênh chat
DROP POLICY IF EXISTS "chat_channels: admin delete" ON public.chat_channels;
CREATE POLICY "chat_channels: admin delete" ON public.chat_channels
  FOR DELETE USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.chat_members cm 
      WHERE cm.channel_id = id 
      AND cm.user_id = auth.uid() 
      AND cm.role IN ('owner', 'admin')
    )
  );

-- Bổ sung: Cho phép bất kỳ thành viên nào cũng có thể xóa Private Chat (kênh chat riêng 2 người)
-- Vì trong Private Chat đôi khi người kia cũng muốn xóa toàn bộ đoạn hội thoại.
DROP POLICY IF EXISTS "chat_channels: member delete private" ON public.chat_channels;
CREATE POLICY "chat_channels: member delete private" ON public.chat_channels
  FOR DELETE USING (
    description = 'Private Chat' AND 
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.channel_id = id
      AND cm.user_id = auth.uid()
    )
  );
