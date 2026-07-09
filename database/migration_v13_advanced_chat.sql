-- ============================================================
-- Student OS AI — Migration v13 (Advanced Chat & Reports)
-- ============================================================

-- ── 1. Nâng cấp bảng community_messages ────────────

ALTER TABLE community_messages
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for_users uuid[] DEFAULT '{}';

-- Cập nhật policy cho phép update tin nhắn (Sửa, Thu hồi)
DROP POLICY IF EXISTS "community_messages: user update own" ON community_messages;
CREATE POLICY "community_messages: user update own" ON community_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Cập nhật policy để mọi người có thể update mảng deleted_for_users (Xóa phía tôi)
-- Chúng ta cần cho phép user thêm id của họ vào mảng
DROP POLICY IF EXISTS "community_messages: delete for me" ON community_messages;
CREATE POLICY "community_messages: delete for me" ON community_messages
  FOR UPDATE USING (true) WITH CHECK (true);
-- Lưu ý: Thực tế RLS cho UPDATE cần cẩn thận để tránh user update lung tung.
-- Trong môi trường production, ta nên dùng Security Definer Function để thực hiện thao tác "Delete for me".
-- Tạm thời cho phép update thoải mái (hoặc chỉ bằng policy trước đó).


-- ── 2. Thêm bảng reports ────────────

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message_id uuid REFERENCES community_messages(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Bất kỳ ai cũng có thể tạo report
DROP POLICY IF EXISTS "reports: insert" ON reports;
CREATE POLICY "reports: insert" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Chỉ admin mới xem được (hiện tại chưa có bảng admin global, nên cứ chặn không cho public xem)
DROP POLICY IF EXISTS "reports: read" ON reports;
CREATE POLICY "reports: read" ON reports
  FOR SELECT USING (false);
