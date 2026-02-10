-- Create new migration file: migration_visits_add_moving_type.sql
DO $$ 
BEGIN 
    ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_type_check; 
    ALTER TABLE public.visits ADD CONSTRAINT visits_type_check CHECK (type IN ('guest', 'family', 'provider', 'service', 'delivery', 'moving')); 
END $$;
