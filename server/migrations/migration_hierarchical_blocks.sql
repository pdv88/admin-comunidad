-- Migration: Enable Hierarchical Blocks (Recursive Structure)

-- 1. Add parent_id to allow nesting (e.g. Staircase belongs to Portal)
ALTER TABLE public.blocks 
ADD COLUMN parent_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE,
ADD COLUMN structure_type TEXT DEFAULT 'block'; -- e.g. 'portal', 'staircase', 'tower', 'phase'

-- 2. Index for performance on recursive queries
CREATE INDEX idx_blocks_parent_id ON public.blocks(parent_id);

-- 3. Comments for documentation
COMMENT ON COLUMN public.blocks.parent_id IS 'References a parent block (e.g., a Staircase inside a Portal).';
COMMENT ON COLUMN public.blocks.structure_type IS 'Type of structure: portal, staircase, tower, phase, etc.';

-- 4. Example usage (Conceptual):
-- Insert Portal: INSERT INTO blocks (name, structure_type) VALUES ('Portal 1', 'portal');
-- Insert Staircase: INSERT INTO blocks (name, structure_type, parent_id) VALUES ('Escalera A', 'staircase', [Portal_UUID]);
-- Units will be linked to the Staircase UUID.
