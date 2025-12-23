-- Add payment_date column to payments table
ALTER TABLE public.payments ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Optional: Comment on column
COMMENT ON COLUMN public.payments.payment_date IS 'Date when the payment was made, defaulting to creation time if not specified';
