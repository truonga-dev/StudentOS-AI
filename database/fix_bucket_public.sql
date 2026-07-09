-- Chạy đoạn lệnh này trong SQL Editor của Supabase
-- Lệnh này sẽ chuyển đổi bucket 'student-files' thành chế độ Public (công khai)
-- để ảnh đại diện có thể hiển thị ra màn hình

UPDATE storage.buckets
SET public = true
WHERE id = 'student-files';
