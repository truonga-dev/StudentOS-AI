-- ============================================================
-- Student OS AI — Migration v12 (Social Network Features)
-- ============================================================

-- ── 1. Nâng cấp bảng profiles ────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS cover_url text;


-- ── 2. Thêm bảng friendships ────────────

CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Đảm bảo không có dòng trùng lặp (ví dụ 1 gửi cho 2, và 2 gửi cho 1 tạo ra 2 record khác biệt, ta có thể để ứng dụng xử lý hoặc enforce qua check constraint/unique index)
  CONSTRAINT friendships_users_check CHECK (user_id_1 != user_id_2)
);

-- Index để truy vấn nhanh bạn bè của một user
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_1 ON friendships(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_2 ON friendships(user_id_2);


-- ── 3. Row Level Security (RLS) cho friendships ────────────

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể xem danh sách bạn bè của người khác (nếu cần bảo mật thì có thể giới hạn)
DROP POLICY IF EXISTS "friendships: read all" ON friendships;
CREATE POLICY "friendships: read all" ON friendships
  FOR SELECT USING (true);

-- User có thể tự gửi lời mời kết bạn (user_id_1 là chính họ)
DROP POLICY IF EXISTS "friendships: insert own" ON friendships;
CREATE POLICY "friendships: insert own" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id_1);

-- Chỉ user_id_1 hoặc user_id_2 mới được cập nhật trạng thái (nhận/hủy lời mời)
DROP POLICY IF EXISTS "friendships: update own" ON friendships;
CREATE POLICY "friendships: update own" ON friendships
  FOR UPDATE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Chỉ user_id_1 hoặc user_id_2 mới được xóa (hủy kết bạn)
DROP POLICY IF EXISTS "friendships: delete own" ON friendships;
CREATE POLICY "friendships: delete own" ON friendships
  FOR DELETE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);


-- ── 4. Cho phép insert channel (Tạo cộng đồng) ────────────
-- Hiện tại bảng chat_channels có thể chưa có policy cho insert của member

DROP POLICY IF EXISTS "chat_channels: insert own" ON chat_channels;
CREATE POLICY "chat_channels: insert own" ON chat_channels
  FOR INSERT WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);
