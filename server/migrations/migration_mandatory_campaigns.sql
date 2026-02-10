-- Migration to support Mandatory Campaigns and Extraordinary Fees

-- 1. Update campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS amount_per_unit NUMERIC DEFAULT 0;

-- 2. Update monthly_fees table
ALTER TABLE public.monthly_fees 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'maintenance',
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- 3. Add index for performance on filtering
CREATE INDEX IF NOT EXISTS idx_monthly_fees_type ON public.monthly_fees(type);
CREATE INDEX IF NOT EXISTS idx_monthly_fees_campaign_id ON public.monthly_fees(campaign_id);
