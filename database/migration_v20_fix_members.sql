-- ============================================================
-- Student OS AI — Migration v20 (Fix chat_members RLS for Private Chat)
-- ============================================================

-- Xóa policy cũ
DROP POLICY IF EXISTS "chat_members: insert own" ON public.chat_members;

-- Tạo policy mới: Cho phép tự join VÀ cho phép Chủ phòng (creator) / Admin thêm người khác
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

-- Đảm bảo chỉ nhìn thấy kênh Global hoặc kênh Private mà mình có tham gia
DROP POLICY IF EXISTS "chat_channels: read all" ON public.chat_channels;
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
