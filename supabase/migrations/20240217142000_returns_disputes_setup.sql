-- Enable Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('returns-disputes', 'returns-disputes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Rules: Allow public viewing, but only authenticated uploads
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'returns-disputes' );

CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'returns-disputes' );

-- ==========================================
-- 1. Returns Table
-- ==========================================
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    reason TEXT NOT NULL,
    description TEXT,
    
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    
    evidence_files JSONB DEFAULT '[]'::JSONB, -- Array of file URLs
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Returns
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own returns" 
ON returns FOR SELECT 
TO authenticated 
USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own returns" 
ON returns FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = customer_id);

-- ==========================================
-- 2. Disputes Table
-- ==========================================
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    reason TEXT NOT NULL,
    description TEXT,
    
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
    
    evidence_files JSONB DEFAULT '[]'::JSONB, -- Array of file URLs
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own disputes" 
ON disputes FOR SELECT 
TO authenticated 
USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own disputes" 
ON disputes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = customer_id);

-- ==========================================
-- 3. Audit Log Trigger (Optional but Good Practice)
-- ==========================================
-- Assuming transaction_logs or similar exists, but sticking to simple scope for now.
