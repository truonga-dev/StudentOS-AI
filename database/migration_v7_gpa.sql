-- ============================================================
-- Student OS AI — Migration v7: GPA Tracker
-- Chạy trong Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS grades (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id   uuid        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title        text        NOT NULL, -- Ví dụ: "Điểm giữa kỳ", "Bài tập lớn"
  score        numeric     NOT NULL CHECK (score >= 0 AND score <= 10), -- Điểm hệ 10
  weight       numeric     NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1), -- Trọng số (ví dụ: 0.3 là 30%)
  date         timestamptz DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grades: own rows" ON grades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
