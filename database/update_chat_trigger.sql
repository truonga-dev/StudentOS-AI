-- ============================================================
-- Cập nhật thời gian cho đoạn chat khi có tin nhắn mới
-- ============================================================

CREATE OR REPLACE FUNCTION update_ai_chats_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_chats
    SET updated_at = now()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_chat_messages_insert ON ai_chat_messages;
CREATE TRIGGER trg_ai_chat_messages_insert
AFTER INSERT ON ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_ai_chats_on_message();
