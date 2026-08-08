-- Migration: add has_completed_onboarding to profiles
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing users as having completed onboarding
-- (so only truly new signups see the tour)
UPDATE public.profiles
SET has_completed_onboarding = true
WHERE created_at < NOW() - INTERVAL '1 minute';

-- Confirm
SELECT id, email, has_completed_onboarding FROM public.profiles LIMIT 10;
