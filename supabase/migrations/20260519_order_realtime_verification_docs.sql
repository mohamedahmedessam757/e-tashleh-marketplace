-- Enable realtime for verification_documents (order detail sync after merchant submit)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'verification_documents'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_documents;
    END IF;
  END IF;
END $$;
