
-- Create Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- We store the raw UUID, can link to users if needed but better decoupled for now
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED, PENDING
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookup by user
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for NestJS user ID usage - similar to orders)
-- Allow all inserts (authenticated)
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (true);

-- Allow reading own tickets
-- Note: Logic depends on how we pass auth.uid or if we disable RLS for NestJS integration
-- For now, if disabling RLS is the path, this policy is moot.
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid());
