-- Add unit_id to payments table
ALTER TABLE public.payments 
ADD COLUMN unit_id UUID REFERENCES public.units(id);

-- Optional: Create index for performance
CREATE INDEX idx_payments_unit_id ON public.payments(unit_id);
