-- ============================================================
-- Student OS AI — Migration v17: Friend Request Notifications
-- Chạy trong Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
  sender_name text;
BEGIN
  -- Khi vừa gửi lời mời kết bạn
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.user_id_1;
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id_2, 'Lời mời kết bạn', sender_name || ' đã gửi cho bạn một lời mời kết bạn.', 'info', '/community?friend_request=' || NEW.user_id_1);
  END IF;

  -- Khi chấp nhận kết bạn
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.user_id_2;
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id_1, 'Kết bạn thành công', sender_name || ' đã chấp nhận lời mời kết bạn của bạn.', 'success', '/community?friend_request=' || NEW.user_id_2);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_friend_request ON friendships;
CREATE TRIGGER trigger_friend_request
AFTER INSERT OR UPDATE ON friendships
FOR EACH ROW EXECUTE FUNCTION notify_friend_request();
