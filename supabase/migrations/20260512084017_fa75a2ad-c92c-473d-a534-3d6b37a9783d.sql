ALTER TABLE public.vehicle_inspections ADD COLUMN IF NOT EXISTS excel_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-reports', 'inspection-reports', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read inspection-reports'
  ) THEN
    CREATE POLICY "Public read inspection-reports"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'inspection-reports');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public upload inspection-reports'
  ) THEN
    CREATE POLICY "Public upload inspection-reports"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'inspection-reports');
  END IF;
END $$;