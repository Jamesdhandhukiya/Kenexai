-- Optional: seed 7 days of dummy productivity logs so the Weekly Productivity Trend chart shows a trend.
-- Run in Supabase Dashboard → SQL Editor. Replace 'intern@kenexai.com' with the intern's email.
-- Uses ON CONFLICT DO UPDATE so re-running just updates the rows.
-- Scores increase over the week (e.g. 68 → 80%) so the line chart shows an upward trend.

WITH days AS (
    SELECT d::date AS dt, row_number() OVER (ORDER BY d) AS rn
    FROM generate_series(
        (CURRENT_DATE - interval '6 days')::date,
        CURRENT_DATE,
        '1 day'::interval
    ) AS d
)
INSERT INTO intern_productivity_logs (
    email, date,
    activity_count, total_activity_hours, courses_enrolled, avg_progress, avg_test_score,
    total_learning_hours, tasks_assigned, tasks_completed, total_hours_estimated, total_hours_actual,
    task_completion_rate, task_efficiency, productivity_score
)
SELECT
    'intern@kenexai.com',
    days.dt,
    4, 6.5, 2, 68 + days.rn * 2, 72 + days.rn * 1.5,
    10, 6, 4, 24, 22,
    0.65 + (days.rn * 0.02), 1.0,
    (0.68 + (days.rn * 0.018) + (random() * 0.02))::numeric(5,4)
FROM days
ON CONFLICT (email, date) DO UPDATE SET
    activity_count = EXCLUDED.activity_count,
    total_activity_hours = EXCLUDED.total_activity_hours,
    avg_progress = EXCLUDED.avg_progress,
    avg_test_score = EXCLUDED.avg_test_score,
    task_completion_rate = EXCLUDED.task_completion_rate,
    task_efficiency = EXCLUDED.task_efficiency,
    productivity_score = EXCLUDED.productivity_score;
