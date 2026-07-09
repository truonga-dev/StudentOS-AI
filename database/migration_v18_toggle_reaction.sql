-- ── Hàm RPC để toggle reaction của tin nhắn ────────────

-- Thêm cột reactions vào bảng tin nhắn (nếu chưa có)
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION toggle_message_reaction(msg_id UUID, emoji_char TEXT)
RETURNS void
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    current_reactions JSONB;
    user_list JSONB;
    new_user_list JSONB;
    has_reacted BOOLEAN;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lấy reactions hiện tại
    SELECT reactions INTO current_reactions 
    FROM public.community_messages 
    WHERE id = msg_id;

    IF current_reactions IS NULL THEN
        current_reactions := '{}'::jsonb;
    END IF;

    -- Lấy danh sách user đã react emoji này
    user_list := current_reactions->emoji_char;
    IF user_list IS NULL THEN
        user_list := '[]'::jsonb;
    END IF;

    -- Kiểm tra xem user đã react chưa
    has_reacted := current_user_id::text IN (SELECT jsonb_array_elements_text(user_list));

    IF has_reacted THEN
        -- Xóa user khỏi list
        new_user_list := (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements(user_list) AS elem
            WHERE elem#>>'{}' != current_user_id::text
        );
    ELSE
        -- Thêm user vào list
        new_user_list := user_list || to_jsonb(current_user_id::text);
    END IF;

    -- Nếu list rỗng, xóa key khỏi reactions, ngược lại update
    IF jsonb_array_length(new_user_list) = 0 THEN
        current_reactions := current_reactions - emoji_char;
    ELSE
        current_reactions := jsonb_set(current_reactions, ARRAY[emoji_char], new_user_list);
    END IF;

    -- Update lại message
    UPDATE public.community_messages 
    SET reactions = current_reactions
    WHERE id = msg_id;

END;
$$ LANGUAGE plpgsql;
