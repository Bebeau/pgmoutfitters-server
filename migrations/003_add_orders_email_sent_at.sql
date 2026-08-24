-- Adds email_sent_at for webhook email idempotency.
-- 002 includes this column for new installs; this ALTER covers databases
-- that already applied 002 before the column existed.
-- Apply with: npm run migrate

ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
