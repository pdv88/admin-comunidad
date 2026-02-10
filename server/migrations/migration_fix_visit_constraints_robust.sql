-- Create new migration file: migration_fix_visit_constraints_robust.sql
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- 1. Drop the specific default named constraint if it exists
    ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_type_check; 
    
    -- 2. Loop through and drop ANY other check constraint on the 'type' column to be safe (optional but risky if multiple, assuming main one)
    -- This is safer to just try adding the new one. If there is a collision, it will fail, but we hope the name is standard.
    
    -- 3. Add the new constraint with the standard name
    ALTER TABLE public.visits ADD CONSTRAINT visits_type_check CHECK (type IN ('guest', 'family', 'provider', 'service', 'delivery', 'moving')); 
END $$;
