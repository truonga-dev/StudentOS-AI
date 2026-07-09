-- ============================================================
-- Student OS AI — Migration v24 (Thêm hình ảnh cho Flashcards)
-- ============================================================

ALTER TABLE flashcards 
  ADD COLUMN IF NOT EXISTS image_url text;
