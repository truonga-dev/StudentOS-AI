-- ============================================================
-- Student OS AI — Migration v2
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- ── 1. Mở rộng bảng hiện có ──────────────────────────────────

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS color      text    NOT NULL DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS credits    integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS semester   text    NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS due_date    timestamptz,
  ADD COLUMN IF NOT EXISTS priority    text NOT NULL DEFAULT 'medium'
                                       CHECK (priority IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS completed   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();

-- Thêm user_id vào notes nếu chưa có
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── 2. Tạo bảng mới ──────────────────────────────────────────

-- Files (metadata; file thực lưu ở Supabase Storage)
CREATE TABLE IF NOT EXISTS files (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id   uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  name         text        NOT NULL,
  file_url     text        NOT NULL,
  storage_path text        NOT NULL,
  size_bytes   bigint,
  mime_type    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Study Sessions (Pomodoro log)
CREATE TABLE IF NOT EXISTS study_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id       uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  duration_minutes integer     NOT NULL DEFAULT 25,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  notes            text
);

-- Calendar Events (lịch học tuần lặp)
CREATE TABLE IF NOT EXISTS calendar_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  room        text,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz NOT NULL,
  recurrence  text        NOT NULL DEFAULT 'once'
                          CHECK (recurrence IN ('once','weekly','daily')),
  color       text        NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- AI Summaries (lưu kết quả Gemini)
CREATE TABLE IF NOT EXISTS ai_summaries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id    uuid        REFERENCES notes(id) ON DELETE CASCADE,
  summary    text        NOT NULL,
  model      text        NOT NULL DEFAULT 'gemini-2.0-flash',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Row Level Security ─────────────────────────────────────

ALTER TABLE subjects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE files            ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries     ENABLE ROW LEVEL SECURITY;

-- subjects
CREATE POLICY "subjects: own rows" ON subjects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tasks
CREATE POLICY "tasks: own rows" ON tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notes
CREATE POLICY "notes: own rows" ON notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- files
CREATE POLICY "files: own rows" ON files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- study_sessions
CREATE POLICY "sessions: own rows" ON study_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- calendar_events
CREATE POLICY "events: own rows" ON calendar_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_summaries
CREATE POLICY "summaries: own rows" ON ai_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 4. Storage Bucket Policies ────────────────────────────────────
-- QUAN TRỌNG: Tạo bucket “student-files” (private) trong Dashboard trước,
-- sau đó chạy 3 policy này:

-- Xóa các policy cũ nếu tồn tại (tránh lỗi duplicate)
DROP POLICY IF EXISTS "storage: upload own files" ON storage.objects;
DROP POLICY IF EXISTS "storage: view own files"   ON storage.objects;
DROP POLICY IF EXISTS "storage: delete own files" ON storage.objects;

CREATE POLICY "storage: upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: view own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
