-- Migration 002: Add unique constraint on (user_id, course_id) to enrollments table
-- Safe and idempotent check before applying constraint to PostgreSQL database

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_course_enrollment'
    ) THEN
        ALTER TABLE enrollments
            ADD CONSTRAINT uq_user_course_enrollment UNIQUE (user_id, course_id);
    END IF;
END $$;
