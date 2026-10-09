-- Initial taxonomy categories
INSERT INTO categories (id, name, slug, description, created_at) VALUES
('cat-1', 'Computer Science', 'computer-science', 'Software engineering, algorithms, and systems', NOW()),
('cat-2', 'Data Science', 'data-science', 'Data analysis, statistics, and machine learning', NOW()),
('cat-3', 'Business & Management', 'business-management', 'Leadership, project management, and strategy', NOW())
ON CONFLICT (id) DO NOTHING;
