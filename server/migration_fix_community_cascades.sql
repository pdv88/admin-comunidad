-- Migration to enable ON DELETE CASCADE for Community-related tables
-- This ensures that deleting a Community automatically deletes all associated data.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- List of tables and their foreign key columns pointing to parent tables that need CASCADE
    -- Format: child_table, fk_column, parent_table
    -- We will drop the existing constraint and add a new one with ON DELETE CASCADE
    
    FOR r IN SELECT * FROM (VALUES 
        ('blocks', 'community_id', 'communities'),
        ('units', 'block_id', 'blocks'), -- Units depend on Blocks
        ('community_members', 'community_id', 'communities'),
        ('community_documents', 'community_id', 'communities'),
        ('reports', 'community_id', 'communities'),
        ('notices', 'community_id', 'communities'),
        ('polls', 'community_id', 'communities'),
        ('campaigns', 'community_id', 'communities'),
        ('payments', 'community_id', 'communities'),
        ('visits', 'community_id', 'communities'),
        ('unit_owners', 'unit_id', 'units') -- Ensure Unit deletion cascades to Unit Owners
    ) AS t(child_table, fk_column, parent_table)
    LOOP
        -- 1. Check if table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = r.child_table) THEN
            
            -- 2. Find and Drop existing FK constraint on this column
            DECLARE
                constraint_name text;
            BEGIN
                SELECT tc.constraint_name INTO constraint_name
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                  AND tc.table_schema = 'public'
                  AND tc.table_name = r.child_table
                  AND kcu.column_name = r.fk_column;

                IF constraint_name IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE public.' || quote_ident(r.child_table) || ' DROP CONSTRAINT ' || quote_ident(constraint_name);
                    RAISE NOTICE 'Dropped constraint % on table %', constraint_name, r.child_table;
                END IF;
            END;

            -- 3. Add new Constraint with ON DELETE CASCADE
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.child_table) || 
                    ' ADD CONSTRAINT ' || quote_ident(r.child_table || '_' || r.fk_column || '_fkey_cascade') || 
                    ' FOREIGN KEY (' || quote_ident(r.fk_column) || ') ' || 
                    ' REFERENCES public.' || quote_ident(r.parent_table) || '(id) ON DELETE CASCADE';
            
            RAISE NOTICE 'Added CASCADE constraint to table %', r.child_table;
            
        END IF;
    END LOOP;
END $$;
