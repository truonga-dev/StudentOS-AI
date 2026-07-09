-- ============================================================
-- KIỂM TRA: Xem tình trạng Private Chat hiện tại
-- Chạy câu này trong SQL Editor để kiểm tra
-- ============================================================

SELECT 
  cc.id as channel_id,
  cc.name as channel_name,
  cc.description,
  cc.creator_id,
  array_agg(
    json_build_object(
      'user_id', cm.user_id,
      'role', cm.role,
      'name', p.full_name
    )
  ) as members
FROM public.chat_channels cc
LEFT JOIN public.chat_members cm ON cm.channel_id = cc.id
LEFT JOIN public.profiles p ON p.id = cm.user_id
WHERE cc.description = 'Private Chat'
GROUP BY cc.id, cc.name, cc.description, cc.creator_id
ORDER BY cc.created_at DESC;
