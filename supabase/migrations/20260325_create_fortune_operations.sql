-- Fortune operation idempotency table
-- Prevents duplicate Fortune consumption from double-clicks, retries, or async overlap
CREATE TABLE IF NOT EXISTS fortune_operations (
    operation_id text PRIMARY KEY,
    user_id uuid NOT NULL,
    context text,
    amount integer,
    created_at timestamptz DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_fortune_operations_created_at ON fortune_operations (created_at);

-- TTL cleanup: delete records older than 7 days (run via pg_cron or scheduled function)
-- SELECT cron.schedule('fortune-ops-cleanup', '0 3 * * *', $$DELETE FROM fortune_operations WHERE created_at < now() - interval '7 days'$$);
