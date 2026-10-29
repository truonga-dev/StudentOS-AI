-- ============================================================
-- Student OS AI — Migration v28 (System Admin & Moderation)
-- ============================================================

-- 1. Thêm role và is_banned vào bảng profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 2. Hàm kiểm tra xem user hiện tại có phải là system admin không
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR lower(email) = 'truonga01.dev@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2b. Tự động gán role = 'admin' nếu email đăng ký là truonga01.dev@gmail.com
CREATE OR REPLACE FUNCTION public.auto_assign_admin_email()
RETURNS trigger AS $$
BEGIN
  IF lower(NEW.email) = 'truonga01.dev@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_assign_admin_email ON profiles;
CREATE TRIGGER trg_auto_assign_admin_email
  BEFORE INSERT OR UPDATE OF email ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin_email();

-- 3. Cập nhật RLS cho bảng profiles (cho phép admin update mọi profile)
DROP POLICY IF EXISTS "profiles: admin update all" ON profiles;
CREATE POLICY "profiles: admin update all" ON profiles
  FOR UPDATE USING (public.is_system_admin());

DROP POLICY IF EXISTS "profiles: admin delete all" ON profiles;
CREATE POLICY "profiles: admin delete all" ON profiles
  FOR DELETE USING (public.is_system_admin());

-- 4. Cập nhật RLS cho bảng reports (cho phép admin đọc, sửa, xóa báo cáo)
DROP POLICY IF EXISTS "reports: read" ON reports;
CREATE POLICY "reports: read" ON reports
  FOR SELECT USING (public.is_system_admin() OR auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports: admin update" ON reports;
CREATE POLICY "reports: admin update" ON reports
  FOR UPDATE USING (public.is_system_admin());

DROP POLICY IF EXISTS "reports: admin delete" ON reports;
CREATE POLICY "reports: admin delete" ON reports
  FOR DELETE USING (public.is_system_admin());

-- 5. Cập nhật RLS cho chat_channels & community_messages (cho phép admin quản lý toàn bộ)
DROP POLICY IF EXISTS "chat_channels: system admin all" ON chat_channels;
CREATE POLICY "chat_channels: system admin all" ON chat_channels
  FOR ALL USING (public.is_system_admin());

DROP POLICY IF EXISTS "community_messages: system admin all" ON community_messages;
CREATE POLICY "community_messages: system admin all" ON community_messages
  FOR ALL USING (public.is_system_admin());

-- 6. Cập nhật RLS cho notifications (cho phép admin gửi thông báo cho tất cả user)
DROP POLICY IF EXISTS "notifications: admin insert all" ON notifications;
CREATE POLICY "notifications: admin insert all" ON notifications
  FOR INSERT WITH CHECK (public.is_system_admin() OR auth.uid() = user_id);

-- 7. Gán quyền Admin cho email truonga01.dev@gmail.com
UPDATE profiles
SET role = 'admin'
WHERE lower(email) = 'truonga01.dev@gmail.com';
