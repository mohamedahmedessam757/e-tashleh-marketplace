-- Enable Supabase Realtime for financial tables (run manually; ignore errors if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE financial_settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_adjustments;
