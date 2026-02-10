-- Add unit_id and block_id to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id),
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.blocks(id);

-- Add index for performance on filtering by block/unit
CREATE INDEX IF NOT EXISTS idx_reports_unit_id ON public.reports(unit_id);
CREATE INDEX IF NOT EXISTS idx_reports_block_id ON public.reports(block_id);

-- Update RLS policies to be aware of new columns (optional but good for safety)
-- We rely heavily on Controller logic, but let's allow reading via RLS for safety
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports" ON public.reports 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports" ON public.reports 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM public.roles WHERE name IN ('president', 'admin', 'maintenance', 'secretary')))
);

-- Vocals can view reports in their blocks (this is complex in RLS, handled in Controller preferably, but here is a basic version)
-- Skipping complex Vocal RLS for now to avoid perf issues, relying on Controller.
