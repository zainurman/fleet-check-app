
ALTER TABLE public.vehicle_inspections
  ADD COLUMN IF NOT EXISTS delivery_destination text,
  ADD COLUMN IF NOT EXISTS stnk_expiry date,
  ADD COLUMN IF NOT EXISTS kir_expiry date,
  ADD COLUMN IF NOT EXISTS tire_pressure_front text,
  ADD COLUMN IF NOT EXISTS tire_pressure_rear text,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read inspection photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Public upload inspection photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inspection-photos');
