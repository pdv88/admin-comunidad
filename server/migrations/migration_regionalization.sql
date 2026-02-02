-- Add country column to communities table (default MX)
ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'MX';

-- Add coefficient column to units table (default 0, used for Spain)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS coefficient NUMERIC DEFAULT 0;

-- Comment on columns for clarity
COMMENT ON COLUMN public.communities.country IS 'Country code (MX, ES) to determine business logic rules';
COMMENT ON COLUMN public.units.coefficient IS 'Participation coefficient for common expenses (0-100 or 0-1)';
