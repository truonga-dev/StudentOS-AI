-- Migration: Extend profiles table for Advanced Settings page
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio                  TEXT,
  ADD COLUMN IF NOT EXISTS github_url           TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url         TEXT,
  ADD COLUMN IF NOT EXISTS school               TEXT,
  ADD COLUMN IF NOT EXISTS major                TEXT,
  ADD COLUMN IF NOT EXISTS study_year           SMALLINT,
  ADD COLUMN IF NOT EXISTS target_gpa           NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS pref_pomodoro_work   SMALLINT DEFAULT 25,
  ADD COLUMN IF NOT EXISTS pref_pomodoro_break  SMALLINT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pref_daily_goal_hours NUMERIC(4, 1) DEFAULT 2,
  ADD COLUMN IF NOT EXISTS pref_weekly_goal_days SMALLINT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pref_accent_color    TEXT DEFAULT '#6B4EFF';

-- Confirm columns added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
