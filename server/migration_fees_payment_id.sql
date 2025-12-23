-- Add payment_id column to monthly_fees if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_fees' AND column_name = 'payment_id') THEN
        ALTER TABLE public.monthly_fees ADD COLUMN payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;
    END IF;
END $$;
