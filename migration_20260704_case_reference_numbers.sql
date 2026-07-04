-- Case reference numbers for returns/disputes (run manually on Supabase)

ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS case_reference VARCHAR(20);

ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS case_reference VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_returns_case_reference ON returns (case_reference)
  WHERE case_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_case_reference ON disputes (case_reference)
  WHERE case_reference IS NOT NULL;

-- Backfill existing returns
DO $$
DECLARE
  r RECORD;
  seq INT := 0;
  yr TEXT;
BEGIN
  yr := to_char(now(), 'YYYY');
  FOR r IN SELECT id, created_at FROM returns WHERE case_reference IS NULL ORDER BY created_at ASC LOOP
    seq := seq + 1;
    yr := to_char(r.created_at, 'YYYY');
    UPDATE returns SET case_reference = 'CASE-' || yr || '-' || lpad(seq::text, 5, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill existing disputes (continue sequence per year from max existing)
DO $$
DECLARE
  d RECORD;
  seq INT;
  yr TEXT;
  ref_prefix TEXT;
BEGIN
  FOR d IN SELECT id, created_at FROM disputes WHERE case_reference IS NULL ORDER BY created_at ASC LOOP
    yr := to_char(d.created_at, 'YYYY');
    ref_prefix := 'CASE-' || yr || '-';
    SELECT COALESCE(MAX(CAST(SUBSTRING(case_reference FROM length(ref_prefix) + 1) AS INT)), 0)
      INTO seq
      FROM (
        SELECT case_reference FROM returns WHERE case_reference LIKE ref_prefix || '%'
        UNION ALL
        SELECT case_reference FROM disputes WHERE case_reference LIKE ref_prefix || '%'
      ) t;
    seq := seq + 1;
    UPDATE disputes SET case_reference = ref_prefix || lpad(seq::text, 5, '0') WHERE id = d.id;
  END LOOP;
END $$;
