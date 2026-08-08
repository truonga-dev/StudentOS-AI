-- ==============================================================================
-- Cập nhật indexes cho bảng profiles phục vụ truy vấn Leaderboard
-- ==============================================================================

-- 1. Index cho Leaderboard Toàn cầu (XP)
CREATE INDEX IF NOT EXISTS idx_profiles_xp_desc 
ON public.profiles (xp DESC NULLS LAST);

-- 2. Index cho Leaderboard Chuỗi ngày học (Streak)
CREATE INDEX IF NOT EXISTS idx_profiles_current_streak_desc 
ON public.profiles (current_streak DESC NULLS LAST);

-- 3. Index cho Leaderboard Điểm (Points)
CREATE INDEX IF NOT EXISTS idx_profiles_points_desc 
ON public.profiles (points DESC NULLS LAST);

-- Lưu ý: Nếu database lớn, các truy vấn leaderboard nên cache kết quả bằng materialized view
-- Tuy nhiên với quy mô nhỏ/vừa, dùng index trên bảng profiles là đủ đáp ứng và real-time hơn.
