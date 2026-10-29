-- ============================================================
-- Student OS AI — Migration v29 (Standalone Admin Panel)
-- Nhật ký hoạt động admin, cài đặt hệ thống, lịch sử broadcast
-- ============================================================

-- 1. Nhật ký thao tác của Admin (Audit Logs)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email  text,
  action       text        NOT NULL,          -- vd: 'user.ban', 'channel.delete'
  target_type  text,                          -- 'user' | 'report' | 'channel' | 'message' | 'content' | 'settings' | 'broadcast'
  target_id    text,
  details      jsonb       DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit: admin read" ON admin_audit_logs;
CREATE POLICY "audit: admin read" ON admin_audit_logs
  FOR SELECT USING (public.is_system_admin());
DROP POLICY IF EXISTS "audit: admin insert" ON admin_audit_logs;
CREATE POLICY "audit: admin insert" ON admin_audit_logs
  FOR INSERT WITH CHECK (public.is_system_admin());

-- 2. Cài đặt hệ thống (key/value)
CREATE TABLE IF NOT EXISTS system_settings (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL,
  updated_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings: public read" ON system_settings;
CREATE POLICY "settings: public read" ON system_settings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings: admin write" ON system_settings;
CREATE POLICY "settings: admin write" ON system_settings
  FOR ALL USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());

INSERT INTO system_settings (key, value) VALUES
  ('maintenance_mode',      'false'::jsonb),
  ('registration_enabled',  'true'::jsonb),
  ('community_enabled',     'true'::jsonb),
  ('ai_enabled',            'true'::jsonb),
  ('announcement_banner',   '""'::jsonb),
  ('ai_daily_limit',        '50'::jsonb),
  ('max_upload_mb',         '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Lịch sử thông báo hệ thống (Broadcast history)
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  message     text        NOT NULL,
  type        text        NOT NULL DEFAULT 'info',
  link        text,
  target      text        NOT NULL DEFAULT 'all',  -- 'all' | 'admins' | 'users'
  sent_count  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "broadcasts: admin all" ON admin_broadcasts;
CREATE POLICY "broadcasts: admin all" ON admin_broadcasts
  FOR ALL USING (public.is_system_admin()) WITH CHECK (public.is_system_admin());
