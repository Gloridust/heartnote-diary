-- 声命体Memoirai应用数据库结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    create_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建日记表
CREATE TABLE IF NOT EXISTS diaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    score INTEGER CHECK (score >= 1 AND score <= 10),
    tag VARCHAR(100),
    location JSONB,           -- 位置信息 {latitude, longitude, formatted_address, city, district, street}
    weather JSONB,            -- 天气信息 {temperature, description, icon, humidity, wind_speed, feels_like}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_diaries_user_id ON diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_diaries_date ON diaries(date);
CREATE INDEX IF NOT EXISTS idx_diaries_user_date ON diaries(user_id, date DESC);

-- 启用行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
-- 用户可以查看和修改自己的数据
CREATE POLICY "Users can view own data" ON users FOR ALL USING (true);
CREATE POLICY "Users can view own diaries" ON diaries FOR ALL USING (true);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diaries_updated_at 
    BEFORE UPDATE ON diaries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入示例数据（可选）
-- INSERT INTO users (id, create_time) VALUES (459014, NOW());
-- INSERT INTO diaries (user_id, title, content, date, score, tag) VALUES 
-- (459014, '工作日记', '今天在参与黑客松adventure x项目，项目进展整体比较顺利...', '2025-07-24 23:49:23', 7, 'work'); 