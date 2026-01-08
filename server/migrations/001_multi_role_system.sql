-- Multi-Role System Migration
-- Run this in your Supabase SQL Editor

-- 1. Create the member_roles junction table
CREATE TABLE IF NOT EXISTS member_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES community_members(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    block_id UUID REFERENCES blocks(id) ON DELETE SET NULL, -- For block-specific roles like vocal
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to prevent duplicates (handles NULL block_id properly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_roles_unique 
ON member_roles (member_id, role_id, COALESCE(block_id, '00000000-0000-0000-0000-000000000000'));
CREATE INDEX IF NOT EXISTS idx_member_roles_role_id ON member_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_block_id ON member_roles(block_id);

-- 3. Migrate existing data from community_members.role_id to member_roles
INSERT INTO member_roles (member_id, role_id)
SELECT id, role_id 
FROM community_members 
WHERE role_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Enable RLS
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Users can view their own roles
CREATE POLICY "Users can view their own roles" ON member_roles
    FOR SELECT USING (
        member_id IN (
            SELECT id FROM community_members WHERE profile_id = auth.uid()
        )
    );

-- Admins can manage roles in their community
CREATE POLICY "Admins can manage roles" ON member_roles
    FOR ALL USING (
        member_id IN (
            SELECT cm.id FROM community_members cm
            JOIN member_roles mr ON mr.member_id = cm.id
            JOIN roles r ON r.id = mr.role_id
            WHERE cm.community_id IN (
                SELECT community_id FROM community_members WHERE profile_id = auth.uid()
            )
            AND r.name IN ('admin', 'president')
        )
    );

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role bypass" ON member_roles
    FOR ALL USING (auth.role() = 'service_role');

-- 6. OPTIONAL: After verifying migration works, remove role_id from community_members
-- WARNING: Only uncomment this after confirming the migration is successful
-- ALTER TABLE community_members DROP COLUMN role_id;

SELECT 'Migration complete! Please verify data in member_roles table.' as status;
