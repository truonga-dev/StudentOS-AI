-- ============================================================
-- Student OS AI — Migration v4 (Note Icon & Cover Image)
-- ============================================================

-- Thêm trường icon (emoji)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS icon text;

-- Thêm trường cover_image (gradient string hoặc url)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS cover_image text;
