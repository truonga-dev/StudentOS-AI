-- ============================================================
-- Student OS AI — Migration v15 (Public Profiles)
-- ============================================================

-- Bật tính năng cho phép đọc Profile của người khác
-- Trong một ứng dụng cộng đồng, mọi người cần có thể xem profile của nhau (để lấy tên, avatar, bio...)

-- Xóa các policy đọc cũ nếu có
DROP POLICY IF EXISTS "profiles: read own" ON profiles;
DROP POLICY IF EXISTS "profiles: view own" ON profiles;
DROP POLICY IF EXISTS "profiles: read all" ON profiles;

-- Tạo policy mới: Cho phép mọi người (đã đăng nhập) đọc thông tin profile của tất cả mọi người
CREATE POLICY "profiles: read all" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
