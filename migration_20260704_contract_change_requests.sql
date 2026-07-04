-- Contract amendment workflow (run manually on Supabase)

CREATE TABLE IF NOT EXISTS contract_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acceptance_id UUID NOT NULL REFERENCES contract_acceptances(id) ON DELETE RESTRICT,
  old_second_party_data JSONB NOT NULL DEFAULT '{}',
  new_second_party_data JSONB NOT NULL DEFAULT '{}',
  old_signature_data JSONB NOT NULL DEFAULT '{}',
  new_signature_data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  admin_signature TEXT,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE contract_acceptances
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS change_request_id UUID REFERENCES contract_change_requests(id);

DROP INDEX IF EXISTS contract_acceptances_store_id_contract_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS contract_acceptances_one_active_per_store
  ON contract_acceptances (store_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_contract_change_requests_status ON contract_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_contract_change_requests_store ON contract_change_requests(store_id);
