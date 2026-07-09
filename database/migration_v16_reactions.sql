-- ============================================================
-- Student OS AI — Migration v16 (Message Reactions)
-- ============================================================

-- Bổ sung cột reactions vào bảng community_messages để lưu danh sách emoji và mảng user_id
-- Ví dụ: {"❤️": ["user-id-1", "user-id-2"], "😂": ["user-id-3"]}
ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Tạo Function (RPC) để toggle (bật/tắt) reaction an toàn (tránh race-conditions)
CREATE OR REPLACE FUNCTION toggle_message_reaction(msg_id uuid, emoji_char text)
RETURNS void AS $$
DECLARE
  reacting_user_id uuid := auth.uid();
  current_reactions jsonb;
  user_list jsonb;
  new_user_list jsonb;
BEGIN
  -- Lấy reactions hiện tại
  SELECT reactions INTO current_reactions 
  FROM community_messages 
  WHERE id = msg_id;
  
  IF current_reactions IS NULL THEN 
    current_reactions := '{}'::jsonb; 
  END IF;
  
  -- Lấy danh sách user_id đã thả emoji này
  user_list := current_reactions->emoji_char;
  IF user_list IS NULL THEN 
    user_list := '[]'::jsonb; 
  END IF;
  
  -- Nếu user_id đã có trong danh sách -> Xóa ra (Toggle Off)
  IF user_list @> to_jsonb(reacting_user_id) THEN
    -- Cách xóa 1 phần tử trong mảng jsonb
    new_user_list := COALESCE(
      (SELECT jsonb_agg(elem) 
       FROM jsonb_array_elements(user_list) elem 
       WHERE elem != to_jsonb(reacting_user_id)
      ), 
      '[]'::jsonb
    );
  ELSE
    -- Chưa có -> Thêm vào (Toggle On)
    new_user_list := user_list || to_jsonb(reacting_user_id);
  END IF;
  
  -- Nếu không còn ai thả emoji này nữa thì xóa key emoji đó luôn cho sạch, nếu không thì lưu lại mảng mới
  IF jsonb_array_length(new_user_list) = 0 THEN
    current_reactions := current_reactions - emoji_char;
  ELSE
    current_reactions := jsonb_set(current_reactions, ARRAY[emoji_char], new_user_list);
  END IF;
  
  -- Cập nhật vào bảng
  UPDATE community_messages 
  SET reactions = current_reactions 
  WHERE id = msg_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
