-- ============================================================
-- Student OS AI — Migration v14 (Enable Realtime for Chat)
-- ============================================================

-- Kích hoạt Realtime (WebSockets) cho bảng community_messages để nhận tin nhắn ngay lập tức
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;
  END IF;
END $$;

-- Kích hoạt Realtime cho chat_channels để tự cập nhật nhóm mới
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
  END IF;
END $$;
