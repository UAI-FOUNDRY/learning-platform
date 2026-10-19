-- Course categories and subcategories (safe to run more than once).
-- Run after `alembic upgrade head`.
INSERT INTO categories (id, name, slug, description, parent_id, created_at) VALUES
('cat-1', 'Computer Science', 'computer-science', 'Software engineering, algorithms, and systems', NULL, NOW()),
('cat-2', 'Data Science', 'data-science', 'Data analysis, statistics, and machine learning', NULL, NOW()),
('cat-3', 'Business & Management', 'business-management', 'Leadership, project management, and strategy', NULL, NOW()),
('cat-1-1', 'Programming Languages', 'programming-languages', 'Python, Java, C++, JavaScript and more', 'cat-1', NOW()),
('cat-1-2', 'Web Development', 'web-development', 'Frontend, backend and full-stack development', 'cat-1', NOW()),
('cat-1-3', 'Databases & SQL', 'databases-sql', 'Relational databases, SQL and data modelling', 'cat-1', NOW()),
('cat-2-1', 'Machine Learning', 'machine-learning', 'Supervised, unsupervised and deep learning', 'cat-2', NOW()),
('cat-2-2', 'Data Analysis', 'data-analysis', 'Pandas, visualization and statistics', 'cat-2', NOW())
ON CONFLICT (id) DO NOTHING;
