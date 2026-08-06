-- Thêm category và sort_order vào bảng chat_channels để phân loại kênh chat
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Phòng Chung';
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
