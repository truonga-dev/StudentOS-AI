-- ============================================================
-- Student OS AI — Migration v11 (Advanced Community Chat)
-- ============================================================

-- ── 1. Nâng cấp bảng chat_channels ────────────

ALTER TABLE chat_channels
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- ── 2. Thêm bảng chat_members ────────────

CREATE TABLE IF NOT EXISTS chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Khi tạo channel, insert người tạo làm owner
CREATE OR REPLACE FUNCTION public.handle_channel_created()
RETURNS trigger AS $$
BEGIN
  IF new.creator_id IS NOT NULL THEN
    INSERT INTO public.chat_members (channel_id, user_id, role)
    VALUES (new.id, new.creator_id, 'owner');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_channel_created ON chat_channels;
CREATE TRIGGER on_chat_channel_created
  AFTER INSERT ON chat_channels
  FOR EACH ROW EXECUTE PROCEDURE public.handle_channel_created();

-- ── 3. Sửa lỗi Foreign Key và Nâng cấp community_messages ────────────

-- Xóa foreign key cũ trỏ đến auth.users (nếu có)
ALTER TABLE community_messages DROP CONSTRAINT IF EXISTS community_messages_user_id_fkey;

-- Thêm foreign key mới trỏ đến profiles(id)
ALTER TABLE community_messages ADD CONSTRAINT community_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Thêm các cột cho tin nhắn nâng cao
ALTER TABLE community_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb, -- [{ type: 'image' | 'voice' | 'file', url: string }]
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES community_messages(id) ON DELETE SET NULL;

-- ── 4. RLS cho chat_members ────────────

ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_members: read all" ON chat_members;
CREATE POLICY "chat_members: read all" ON chat_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "chat_members: insert own" ON chat_members;
CREATE POLICY "chat_members: insert own" ON chat_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_members: owner and admin can delete" ON chat_members;
CREATE POLICY "chat_members: owner and admin can delete" ON chat_members
  FOR DELETE USING (
    auth.uid() = user_id OR -- Tự rời khỏi nhóm
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.channel_id = chat_members.channel_id 
      AND cm.user_id = auth.uid() 
      AND cm.role IN ('owner', 'admin')
    )
  );

-- Chủ phòng hoặc admin có quyền sửa kênh
DROP POLICY IF EXISTS "chat_channels: admin update" ON chat_channels;
CREATE POLICY "chat_channels: admin update" ON chat_channels
  FOR UPDATE USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.channel_id = id 
      AND cm.user_id = auth.uid() 
      AND cm.role IN ('owner', 'admin')
    )
  );

-- Chủ phòng hoặc admin có quyền ghim tin nhắn
DROP POLICY IF EXISTS "community_messages: admin update" ON community_messages;
CREATE POLICY "community_messages: admin update" ON community_messages
  FOR UPDATE USING (
    user_id = auth.uid() OR -- Tự sửa tin nhắn của mình
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.channel_id = channel_id 
      AND cm.user_id = auth.uid() 
      AND cm.role IN ('owner', 'admin')
    )
  );
