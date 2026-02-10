-- 1. Create table if it doesn't exist (Safety Check)
CREATE TABLE IF NOT EXISTS public.monthly_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES public.communities(id),
    unit_id UUID REFERENCES public.units(id),
    period DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    payment_id UUID REFERENCES public.payments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Unique Constraint to prevent duplicates
-- This ensures one unit cannot be billed twice for the same month.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_unit_period') THEN
        ALTER TABLE public.monthly_fees
        ADD CONSTRAINT unique_unit_period UNIQUE (unit_id, period);
    END IF;
END $$;
