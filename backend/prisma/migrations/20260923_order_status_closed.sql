-- Prisma schema already includes OrderStatus.CLOSED; local/prod DB enums were missing it.
-- Without this value, minute cron queries using notIn:[..., CLOSED, ...] crash and never
-- reach per-offer return-window auto-completion / warranty activation.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CLOSED';
