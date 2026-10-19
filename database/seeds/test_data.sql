-- DEVELOPMENT DATA ONLY. Never run this on the production / shared Supabase database.
-- Run after `alembic upgrade head` and seeds/categories.sql.
-- Accounts below all use the password: Password123
-- (Create the Super Admin with: python -m scripts.create_super_admin --email you@example.com)

INSERT INTO users (id, email, hashed_password, full_name, role, status, is_email_verified, headline) VALUES
('dev-instructor', 'instructor@dev.local', '$2b$12$ZTMMdT77qA4HofnfG4gU0O8NPZJ.h8mL/MNNPaB7NKwVnMxY.5kD2', 'Dev Instructor', 'instructor', 'active', true, 'Professor, Computer Science'),
('dev-learner', 'learner@dev.local', '$2b$12$ZTMMdT77qA4HofnfG4gU0O8NPZJ.h8mL/MNNPaB7NKwVnMxY.5kD2', 'Dev Learner', 'learner', 'active', true, NULL),
('dev-learner-2', 'learner2@dev.local', '$2b$12$ZTMMdT77qA4HofnfG4gU0O8NPZJ.h8mL/MNNPaB7NKwVnMxY.5kD2', 'Second Learner', 'learner', 'active', true, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, slug, org_type, domain, status) VALUES
('dev-org', 'Demo University', 'demo-university', 'university', 'demo.edu', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (id, organization_id, user_id, member_role, designation) VALUES
('dev-om-1', 'dev-org', 'dev-instructor', 'instructor', 'Professor'),
('dev-om-2', 'dev-org', 'dev-learner', 'learner', 'B.Tech student')
ON CONFLICT (id) DO NOTHING;

-- A published course: 2 sections, 3 lectures, 1 quiz, 1 assignment, 1 coding exercise
INSERT INTO courses (id, title, subtitle, description, instructor_id, category_id, organization_id, status,
                     level, language, learning_objectives, prerequisites, submitted_at, reviewed_at, published_at) VALUES
('dev-course-python', 'Python for Beginners', 'Write your first programs',
 'A hands-on introduction to Python with coding practice in every section.',
 'dev-instructor', 'cat-1-1', 'dev-org', 'published', 'beginner', 'en',
 '["Write and run Python programs", "Use variables, loops and functions"]', '["Basic computer skills"]',
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('dev-course-draft', 'SQL Fundamentals (draft)', NULL, 'Work in progress.', 'dev-instructor', 'cat-1-3', NULL, 'draft',
 'beginner', 'en', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_approval_logs (id, course_id, actor_id, action, from_status, to_status, comment, created_at) VALUES
('dev-log-1', 'dev-course-python', 'dev-instructor', 'submitted', 'draft', 'pending_review', NULL, NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sections (id, course_id, title, description, order_index) VALUES
('dev-sec-1', 'dev-course-python', 'Getting Started', 'Install Python and run code', 0),
('dev-sec-2', 'dev-course-python', 'Control Flow', 'Conditions and loops', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lectures (id, section_id, title, lecture_type, content_url, article_content, duration, is_preview, order_index) VALUES
('dev-lec-1', 'dev-sec-1', 'Welcome', 'video', 'https://example.com/videos/welcome.mp4', NULL, 180, true, 0),
('dev-lec-2', 'dev-sec-1', 'Your first program', 'article', NULL, 'print("Hello, world!") prints text to the screen.', 300, false, 1),
('dev-lec-3', 'dev-sec-2', 'Loops', 'video', 'https://example.com/videos/loops.mp4', NULL, 600, false, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quizzes (id, section_id, title, quiz_type, passing_score, time_limit_minutes, max_attempts) VALUES
('dev-quiz-1', 'dev-sec-2', 'Loops check', 'quiz', 60, 10, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, quiz_id, question_type, prompt, options, correct_option, explanation, order_index) VALUES
('dev-q-1', 'dev-quiz-1', 'single_choice', 'How many times does range(3) loop?', '["2", "3", "4"]', '3', 'range(3) yields 0, 1 and 2.', 0),
('dev-q-2', 'dev-quiz-1', 'true_false', 'A while loop always runs at least once.', '["True", "False"]', 'False', 'The condition is checked first.', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO assignments (id, section_id, title, instructions, deadline, max_score) VALUES
('dev-assign-1', 'dev-sec-2', 'FizzBuzz write-up', 'Explain your FizzBuzz solution in a short document.', NOW() + INTERVAL '14 days', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO topics (id, name, slug) VALUES
('dev-topic-loops', 'Loops', 'python-loops'),
('dev-topic-basics', 'Python basics', 'python-basics')
ON CONFLICT (id) DO NOTHING;
INSERT INTO question_topics (question_id, topic_id) VALUES ('dev-q-1', 'dev-topic-loops'), ('dev-q-2', 'dev-topic-loops')
ON CONFLICT DO NOTHING;
INSERT INTO course_topics (course_id, topic_id) VALUES ('dev-course-python', 'dev-topic-basics'), ('dev-course-python', 'dev-topic-loops')
ON CONFLICT DO NOTHING;

INSERT INTO coding_exercises (id, course_id, lecture_id, created_by, title, problem_statement, language, starter_code,
                              sample_input, sample_output, difficulty, hints, status) VALUES
('dev-ex-1', 'dev-course-python', 'dev-lec-3', 'dev-instructor', 'Sum to N',
 'Read an integer n and print the sum 1 + 2 + ... + n.', 'python', 'n = int(input())\n# your code here\n',
 '5', '15', 'easy', '["Use a for loop with range()", "range(1, n + 1) includes n"]', 'published')
ON CONFLICT (id) DO NOTHING;
INSERT INTO coding_exercise_topics (exercise_id, topic_id) VALUES ('dev-ex-1', 'dev-topic-loops') ON CONFLICT DO NOTHING;
INSERT INTO coding_test_cases (id, exercise_id, input, expected_output, is_hidden, order_index) VALUES
('dev-tc-1', 'dev-ex-1', '5', '15', false, 0),
('dev-tc-2', 'dev-ex-1', '1', '1', true, 1),
('dev-tc-3', 'dev-ex-1', '100', '5050', true, 2)
ON CONFLICT (id) DO NOTHING;

-- The first learner is enrolled and half-way through.
INSERT INTO enrollments (id, user_id, course_id, status, last_lecture_id, last_accessed_at) VALUES
('dev-enr-1', 'dev-learner', 'dev-course-python', 'ACTIVE', 'dev-lec-2', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
INSERT INTO progress (id, enrollment_id, lecture_id, is_completed, completed_at, last_position_seconds) VALUES
('dev-prog-1', 'dev-enr-1', 'dev-lec-1', true, NOW() - INTERVAL '1 day', 180)
ON CONFLICT (id) DO NOTHING;
INSERT INTO wishlist_items (id, user_id, course_id) VALUES ('dev-wish-1', 'dev-learner-2', 'dev-course-python')
ON CONFLICT (id) DO NOTHING;
