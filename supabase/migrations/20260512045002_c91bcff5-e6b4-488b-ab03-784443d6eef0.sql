CREATE TABLE public.vehicle_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_name TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  vehicle_type TEXT,
  odometer TEXT,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  failed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  overall_status TEXT NOT NULL DEFAULT 'pending',
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Akses publik karena driver tidak login
CREATE POLICY "Anyone can insert inspections"
ON public.vehicle_inspections FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view inspections"
ON public.vehicle_inspections FOR SELECT
USING (true);

CREATE INDEX idx_vehicle_inspections_created_at ON public.vehicle_inspections(created_at DESC);
CREATE INDEX idx_vehicle_inspections_plate ON public.vehicle_inspections(vehicle_plate);