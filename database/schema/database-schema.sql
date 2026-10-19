-- =============================================================================
-- Learning Platform: full PostgreSQL schema (REFERENCE ONLY, GENERATED)
--
-- Do NOT run this file to set up a database. The schema is owned by Alembic:
--     cd backend && alembic upgrade head
-- This file is regenerated from a database migrated to the latest revision so
-- the team can read the whole schema in one place:
--     pg_dump --schema-only --no-owner --no-privileges --exclude-table=alembic_version
-- Alembic revision: 0004
-- =============================================================================

--
-- PostgreSQL database dump
--

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    assistant_type character varying(16) DEFAULT 'learning'::character varying NOT NULL,
    context_type character varying(32) DEFAULT 'none'::character varying NOT NULL,
    context_id character varying(64),
    title character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT ck_ai_conversations_assistant_type CHECK (((assistant_type)::text = ANY ((ARRAY['learning'::character varying, 'coding'::character varying, 'instructor'::character varying])::text[]))),
    CONSTRAINT ck_ai_conversations_context_type CHECK (((context_type)::text = ANY ((ARRAY['none'::character varying, 'course'::character varying, 'lecture'::character varying, 'coding_exercise'::character varying, 'coding_submission'::character varying, 'quiz'::character varying])::text[])))
);

--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id character varying(64) NOT NULL,
    conversation_id character varying(64) NOT NULL,
    role character varying(16) NOT NULL,
    content text NOT NULL,
    model character varying(64),
    input_tokens integer,
    output_tokens integer,
    created_at timestamp with time zone,
    CONSTRAINT ck_ai_messages_role CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying])::text[])))
);

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id character varying(64) NOT NULL,
    course_id character varying(64),
    author_id character varying(64),
    audience character varying(16) DEFAULT 'course'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT ck_announcements_audience CHECK (((audience)::text = ANY ((ARRAY['all'::character varying, 'learners'::character varying, 'instructors'::character varying, 'course'::character varying])::text[])))
);

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id character varying(64) NOT NULL,
    section_id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    instructions text,
    deadline timestamp with time zone,
    created_at timestamp with time zone,
    max_score integer,
    allow_resubmission boolean DEFAULT true NOT NULL
);

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id character varying(64) NOT NULL,
    actor_id character varying(64),
    action character varying(64) NOT NULL,
    entity_type character varying(64),
    entity_id character varying(64),
    changes jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone
);

--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_tokens (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    purpose character varying(32) NOT NULL,
    token_hash character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_ip character varying(45),
    created_at timestamp with time zone,
    CONSTRAINT ck_auth_tokens_purpose CHECK (((purpose)::text = ANY ((ARRAY['email_verification'::character varying, 'password_reset'::character varying, 'refresh'::character varying])::text[])))
);

--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    id character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    icon_url text,
    category character varying(16) DEFAULT 'milestone'::character varying NOT NULL,
    criteria jsonb,
    points integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT ck_badges_category CHECK (((category)::text = ANY ((ARRAY['learning'::character varying, 'coding'::character varying, 'quiz'::character varying, 'community'::character varying, 'milestone'::character varying, 'skill'::character varying])::text[])))
);

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    slug character varying(128) NOT NULL,
    description text,
    created_at timestamp with time zone,
    parent_id character varying(64)
);

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id character varying(64) NOT NULL,
    enrollment_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    verification_code character varying(128) NOT NULL,
    issued_at timestamp with time zone,
    learner_name character varying(255),
    course_title character varying(255),
    status character varying(16) DEFAULT 'issued'::character varying NOT NULL,
    pdf_url text,
    revoked_at timestamp with time zone,
    revoked_reason text,
    CONSTRAINT ck_certificates_status CHECK (((status)::text = ANY ((ARRAY['issued'::character varying, 'revoked'::character varying])::text[])))
);

--
-- Name: coding_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_drafts (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    exercise_id character varying(64) NOT NULL,
    language character varying(16) NOT NULL,
    source_code text NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT ck_coding_drafts_language CHECK (((language)::text = ANY ((ARRAY['python'::character varying, 'c'::character varying, 'cpp'::character varying, 'javascript'::character varying, 'java'::character varying, 'sql'::character varying])::text[])))
);

--
-- Name: coding_exercise_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_exercise_topics (
    exercise_id character varying(64) NOT NULL,
    topic_id character varying(64) NOT NULL
);

--
-- Name: coding_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_exercises (
    id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    lecture_id character varying(64),
    created_by character varying(64),
    title character varying(255) NOT NULL,
    problem_statement text NOT NULL,
    language character varying(16) DEFAULT 'python'::character varying NOT NULL,
    starter_code text,
    solution_code text,
    sample_input text,
    sample_output text,
    difficulty character varying(16) DEFAULT 'easy'::character varying NOT NULL,
    hints jsonb,
    explanation text,
    time_limit_ms integer DEFAULT 2000 NOT NULL,
    memory_limit_mb integer DEFAULT 256 NOT NULL,
    max_score integer DEFAULT 100 NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    status character varying(16) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT ck_coding_exercises_difficulty CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT ck_coding_exercises_language CHECK (((language)::text = ANY ((ARRAY['python'::character varying, 'c'::character varying, 'cpp'::character varying, 'javascript'::character varying, 'java'::character varying, 'sql'::character varying])::text[]))),
    CONSTRAINT ck_coding_exercises_limits CHECK (((time_limit_ms > 0) AND (memory_limit_mb > 0))),
    CONSTRAINT ck_coding_exercises_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);

--
-- Name: coding_submission_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_submission_results (
    id character varying(64) NOT NULL,
    submission_id character varying(64) NOT NULL,
    test_case_id character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    actual_output text,
    execution_time_ms integer,
    memory_kb integer,
    error_message text,
    CONSTRAINT ck_coding_submission_results_status CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'accepted'::character varying, 'wrong_answer'::character varying, 'runtime_error'::character varying, 'compile_error'::character varying, 'time_limit_exceeded'::character varying, 'memory_limit_exceeded'::character varying, 'internal_error'::character varying])::text[])))
);

--
-- Name: coding_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_submissions (
    id character varying(64) NOT NULL,
    exercise_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    kind character varying(8) DEFAULT 'submit'::character varying NOT NULL,
    language character varying(16) NOT NULL,
    source_code text NOT NULL,
    custom_input text,
    status character varying(32) DEFAULT 'queued'::character varying NOT NULL,
    score integer,
    passed_count integer,
    failed_count integer,
    total_count integer,
    execution_time_ms integer,
    memory_kb integer,
    stdout text,
    stderr text,
    created_at timestamp with time zone,
    evaluated_at timestamp with time zone,
    CONSTRAINT ck_coding_submissions_kind CHECK (((kind)::text = ANY ((ARRAY['run'::character varying, 'submit'::character varying])::text[]))),
    CONSTRAINT ck_coding_submissions_language CHECK (((language)::text = ANY ((ARRAY['python'::character varying, 'c'::character varying, 'cpp'::character varying, 'javascript'::character varying, 'java'::character varying, 'sql'::character varying])::text[]))),
    CONSTRAINT ck_coding_submissions_status CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'accepted'::character varying, 'wrong_answer'::character varying, 'runtime_error'::character varying, 'compile_error'::character varying, 'time_limit_exceeded'::character varying, 'memory_limit_exceeded'::character varying, 'internal_error'::character varying])::text[])))
);

--
-- Name: coding_test_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_test_cases (
    id character varying(64) NOT NULL,
    exercise_id character varying(64) NOT NULL,
    input text DEFAULT ''::text NOT NULL,
    expected_output text NOT NULL,
    is_hidden boolean DEFAULT true NOT NULL,
    weight integer DEFAULT 1 NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone
);

--
-- Name: content_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_reports (
    id character varying(64) NOT NULL,
    reporter_id character varying(64),
    target_type character varying(32) NOT NULL,
    target_id character varying(64) NOT NULL,
    reason character varying(64) NOT NULL,
    details text,
    status character varying(16) DEFAULT 'open'::character varying NOT NULL,
    resolved_by character varying(64),
    resolution_note text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone,
    CONSTRAINT ck_content_reports_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'reviewing'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[]))),
    CONSTRAINT ck_content_reports_target_type CHECK (((target_type)::text = ANY ((ARRAY['course'::character varying, 'review'::character varying, 'qa_question'::character varying, 'qa_answer'::character varying, 'user'::character varying])::text[])))
);

--
-- Name: course_approval_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_approval_logs (
    id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    actor_id character varying(64),
    action character varying(32) NOT NULL,
    from_status character varying(32),
    to_status character varying(32) NOT NULL,
    comment text,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_course_approval_logs_action CHECK (((action)::text = ANY ((ARRAY['submitted'::character varying, 'approved'::character varying, 'changes_requested'::character varying, 'rejected'::character varying, 'unpublished'::character varying, 'archived'::character varying])::text[])))
);

--
-- Name: course_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_topics (
    course_id character varying(64) NOT NULL,
    topic_id character varying(64) NOT NULL
);

--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    subtitle character varying(255),
    description text,
    instructor_id character varying(64),
    category_id character varying(64),
    status character varying(32) NOT NULL,
    reviewer_id character varying(64),
    review_feedback text,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    organization_id character varying(64),
    thumbnail_url text,
    level character varying(32),
    language character varying(32),
    learning_objectives jsonb,
    prerequisites jsonb,
    published_at timestamp with time zone
);

--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    enrolled_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_lecture_id character varying(64),
    last_accessed_at timestamp with time zone
);

--
-- Name: learning_activity_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_activity_daily (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    activity_date date NOT NULL,
    minutes_learned integer DEFAULT 0 NOT NULL,
    lectures_completed integer DEFAULT 0 NOT NULL,
    quizzes_taken integer DEFAULT 0 NOT NULL,
    coding_submissions integer DEFAULT 0 NOT NULL,
    exercises_solved integer DEFAULT 0 NOT NULL,
    points_earned integer DEFAULT 0 NOT NULL
);

--
-- Name: learning_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_goals (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    goal_type character varying(32) DEFAULT 'custom'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    target_value integer,
    course_id character varying(64),
    topic_id character varying(64),
    target_date date,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT ck_learning_goals_goal_type CHECK (((goal_type)::text = ANY ((ARRAY['weekly_minutes'::character varying, 'complete_course'::character varying, 'master_topic'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT ck_learning_goals_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'abandoned'::character varying])::text[])))
);

--
-- Name: learning_path_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_path_courses (
    id character varying(64) NOT NULL,
    path_id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    order_index integer DEFAULT 0 NOT NULL
);

--
-- Name: learning_path_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_path_enrollments (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    path_id character varying(64) NOT NULL,
    enrolled_at timestamp with time zone,
    completed_at timestamp with time zone
);

--
-- Name: learning_paths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_paths (
    id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(128) NOT NULL,
    description text,
    level character varying(32),
    created_by character varying(64),
    status character varying(16) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT ck_learning_paths_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);

--
-- Name: lecture_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lecture_bookmarks (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    lecture_id character varying(64) NOT NULL,
    timestamp_seconds integer DEFAULT 0 NOT NULL,
    label character varying(255),
    created_at timestamp with time zone
);

--
-- Name: lecture_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lecture_notes (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    lecture_id character varying(64) NOT NULL,
    content text NOT NULL,
    timestamp_seconds integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

--
-- Name: lecture_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lecture_resources (
    id character varying(64) NOT NULL,
    lecture_id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    resource_type character varying(16) DEFAULT 'file'::character varying NOT NULL,
    url text NOT NULL,
    file_size_bytes bigint,
    created_at timestamp with time zone,
    CONSTRAINT ck_lecture_resources_resource_type CHECK (((resource_type)::text = ANY ((ARRAY['file'::character varying, 'link'::character varying])::text[])))
);

--
-- Name: lecture_subtitles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lecture_subtitles (
    id character varying(64) NOT NULL,
    lecture_id character varying(64) NOT NULL,
    language_code character varying(16) NOT NULL,
    label character varying(64),
    url text NOT NULL,
    created_at timestamp with time zone
);

--
-- Name: lectures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lectures (
    id character varying(64) NOT NULL,
    section_id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    content_url text,
    duration integer NOT NULL,
    order_index integer NOT NULL,
    created_at timestamp with time zone,
    lecture_type character varying(16) DEFAULT 'video'::character varying NOT NULL,
    article_content text,
    is_preview boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_lectures_lecture_type CHECK (((lecture_type)::text = ANY ((ARRAY['video'::character varying, 'article'::character varying, 'pdf'::character varying, 'document'::character varying, 'link'::character varying])::text[])))
);

--
-- Name: login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_history (
    id character varying(64) NOT NULL,
    user_id character varying(64),
    email character varying(255) NOT NULL,
    success boolean DEFAULT false NOT NULL,
    failure_reason character varying(64),
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone
);

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    notification_type character varying(64) NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    type character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    link_url text,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    email_sent_at timestamp with time zone,
    created_at timestamp with time zone
);

--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id character varying(64) NOT NULL,
    organization_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    designation character varying(128),
    created_at timestamp with time zone,
    member_role character varying(32) DEFAULT 'member'::character varying NOT NULL,
    CONSTRAINT ck_organization_members_member_role CHECK (((member_role)::text = ANY ((ARRAY['admin'::character varying, 'instructor'::character varying, 'learner'::character varying, 'member'::character varying])::text[])))
);

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    slug character varying(128),
    org_type character varying(32) DEFAULT 'other'::character varying NOT NULL,
    description text,
    logo_url text,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT ck_organizations_org_type CHECK (((org_type)::text = ANY ((ARRAY['university'::character varying, 'college'::character varying, 'school'::character varying, 'training_institute'::character varying, 'company'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT ck_organizations_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);

--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    key character varying(128) NOT NULL,
    value jsonb,
    category character varying(32) DEFAULT 'general'::character varying NOT NULL,
    description text,
    is_public boolean DEFAULT false NOT NULL,
    updated_by character varying(64),
    updated_at timestamp with time zone,
    CONSTRAINT ck_platform_settings_category CHECK (((category)::text = ANY ((ARRAY['general'::character varying, 'users'::character varying, 'courses'::character varying, 'certificates'::character varying, 'notifications'::character varying, 'security'::character varying, 'content'::character varying])::text[])))
);

--
-- Name: point_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_transactions (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    points integer NOT NULL,
    reason character varying(64) NOT NULL,
    source_type character varying(32),
    source_id character varying(64),
    created_at timestamp with time zone
);

--
-- Name: progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.progress (
    id character varying(64) NOT NULL,
    enrollment_id character varying(64) NOT NULL,
    lecture_id character varying(64) NOT NULL,
    is_completed boolean NOT NULL,
    updated_at timestamp with time zone,
    last_position_seconds integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone
);

--
-- Name: qa_answer_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_answer_votes (
    id character varying(64) NOT NULL,
    answer_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    created_at timestamp with time zone
);

--
-- Name: qa_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_answers (
    id character varying(64) NOT NULL,
    question_id character varying(64) NOT NULL,
    parent_answer_id character varying(64),
    user_id character varying(64),
    body text NOT NULL,
    is_instructor_answer boolean DEFAULT false NOT NULL,
    is_highlighted boolean DEFAULT false NOT NULL,
    status character varying(16) DEFAULT 'visible'::character varying NOT NULL,
    upvote_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT ck_qa_answers_status CHECK (((status)::text = ANY ((ARRAY['visible'::character varying, 'hidden'::character varying, 'removed'::character varying])::text[])))
);

--
-- Name: qa_question_follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_question_follows (
    id character varying(64) NOT NULL,
    question_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    created_at timestamp with time zone
);

--
-- Name: qa_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_questions (
    id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    lecture_id character varying(64),
    user_id character varying(64),
    title character varying(255) NOT NULL,
    body text NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    status character varying(16) DEFAULT 'visible'::character varying NOT NULL,
    answer_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT ck_qa_questions_status CHECK (((status)::text = ANY ((ARRAY['visible'::character varying, 'hidden'::character varying, 'removed'::character varying])::text[])))
);

--
-- Name: question_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_topics (
    question_id character varying(64) NOT NULL,
    topic_id character varying(64) NOT NULL
);

--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id character varying(64) NOT NULL,
    quiz_id character varying(64) NOT NULL,
    prompt text NOT NULL,
    options jsonb NOT NULL,
    correct_option character varying(255) NOT NULL,
    created_at timestamp with time zone,
    question_type character varying(24) DEFAULT 'single_choice'::character varying NOT NULL,
    correct_options jsonb,
    explanation text,
    points integer DEFAULT 1 NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    CONSTRAINT ck_questions_question_type CHECK (((question_type)::text = ANY ((ARRAY['single_choice'::character varying, 'multiple_select'::character varying, 'true_false'::character varying])::text[])))
);

--
-- Name: quiz_attempt_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempt_answers (
    id character varying(64) NOT NULL,
    attempt_id character varying(64) NOT NULL,
    question_id character varying(64) NOT NULL,
    selected_options jsonb,
    is_correct boolean DEFAULT false NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL
);

--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id character varying(64) NOT NULL,
    quiz_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    score integer NOT NULL,
    passed boolean NOT NULL,
    attempted_at timestamp with time zone,
    status character varying(16) DEFAULT 'submitted'::character varying NOT NULL,
    attempt_number integer,
    started_at timestamp with time zone,
    correct_count integer,
    total_questions integer,
    time_taken_seconds integer,
    CONSTRAINT ck_quiz_attempts_status CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying])::text[])))
);

--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id character varying(64) NOT NULL,
    section_id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    passing_score integer NOT NULL,
    created_at timestamp with time zone,
    description text,
    quiz_type character varying(16) DEFAULT 'quiz'::character varying NOT NULL,
    time_limit_minutes integer,
    max_attempts integer,
    shuffle_questions boolean DEFAULT false NOT NULL,
    show_explanations boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_quizzes_passing_score CHECK (((passing_score >= 0) AND (passing_score <= 100))),
    CONSTRAINT ck_quizzes_quiz_type CHECK (((quiz_type)::text = ANY ((ARRAY['quiz'::character varying, 'practice_test'::character varying])::text[])))
);

--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendations (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    item_type character varying(32) NOT NULL,
    item_id character varying(64) NOT NULL,
    reason character varying(255),
    score double precision,
    source character varying(16) DEFAULT 'rules'::character varying NOT NULL,
    created_at timestamp with time zone,
    clicked_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    CONSTRAINT ck_recommendations_item_type CHECK (((item_type)::text = ANY ((ARRAY['course'::character varying, 'lecture'::character varying, 'quiz'::character varying, 'coding_exercise'::character varying, 'learning_path'::character varying, 'topic'::character varying])::text[]))),
    CONSTRAINT ck_recommendations_source CHECK (((source)::text = ANY ((ARRAY['rules'::character varying, 'ai'::character varying, 'admin'::character varying])::text[])))
);

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone,
    status character varying(16) DEFAULT 'visible'::character varying NOT NULL,
    moderated_by character varying(64),
    moderated_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT check_review_rating_range CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT ck_reviews_status CHECK (((status)::text = ANY ((ARRAY['visible'::character varying, 'hidden'::character varying, 'removed'::character varying])::text[])))
);

--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    order_index integer NOT NULL,
    created_at timestamp with time zone,
    description text
);

--
-- Name: submission_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission_files (
    id character varying(64) NOT NULL,
    submission_id character varying(64) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    mime_type character varying(128),
    file_size_bytes bigint,
    uploaded_at timestamp with time zone
);

--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id character varying(64) NOT NULL,
    assignment_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    submission_url text,
    grade character varying(32),
    submitted_at timestamp with time zone,
    submission_text text,
    status character varying(16) DEFAULT 'submitted'::character varying NOT NULL,
    feedback text,
    graded_by character varying(64),
    graded_at timestamp with time zone,
    resubmission_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT ck_submissions_status CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'graded'::character varying, 'returned'::character varying])::text[])))
);

--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topics (
    id character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    slug character varying(128) NOT NULL,
    description text,
    parent_id character varying(64),
    created_at timestamp with time zone
);

--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    badge_id character varying(64) NOT NULL,
    awarded_at timestamp with time zone
);

--
-- Name: user_streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_streaks (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    streak_type character varying(16) NOT NULL,
    current_length integer DEFAULT 0 NOT NULL,
    longest_length integer DEFAULT 0 NOT NULL,
    last_activity_date date,
    updated_at timestamp with time zone,
    CONSTRAINT ck_user_streaks_streak_type CHECK (((streak_type)::text = ANY ((ARRAY['learning'::character varying, 'coding'::character varying])::text[])))
);

--
-- Name: user_topic_mastery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_topic_mastery (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    topic_id character varying(64) NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    correct integer DEFAULT 0 NOT NULL,
    mastery_score double precision DEFAULT '0'::double precision NOT NULL,
    last_practiced_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT ck_user_topic_mastery_score CHECK (((mastery_score >= (0)::double precision) AND (mastery_score <= (100)::double precision)))
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(64) NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(32) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    is_email_verified boolean DEFAULT false NOT NULL,
    headline character varying(255),
    avatar_url text,
    bio text,
    last_login_at timestamp with time zone,
    CONSTRAINT ck_users_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::text[])))
);

--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_items (
    id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    course_id character varying(64) NOT NULL,
    created_at timestamp with time zone
);

--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);

--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);

--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);

--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);

--
-- Name: auth_tokens auth_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash);

--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);

--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);

--
-- Name: coding_drafts coding_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_drafts
    ADD CONSTRAINT coding_drafts_pkey PRIMARY KEY (id);

--
-- Name: coding_exercise_topics coding_exercise_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_exercise_topics
    ADD CONSTRAINT coding_exercise_topics_pkey PRIMARY KEY (exercise_id, topic_id);

--
-- Name: coding_exercises coding_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_exercises
    ADD CONSTRAINT coding_exercises_pkey PRIMARY KEY (id);

--
-- Name: coding_submission_results coding_submission_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submission_results
    ADD CONSTRAINT coding_submission_results_pkey PRIMARY KEY (id);

--
-- Name: coding_submissions coding_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT coding_submissions_pkey PRIMARY KEY (id);

--
-- Name: coding_test_cases coding_test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_test_cases
    ADD CONSTRAINT coding_test_cases_pkey PRIMARY KEY (id);

--
-- Name: content_reports content_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_pkey PRIMARY KEY (id);

--
-- Name: course_approval_logs course_approval_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_approval_logs
    ADD CONSTRAINT course_approval_logs_pkey PRIMARY KEY (id);

--
-- Name: course_topics course_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_topics
    ADD CONSTRAINT course_topics_pkey PRIMARY KEY (course_id, topic_id);

--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);

--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);

--
-- Name: learning_activity_daily learning_activity_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_activity_daily
    ADD CONSTRAINT learning_activity_daily_pkey PRIMARY KEY (id);

--
-- Name: learning_goals learning_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_goals
    ADD CONSTRAINT learning_goals_pkey PRIMARY KEY (id);

--
-- Name: learning_path_courses learning_path_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_courses
    ADD CONSTRAINT learning_path_courses_pkey PRIMARY KEY (id);

--
-- Name: learning_path_enrollments learning_path_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_enrollments
    ADD CONSTRAINT learning_path_enrollments_pkey PRIMARY KEY (id);

--
-- Name: learning_paths learning_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_pkey PRIMARY KEY (id);

--
-- Name: lecture_bookmarks lecture_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_bookmarks
    ADD CONSTRAINT lecture_bookmarks_pkey PRIMARY KEY (id);

--
-- Name: lecture_notes lecture_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_notes
    ADD CONSTRAINT lecture_notes_pkey PRIMARY KEY (id);

--
-- Name: lecture_resources lecture_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_resources
    ADD CONSTRAINT lecture_resources_pkey PRIMARY KEY (id);

--
-- Name: lecture_subtitles lecture_subtitles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_subtitles
    ADD CONSTRAINT lecture_subtitles_pkey PRIMARY KEY (id);

--
-- Name: lectures lectures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectures
    ADD CONSTRAINT lectures_pkey PRIMARY KEY (id);

--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);

--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);

--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);

--
-- Name: point_transactions point_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);

--
-- Name: progress progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_pkey PRIMARY KEY (id);

--
-- Name: qa_answer_votes qa_answer_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answer_votes
    ADD CONSTRAINT qa_answer_votes_pkey PRIMARY KEY (id);

--
-- Name: qa_answers qa_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answers
    ADD CONSTRAINT qa_answers_pkey PRIMARY KEY (id);

--
-- Name: qa_question_follows qa_question_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_question_follows
    ADD CONSTRAINT qa_question_follows_pkey PRIMARY KEY (id);

--
-- Name: qa_questions qa_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_questions
    ADD CONSTRAINT qa_questions_pkey PRIMARY KEY (id);

--
-- Name: question_topics question_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_pkey PRIMARY KEY (question_id, topic_id);

--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);

--
-- Name: quiz_attempt_answers quiz_attempt_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempt_answers
    ADD CONSTRAINT quiz_attempt_answers_pkey PRIMARY KEY (id);

--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);

--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);

--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);

--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);

--
-- Name: submission_files submission_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_files
    ADD CONSTRAINT submission_files_pkey PRIMARY KEY (id);

--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);

--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);

--
-- Name: certificates uq_certificate_user_course; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT uq_certificate_user_course UNIQUE (user_id, course_id);

--
-- Name: coding_drafts uq_coding_draft_user_exercise; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_drafts
    ADD CONSTRAINT uq_coding_draft_user_exercise UNIQUE (user_id, exercise_id);

--
-- Name: coding_submission_results uq_coding_result_submission_case; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submission_results
    ADD CONSTRAINT uq_coding_result_submission_case UNIQUE (submission_id, test_case_id);

--
-- Name: learning_activity_daily uq_learning_activity_user_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_activity_daily
    ADD CONSTRAINT uq_learning_activity_user_date UNIQUE (user_id, activity_date);

--
-- Name: learning_path_courses uq_learning_path_course; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_courses
    ADD CONSTRAINT uq_learning_path_course UNIQUE (path_id, course_id);

--
-- Name: learning_path_enrollments uq_learning_path_enrollment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_enrollments
    ADD CONSTRAINT uq_learning_path_enrollment UNIQUE (user_id, path_id);

--
-- Name: lecture_subtitles uq_lecture_subtitle_language; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_subtitles
    ADD CONSTRAINT uq_lecture_subtitle_language UNIQUE (lecture_id, language_code);

--
-- Name: notification_preferences uq_notification_preference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT uq_notification_preference UNIQUE (user_id, notification_type);

--
-- Name: organization_members uq_organization_member; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT uq_organization_member UNIQUE (organization_id, user_id);

--
-- Name: progress uq_progress_enrollment_lecture; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT uq_progress_enrollment_lecture UNIQUE (enrollment_id, lecture_id);

--
-- Name: qa_answer_votes uq_qa_answer_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answer_votes
    ADD CONSTRAINT uq_qa_answer_vote UNIQUE (answer_id, user_id);

--
-- Name: qa_question_follows uq_qa_question_follow; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_question_follows
    ADD CONSTRAINT uq_qa_question_follow UNIQUE (question_id, user_id);

--
-- Name: quiz_attempt_answers uq_quiz_attempt_answer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempt_answers
    ADD CONSTRAINT uq_quiz_attempt_answer UNIQUE (attempt_id, question_id);

--
-- Name: reviews uq_review_user_course; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_review_user_course UNIQUE (user_id, course_id);

--
-- Name: submissions uq_submission_assignment_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT uq_submission_assignment_user UNIQUE (assignment_id, user_id);

--
-- Name: user_badges uq_user_badge; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id);

--
-- Name: enrollments uq_user_course_enrollment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT uq_user_course_enrollment UNIQUE (user_id, course_id);

--
-- Name: user_streaks uq_user_streak_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_streaks
    ADD CONSTRAINT uq_user_streak_type UNIQUE (user_id, streak_type);

--
-- Name: user_topic_mastery uq_user_topic_mastery; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_topic_mastery
    ADD CONSTRAINT uq_user_topic_mastery UNIQUE (user_id, topic_id);

--
-- Name: wishlist_items uq_wishlist_user_course; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT uq_wishlist_user_course UNIQUE (user_id, course_id);

--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);

--
-- Name: user_streaks user_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_streaks
    ADD CONSTRAINT user_streaks_pkey PRIMARY KEY (id);

--
-- Name: user_topic_mastery user_topic_mastery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_topic_mastery
    ADD CONSTRAINT user_topic_mastery_pkey PRIMARY KEY (id);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);

--
-- Name: ix_ai_conversations_user_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_conversations_user_updated ON public.ai_conversations USING btree (user_id, updated_at);

--
-- Name: ix_ai_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id);

--
-- Name: ix_announcements_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_announcements_author_id ON public.announcements USING btree (author_id);

--
-- Name: ix_announcements_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_announcements_course_id ON public.announcements USING btree (course_id);

--
-- Name: ix_announcements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_announcements_created_at ON public.announcements USING btree (created_at);

--
-- Name: ix_assignments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_id ON public.assignments USING btree (id);

--
-- Name: ix_assignments_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assignments_section_id ON public.assignments USING btree (section_id);

--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);

--
-- Name: ix_audit_logs_actor_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_actor_created ON public.audit_logs USING btree (actor_id, created_at);

--
-- Name: ix_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_created_at ON public.audit_logs USING btree (created_at);

--
-- Name: ix_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);

--
-- Name: ix_auth_tokens_user_purpose; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_auth_tokens_user_purpose ON public.auth_tokens USING btree (user_id, purpose);

--
-- Name: ix_badges_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_badges_code ON public.badges USING btree (code);

--
-- Name: ix_categories_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_categories_id ON public.categories USING btree (id);

--
-- Name: ix_categories_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_categories_parent_id ON public.categories USING btree (parent_id);

--
-- Name: ix_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_categories_slug ON public.categories USING btree (slug);

--
-- Name: ix_certificates_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_certificates_course_id ON public.certificates USING btree (course_id);

--
-- Name: ix_certificates_enrollment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_certificates_enrollment_id ON public.certificates USING btree (enrollment_id);

--
-- Name: ix_certificates_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_certificates_id ON public.certificates USING btree (id);

--
-- Name: ix_certificates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_certificates_user_id ON public.certificates USING btree (user_id);

--
-- Name: ix_certificates_verification_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_certificates_verification_code ON public.certificates USING btree (verification_code);

--
-- Name: ix_coding_drafts_exercise_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_drafts_exercise_id ON public.coding_drafts USING btree (exercise_id);

--
-- Name: ix_coding_drafts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_drafts_user_id ON public.coding_drafts USING btree (user_id);

--
-- Name: ix_coding_exercise_topics_topic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_exercise_topics_topic_id ON public.coding_exercise_topics USING btree (topic_id);

--
-- Name: ix_coding_exercises_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_exercises_course_id ON public.coding_exercises USING btree (course_id);

--
-- Name: ix_coding_exercises_lecture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_exercises_lecture_id ON public.coding_exercises USING btree (lecture_id);

--
-- Name: ix_coding_submission_results_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_submission_results_submission_id ON public.coding_submission_results USING btree (submission_id);

--
-- Name: ix_coding_submission_results_test_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_submission_results_test_case_id ON public.coding_submission_results USING btree (test_case_id);

--
-- Name: ix_coding_submissions_exercise_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_submissions_exercise_id ON public.coding_submissions USING btree (exercise_id);

--
-- Name: ix_coding_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_submissions_status ON public.coding_submissions USING btree (status);

--
-- Name: ix_coding_submissions_user_exercise; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_submissions_user_exercise ON public.coding_submissions USING btree (user_id, exercise_id, created_at);

--
-- Name: ix_coding_test_cases_exercise_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coding_test_cases_exercise_id ON public.coding_test_cases USING btree (exercise_id);

--
-- Name: ix_content_reports_reporter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_content_reports_reporter_id ON public.content_reports USING btree (reporter_id);

--
-- Name: ix_content_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_content_reports_status ON public.content_reports USING btree (status);

--
-- Name: ix_content_reports_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_content_reports_target ON public.content_reports USING btree (target_type, target_id);

--
-- Name: ix_course_approval_logs_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_course_approval_logs_actor_id ON public.course_approval_logs USING btree (actor_id);

--
-- Name: ix_course_approval_logs_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_course_approval_logs_course_id ON public.course_approval_logs USING btree (course_id);

--
-- Name: ix_course_topics_topic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_course_topics_topic_id ON public.course_topics USING btree (topic_id);

--
-- Name: ix_courses_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_category_id ON public.courses USING btree (category_id);

--
-- Name: ix_courses_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_id ON public.courses USING btree (id);

--
-- Name: ix_courses_instructor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_instructor_id ON public.courses USING btree (instructor_id);

--
-- Name: ix_courses_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_organization_id ON public.courses USING btree (organization_id);

--
-- Name: ix_courses_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_reviewer_id ON public.courses USING btree (reviewer_id);

--
-- Name: ix_enrollments_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_enrollments_course_id ON public.enrollments USING btree (course_id);

--
-- Name: ix_enrollments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_enrollments_id ON public.enrollments USING btree (id);

--
-- Name: ix_enrollments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_enrollments_user_id ON public.enrollments USING btree (user_id);

--
-- Name: ix_learning_activity_daily_activity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_learning_activity_daily_activity_date ON public.learning_activity_daily USING btree (activity_date);

--
-- Name: ix_learning_activity_daily_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_learning_activity_daily_user_id ON public.learning_activity_daily USING btree (user_id);

--
-- Name: ix_learning_goals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_learning_goals_user_id ON public.learning_goals USING btree (user_id);

--
-- Name: ix_learning_path_courses_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_learning_path_courses_course_id ON public.learning_path_courses USING btree (course_id);

--
-- Name: ix_learning_path_courses_path_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_learning_path_courses_path_id ON public.learning_path_courses USING btree (path_id);

--
-- Name: ix_learning_path_enrollments_path_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_learning_path_enrollments_path_id ON public.learning_path_enrollments USING btree (path_id);

--
-- Name: ix_learning_path_enrollments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_learning_path_enrollments_user_id ON public.learning_path_enrollments USING btree (user_id);

--
-- Name: ix_learning_paths_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_learning_paths_slug ON public.learning_paths USING btree (slug);

--
-- Name: ix_lecture_bookmarks_lecture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lecture_bookmarks_lecture_id ON public.lecture_bookmarks USING btree (lecture_id);

--
-- Name: ix_lecture_bookmarks_user_lecture; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lecture_bookmarks_user_lecture ON public.lecture_bookmarks USING btree (user_id, lecture_id);

--
-- Name: ix_lecture_notes_lecture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lecture_notes_lecture_id ON public.lecture_notes USING btree (lecture_id);

--
-- Name: ix_lecture_notes_user_lecture; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lecture_notes_user_lecture ON public.lecture_notes USING btree (user_id, lecture_id);

--
-- Name: ix_lecture_resources_lecture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lecture_resources_lecture_id ON public.lecture_resources USING btree (lecture_id);

--
-- Name: ix_lecture_subtitles_lecture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lecture_subtitles_lecture_id ON public.lecture_subtitles USING btree (lecture_id);

--
-- Name: ix_lectures_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lectures_id ON public.lectures USING btree (id);

--
-- Name: ix_lectures_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lectures_section_id ON public.lectures USING btree (section_id);

--
-- Name: ix_login_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_history_created_at ON public.login_history USING btree (created_at);

--
-- Name: ix_login_history_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_history_user_created ON public.login_history USING btree (user_id, created_at);

--
-- Name: ix_notification_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_preferences_user_id ON public.notification_preferences USING btree (user_id);

--
-- Name: ix_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);

--
-- Name: ix_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_user_unread ON public.notifications USING btree (user_id, is_read);

--
-- Name: ix_organization_members_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_organization_members_id ON public.organization_members USING btree (id);

--
-- Name: ix_organization_members_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_organization_members_organization_id ON public.organization_members USING btree (organization_id);

--
-- Name: ix_organization_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_organization_members_user_id ON public.organization_members USING btree (user_id);

--
-- Name: ix_organizations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_organizations_id ON public.organizations USING btree (id);

--
-- Name: ix_organizations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_organizations_slug ON public.organizations USING btree (slug);

--
-- Name: ix_point_transactions_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_point_transactions_user_created ON public.point_transactions USING btree (user_id, created_at);

--
-- Name: ix_progress_enrollment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_progress_enrollment_id ON public.progress USING btree (enrollment_id);

--
-- Name: ix_progress_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_progress_id ON public.progress USING btree (id);

--
-- Name: ix_progress_lecture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_progress_lecture_id ON public.progress USING btree (lecture_id);

--
-- Name: ix_qa_answer_votes_answer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_answer_votes_answer_id ON public.qa_answer_votes USING btree (answer_id);

--
-- Name: ix_qa_answer_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_answer_votes_user_id ON public.qa_answer_votes USING btree (user_id);

--
-- Name: ix_qa_answers_parent_answer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_answers_parent_answer_id ON public.qa_answers USING btree (parent_answer_id);

--
-- Name: ix_qa_answers_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_answers_question_id ON public.qa_answers USING btree (question_id);

--
-- Name: ix_qa_answers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_answers_user_id ON public.qa_answers USING btree (user_id);

--
-- Name: ix_qa_question_follows_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_question_follows_question_id ON public.qa_question_follows USING btree (question_id);

--
-- Name: ix_qa_question_follows_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_question_follows_user_id ON public.qa_question_follows USING btree (user_id);

--
-- Name: ix_qa_questions_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_questions_course_id ON public.qa_questions USING btree (course_id);

--
-- Name: ix_qa_questions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_questions_created_at ON public.qa_questions USING btree (created_at);

--
-- Name: ix_qa_questions_lecture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_questions_lecture_id ON public.qa_questions USING btree (lecture_id);

--
-- Name: ix_qa_questions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_qa_questions_user_id ON public.qa_questions USING btree (user_id);

--
-- Name: ix_question_topics_topic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_question_topics_topic_id ON public.question_topics USING btree (topic_id);

--
-- Name: ix_questions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_questions_id ON public.questions USING btree (id);

--
-- Name: ix_questions_quiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_questions_quiz_id ON public.questions USING btree (quiz_id);

--
-- Name: ix_quiz_attempt_answers_attempt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quiz_attempt_answers_attempt_id ON public.quiz_attempt_answers USING btree (attempt_id);

--
-- Name: ix_quiz_attempt_answers_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quiz_attempt_answers_question_id ON public.quiz_attempt_answers USING btree (question_id);

--
-- Name: ix_quiz_attempts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quiz_attempts_id ON public.quiz_attempts USING btree (id);

--
-- Name: ix_quiz_attempts_quiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quiz_attempts_quiz_id ON public.quiz_attempts USING btree (quiz_id);

--
-- Name: ix_quiz_attempts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quiz_attempts_user_id ON public.quiz_attempts USING btree (user_id);

--
-- Name: ix_quizzes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quizzes_id ON public.quizzes USING btree (id);

--
-- Name: ix_quizzes_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quizzes_section_id ON public.quizzes USING btree (section_id);

--
-- Name: ix_recommendations_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_recommendations_user_created ON public.recommendations USING btree (user_id, created_at);

--
-- Name: ix_reviews_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_course_id ON public.reviews USING btree (course_id);

--
-- Name: ix_reviews_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_id ON public.reviews USING btree (id);

--
-- Name: ix_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_user_id ON public.reviews USING btree (user_id);

--
-- Name: ix_sections_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sections_course_id ON public.sections USING btree (course_id);

--
-- Name: ix_sections_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sections_id ON public.sections USING btree (id);

--
-- Name: ix_submission_files_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_submission_files_submission_id ON public.submission_files USING btree (submission_id);

--
-- Name: ix_submissions_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_submissions_assignment_id ON public.submissions USING btree (assignment_id);

--
-- Name: ix_submissions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_submissions_id ON public.submissions USING btree (id);

--
-- Name: ix_submissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_submissions_user_id ON public.submissions USING btree (user_id);

--
-- Name: ix_topics_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_topics_parent_id ON public.topics USING btree (parent_id);

--
-- Name: ix_topics_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_topics_slug ON public.topics USING btree (slug);

--
-- Name: ix_user_badges_badge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_badges_badge_id ON public.user_badges USING btree (badge_id);

--
-- Name: ix_user_badges_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_badges_user_id ON public.user_badges USING btree (user_id);

--
-- Name: ix_user_streaks_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_streaks_user_id ON public.user_streaks USING btree (user_id);

--
-- Name: ix_user_topic_mastery_topic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_topic_mastery_topic_id ON public.user_topic_mastery USING btree (topic_id);

--
-- Name: ix_user_topic_mastery_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_topic_mastery_user_id ON public.user_topic_mastery USING btree (user_id);

--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);

--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);

--
-- Name: ix_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_status ON public.users USING btree (status);

--
-- Name: ix_wishlist_items_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wishlist_items_course_id ON public.wishlist_items USING btree (course_id);

--
-- Name: ix_wishlist_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_wishlist_items_user_id ON public.wishlist_items USING btree (user_id);

--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;

--
-- Name: announcements announcements_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: announcements announcements_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: assignments assignments_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;

--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: certificates certificates_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: certificates certificates_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;

--
-- Name: certificates certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: coding_drafts coding_drafts_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_drafts
    ADD CONSTRAINT coding_drafts_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.coding_exercises(id) ON DELETE CASCADE;

--
-- Name: coding_drafts coding_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_drafts
    ADD CONSTRAINT coding_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: coding_exercise_topics coding_exercise_topics_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_exercise_topics
    ADD CONSTRAINT coding_exercise_topics_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.coding_exercises(id) ON DELETE CASCADE;

--
-- Name: coding_exercise_topics coding_exercise_topics_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_exercise_topics
    ADD CONSTRAINT coding_exercise_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;

--
-- Name: coding_exercises coding_exercises_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_exercises
    ADD CONSTRAINT coding_exercises_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: coding_exercises coding_exercises_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_exercises
    ADD CONSTRAINT coding_exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: coding_exercises coding_exercises_lecture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_exercises
    ADD CONSTRAINT coding_exercises_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE SET NULL;

--
-- Name: coding_submission_results coding_submission_results_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submission_results
    ADD CONSTRAINT coding_submission_results_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.coding_submissions(id) ON DELETE CASCADE;

--
-- Name: coding_submission_results coding_submission_results_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submission_results
    ADD CONSTRAINT coding_submission_results_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.coding_test_cases(id) ON DELETE CASCADE;

--
-- Name: coding_submissions coding_submissions_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT coding_submissions_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.coding_exercises(id) ON DELETE CASCADE;

--
-- Name: coding_submissions coding_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT coding_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: coding_test_cases coding_test_cases_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_test_cases
    ADD CONSTRAINT coding_test_cases_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.coding_exercises(id) ON DELETE CASCADE;

--
-- Name: content_reports content_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: content_reports content_reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: course_approval_logs course_approval_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_approval_logs
    ADD CONSTRAINT course_approval_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: course_approval_logs course_approval_logs_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_approval_logs
    ADD CONSTRAINT course_approval_logs_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: course_topics course_topics_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_topics
    ADD CONSTRAINT course_topics_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: course_topics course_topics_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_topics
    ADD CONSTRAINT course_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;

--
-- Name: courses courses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

--
-- Name: courses courses_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: courses courses_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: categories fk_categories_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT fk_categories_parent_id FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;

--
-- Name: courses fk_courses_organization_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT fk_courses_organization_id FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

--
-- Name: enrollments fk_enrollments_last_lecture_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT fk_enrollments_last_lecture_id FOREIGN KEY (last_lecture_id) REFERENCES public.lectures(id) ON DELETE SET NULL;

--
-- Name: reviews fk_reviews_moderated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_reviews_moderated_by FOREIGN KEY (moderated_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: submissions fk_submissions_graded_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT fk_submissions_graded_by FOREIGN KEY (graded_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: learning_activity_daily learning_activity_daily_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_activity_daily
    ADD CONSTRAINT learning_activity_daily_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: learning_goals learning_goals_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_goals
    ADD CONSTRAINT learning_goals_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: learning_goals learning_goals_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_goals
    ADD CONSTRAINT learning_goals_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;

--
-- Name: learning_goals learning_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_goals
    ADD CONSTRAINT learning_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: learning_path_courses learning_path_courses_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_courses
    ADD CONSTRAINT learning_path_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: learning_path_courses learning_path_courses_path_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_courses
    ADD CONSTRAINT learning_path_courses_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;

--
-- Name: learning_path_enrollments learning_path_enrollments_path_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_enrollments
    ADD CONSTRAINT learning_path_enrollments_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;

--
-- Name: learning_path_enrollments learning_path_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_enrollments
    ADD CONSTRAINT learning_path_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: learning_paths learning_paths_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: lecture_bookmarks lecture_bookmarks_lecture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_bookmarks
    ADD CONSTRAINT lecture_bookmarks_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;

--
-- Name: lecture_bookmarks lecture_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_bookmarks
    ADD CONSTRAINT lecture_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: lecture_notes lecture_notes_lecture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_notes
    ADD CONSTRAINT lecture_notes_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;

--
-- Name: lecture_notes lecture_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_notes
    ADD CONSTRAINT lecture_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: lecture_resources lecture_resources_lecture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_resources
    ADD CONSTRAINT lecture_resources_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;

--
-- Name: lecture_subtitles lecture_subtitles_lecture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecture_subtitles
    ADD CONSTRAINT lecture_subtitles_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;

--
-- Name: lectures lectures_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectures
    ADD CONSTRAINT lectures_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;

--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: platform_settings platform_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: point_transactions point_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: progress progress_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;

--
-- Name: progress progress_lecture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;

--
-- Name: qa_answer_votes qa_answer_votes_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answer_votes
    ADD CONSTRAINT qa_answer_votes_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.qa_answers(id) ON DELETE CASCADE;

--
-- Name: qa_answer_votes qa_answer_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answer_votes
    ADD CONSTRAINT qa_answer_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: qa_answers qa_answers_parent_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answers
    ADD CONSTRAINT qa_answers_parent_answer_id_fkey FOREIGN KEY (parent_answer_id) REFERENCES public.qa_answers(id) ON DELETE CASCADE;

--
-- Name: qa_answers qa_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answers
    ADD CONSTRAINT qa_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.qa_questions(id) ON DELETE CASCADE;

--
-- Name: qa_answers qa_answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_answers
    ADD CONSTRAINT qa_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: qa_question_follows qa_question_follows_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_question_follows
    ADD CONSTRAINT qa_question_follows_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.qa_questions(id) ON DELETE CASCADE;

--
-- Name: qa_question_follows qa_question_follows_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_question_follows
    ADD CONSTRAINT qa_question_follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: qa_questions qa_questions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_questions
    ADD CONSTRAINT qa_questions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: qa_questions qa_questions_lecture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_questions
    ADD CONSTRAINT qa_questions_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE SET NULL;

--
-- Name: qa_questions qa_questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_questions
    ADD CONSTRAINT qa_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: question_topics question_topics_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

--
-- Name: question_topics question_topics_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_topics
    ADD CONSTRAINT question_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;

--
-- Name: questions questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quiz_attempt_answers quiz_attempt_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempt_answers
    ADD CONSTRAINT quiz_attempt_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempts(id) ON DELETE CASCADE;

--
-- Name: quiz_attempt_answers quiz_attempt_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempt_answers
    ADD CONSTRAINT quiz_attempt_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

--
-- Name: quiz_attempts quiz_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: quizzes quizzes_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;

--
-- Name: recommendations recommendations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: reviews reviews_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: sections sections_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: submission_files submission_files_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_files
    ADD CONSTRAINT submission_files_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;

--
-- Name: submissions submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

--
-- Name: submissions submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: topics topics_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.topics(id) ON DELETE SET NULL;

--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;

--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_streaks user_streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_streaks
    ADD CONSTRAINT user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_topic_mastery user_topic_mastery_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_topic_mastery
    ADD CONSTRAINT user_topic_mastery_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;

--
-- Name: user_topic_mastery user_topic_mastery_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_topic_mastery
    ADD CONSTRAINT user_topic_mastery_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: wishlist_items wishlist_items_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

--
-- Name: wishlist_items wishlist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: coding_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coding_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: coding_exercise_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coding_exercise_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: coding_exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coding_exercises ENABLE ROW LEVEL SECURITY;

--
-- Name: coding_submission_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coding_submission_results ENABLE ROW LEVEL SECURITY;

--
-- Name: coding_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: coding_test_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coding_test_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: content_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: course_approval_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_approval_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: course_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_activity_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_activity_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_path_courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_path_courses ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_path_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_path_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_paths; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

--
-- Name: lecture_bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lecture_bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: lecture_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lecture_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: lecture_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lecture_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: lecture_subtitles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lecture_subtitles ENABLE ROW LEVEL SECURITY;

--
-- Name: lectures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

--
-- Name: login_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: point_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_answer_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_answer_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_question_follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_question_follows ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: question_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_attempt_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: quizzes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

--
-- Name: submission_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;

--
-- Name: submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_streaks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_topic_mastery; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_topic_mastery ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

