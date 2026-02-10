-- Add columns for Mandatory Campaigns / Extraordinary Fees
-- Approach: Unified Bills Table (monthly_fees)

-- 1. Add 'is_mandatory' and 'amount_per_unit' to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS amount_per_unit NUMERIC DEFAULT 0;

-- 2. Add 'type' and 'campaign_id' to monthly_fees table
ALTER TABLE monthly_fees 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'maintenance', -- 'maintenance' or 'extraordinary'
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- 3. Backfill existing records (Safety measure)
UPDATE monthly_fees SET type = 'maintenance' WHERE type IS NULL;

-- 4. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monthly_fees_campaign_id ON monthly_fees(campaign_id);
