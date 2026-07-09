-- ============================================================
-- Student OS AI — Migration v10 (Phase 4: Gamification, Community, Spaced Repetition)
-- ============================================================

-- ── 1. Nâng cấp Bảng Flashcards (Thuật toán SM-2) ────────────

ALTER TABLE flashcards 
  ADD COLUMN IF NOT EXISTS interval integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetition integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ease_factor real DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS next_review_date timestamptz DEFAULT now();


-- ── 2. Nâng cấp Profile Users (Gamification & Rank) ─────────────

-- Tạo bảng profiles (nếu chưa có) để lưu thông tin mở rộng của auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Bổ sung các cột Gamification
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rank_tier text DEFAULT 'Bronze';

-- Hàm tự động tạo profile khi có user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger để gọi hàm khi insert vào auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Kích hoạt RLS cho bảng profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: view own" ON profiles;
CREATE POLICY "profiles: view own" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: update own" ON profiles;
CREATE POLICY "profiles: update own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- (Tùy chọn) Chèn profile cho các user đã tồn tại
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ── 3. Bảng Cộng đồng (Global Chat) ──────────────────────────

-- Lưu các phòng chat (Ví dụ: "Phòng Tự Học", "Hỏi Đáp IT", "Global")
CREATE TABLE IF NOT EXISTS chat_channels (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  is_global   boolean     DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Tạo kênh Global mặc định
INSERT INTO chat_channels (name, description, is_global)
VALUES ('Global Chat', 'Nơi giao lưu của tất cả mọi người', true)
ON CONFLICT DO NOTHING;

-- Lưu tin nhắn trong các phòng chat cộng đồng
CREATE TABLE IF NOT EXISTS community_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid        NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Kích hoạt Realtime cho bảng community_messages
-- Chú ý: Cần bật Realtime trên Supabase Dashboard cho bảng này.

-- ── 4. Row Level Security (RLS) ──────────────────────────────

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- Kênh chat hiển thị cho tất cả mọi người
DROP POLICY IF EXISTS "chat_channels: read all" ON chat_channels;
CREATE POLICY "chat_channels: read all" ON chat_channels
  FOR SELECT USING (true);

-- Tin nhắn hiển thị cho tất cả mọi người, nhưng chỉ được gửi bởi chính user đó
DROP POLICY IF EXISTS "community_messages: read all" ON community_messages;
CREATE POLICY "community_messages: read all" ON community_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_messages: insert own" ON community_messages;
CREATE POLICY "community_messages: insert own" ON community_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
