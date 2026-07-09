-- ============================================================
-- Student OS AI — Migration v8: Notifications
-- Chạy trong Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  message      text        NOT NULL,
  type         text        NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read      boolean     NOT NULL DEFAULT false,
  link         text,       -- Đường dẫn tùy chọn để click vào thông báo
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: own rows" ON notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable Realtime cho bảng notifications
-- (Điều này yêu cầu bạn phải bật Replication cho bảng notifications trong Supabase Dashboard)
alter publication supabase_realtime add table notifications;

-- ============================================================
-- Tạo Trigger tự động thông báo khi có Điểm mới
-- ============================================================
CREATE OR REPLACE FUNCTION notify_new_grade()
RETURNS TRIGGER AS $$
DECLARE
  subject_name text;
BEGIN
  -- Lấy tên môn học
  SELECT title INTO subject_name FROM subjects WHERE id = NEW.subject_id;
  
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id, 
    'Điểm số mới', 
    'Bạn vừa có cột điểm mới "' || NEW.title || '" (' || NEW.score || ') cho môn ' || subject_name, 
    'success',
    '/analytics'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_grade ON grades;
CREATE TRIGGER trigger_new_grade
AFTER INSERT ON grades
FOR EACH ROW EXECUTE FUNCTION notify_new_grade();
