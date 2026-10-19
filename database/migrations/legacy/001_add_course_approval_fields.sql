-- Migration 001: Add course review and approval metadata fields to courses table
-- This migration is idempotent and safe to execute against existing databases.

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS review_feedback TEXT,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
