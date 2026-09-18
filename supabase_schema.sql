-- =========================================================================
-- AETHERA Cinematic Wedding - Supabase PostgreSQL Schema
-- =========================================================================

-- 1. Create Inquiries Table (상담 및 제휴 문의 내역)
CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    details TEXT,
    message TEXT,
    status TEXT DEFAULT '대기중',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast sorting by date
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);

-- 2. Create Analytics Table (방문자 통계)
CREATE TABLE IF NOT EXISTS analytics (
    id INT PRIMARY KEY DEFAULT 1,
    page_views BIGINT DEFAULT 120,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial analytics row if not exists
INSERT INTO analytics (id, page_views)
VALUES (1, 120)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Public RLS Policies (PostgreSQL Row Level Security)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts & select for inquiries
CREATE POLICY "Allow public insert on inquiries" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select on inquiries" ON inquiries FOR SELECT USING (true);
CREATE POLICY "Allow public update on inquiries" ON inquiries FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on inquiries" ON inquiries FOR DELETE USING (true);

-- Allow public read & update on analytics
CREATE POLICY "Allow public select on analytics" ON analytics FOR SELECT USING (true);
CREATE POLICY "Allow public update on analytics" ON analytics FOR UPDATE USING (true);
