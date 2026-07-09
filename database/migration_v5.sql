-- ============================================================
-- Student OS AI — Migration v5 (Fix Profiles & Avatars RLS)
-- ============================================================

-- Bật RLS cho profiles (nếu chưa bật)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cho phép user đọc profile của chính mình
DROP POLICY IF EXISTS "profiles: read own" ON profiles;
CREATE POLICY "profiles: read own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Cho phép user cập nhật profile của chính mình
DROP POLICY IF EXISTS "profiles: update own" ON profiles;
CREATE POLICY "profiles: update own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Cho phép insert (dùng khi trigger tạo mới)
DROP POLICY IF EXISTS "profiles: insert own" ON profiles;
CREATE POLICY "profiles: insert own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Cập nhật policy storage cho avatar 
-- Thay vì giới hạn thư mục gốc, cho phép upload vào bất kỳ đâu trong bucket student-files
-- nếu user đã đăng nhập. RLS Storage sẽ dựa vào thư mục gốc = user_id.

DROP POLICY IF EXISTS "storage: upload own files" ON storage.objects;
CREATE POLICY "storage: upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "storage: update own files" ON storage.objects;
CREATE POLICY "storage: update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'student-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
