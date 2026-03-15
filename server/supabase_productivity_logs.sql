-- Run this in Supabase Dashboard → SQL Editor to create the productivity logs table.
-- Stores daily activity + computed productivity metrics per intern.

CREATE TABLE IF NOT EXISTS intern_productivity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- User-provided inputs
    activity_count INTEGER NOT NULL DEFAULT 0,
    total_activity_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    courses_enrolled INTEGER NOT NULL DEFAULT 0,
    avg_progress NUMERIC(5,2) NOT NULL DEFAULT 0,
    avg_test_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    total_learning_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    tasks_assigned INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    total_hours_estimated NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_hours_actual NUMERIC(8,2) NOT NULL DEFAULT 0,
    -- Backend-computed
    task_completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    task_efficiency NUMERIC(6,4) NOT NULL DEFAULT 0,
    productivity_score NUMERIC(5,4) NOT NULL DEFAULT 0,
    predicted_productivity_next_week NUMERIC(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, date)
);

-- Index for fast lookups by email and date
CREATE INDEX IF NOT EXISTS idx_productivity_logs_email ON intern_productivity_logs(email);
CREATE INDEX IF NOT EXISTS idx_productivity_logs_date ON intern_productivity_logs(date DESC);

-- RLS: allow service role full access; optionally restrict reads by email for authenticated users
ALTER TABLE intern_productivity_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "productivity_logs_service_all" ON intern_productivity_logs
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE intern_productivity_logs IS 'Daily productivity logs with computed task_completion_rate, task_efficiency, productivity_score. email and date auto-filled from intern login.';
