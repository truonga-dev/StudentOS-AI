-- ============================================================
-- Student OS AI — Migration v9 (AI Chat Attachments)
-- ============================================================

-- Thêm cột attachments để lưu trữ hình ảnh hoặc file đính kèm dưới dạng JSONB
ALTER TABLE ai_chat_messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
