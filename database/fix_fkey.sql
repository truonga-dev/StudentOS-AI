-- ============================================================
-- Sửa lỗi Foreign Key constraint
-- Chạy script này trong Supabase SQL Editor
-- ============================================================

-- Bảng subjects
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_user_id_fkey;
ALTER TABLE subjects ADD CONSTRAINT subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Bảng tasks
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Bảng notes (để chắc chắn)
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
