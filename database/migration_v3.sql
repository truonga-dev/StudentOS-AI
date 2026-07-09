-- ============================================================
-- Student OS AI — Migration v3 (AI Chat & Flashcards)
-- ============================================================

-- ── 1. Bảng AI Chat ──────────────────────────────────────────

-- Lưu thông tin phiên chat
CREATE TABLE IF NOT EXISTS ai_chats (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lưu chi tiết tin nhắn trong một phiên chat
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    uuid        NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Bảng Flashcards ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcards (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id   uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  question     text        NOT NULL,
  answer       text        NOT NULL,
  is_memorized boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_reviewed timestamptz
);

-- ── 3. Row Level Security ────────────────────────────────────

ALTER TABLE ai_chats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards        ENABLE ROW LEVEL SECURITY;

-- ai_chats
CREATE POLICY "ai_chats: own rows" ON ai_chats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_chat_messages
CREATE POLICY "ai_chat_messages: own rows" ON ai_chat_messages
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM ai_chats WHERE id = chat_id)
  ) WITH CHECK (
    auth.uid() = (SELECT user_id FROM ai_chats WHERE id = chat_id)
  );

-- flashcards
CREATE POLICY "flashcards: own rows" ON flashcards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 4. Kích hoạt cập nhật updated_at cho ai_chats ────────────
CREATE OR REPLACE FUNCTION update_ai_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_chats_updated_at ON ai_chats;
CREATE TRIGGER trg_ai_chats_updated_at
BEFORE UPDATE ON ai_chats
FOR EACH ROW
EXECUTE FUNCTION update_ai_chats_updated_at();
