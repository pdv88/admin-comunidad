-- Add bank_details column to communities table
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS bank_details JSONB;

-- Example:
-- {
--   "bank_name": "Bank of America",
--   "account_number": "1234567890",
--   "account_holder": "Community HOA",
--   "routing_number": "987654321"
-- }
