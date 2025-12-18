const supabase = require('../config/supabaseClient'); // Normal client for queries
const supabaseAdmin = require('../config/supabaseAdmin'); // Admin client for auth management
const randomstring = require('randomstring');

exports.listUsers = async (req, res) => {
    try {
        const communityId = req.headers['x-community-id'];
        if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

        // Fetch members of the specific community
        // Note: unit_owners is related to profiles, not community_members directly.
        const { data, error } = await supabase
            .from('community_members')
            .select(`
                *,
                profiles (
                    *,
                    unit_owners (
                        unit_id,
                        units ( * )
                    )
                ),
                roles ( name )
            `)
            .eq('community_id', communityId);

        if (error) throw error;

        // Flatten structure for frontend compatibility
        const users = data.map(member => {
            const profile = member.profiles || {};
            const rawUnits = profile.unit_owners || [];

            // Filter units to only show ones belonging to this community
            // (Assuming units table has community_id populated)
            const communityUnits = rawUnits.filter(uo => uo.units && uo.units.community_id === communityId);

            return {
                ...profile,   // Profile details
                roles: member.roles,  // Role details
                unit_owners: communityUnits, // Frontend expects 'unit_owners' array on the user object for the table mapping
                community_member_id: member.id,
                role_id: member.role_id
            };
        });

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.inviteUser = async (req, res) => {
    const { email, fullName, roleName, unitIds } = req.body;
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        // 1. Verify Inviter's Permission in this Community
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token provided');

        const { data: { user: inviterUser }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !inviterUser) throw new Error('Invalid token');

        // Check if inviter is Admin/President/Secretary in this community
        const { data: membership, error: memberError } = await supabase
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', inviterUser.id)
            .eq('community_id', communityId)
            .single();

        if (memberError || !membership) throw new Error('Inviter is not a member of this community');

        const allowedRoles = ['president', 'admin', 'secretary'];
        if (!allowedRoles.includes(membership.roles.name)) {
            throw new Error('Insufficient permissions to invite users');
        }

        // 2. Invite User
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                is_admin_registration: false,
                community_id: communityId // Metadata backup
            },
            redirectTo: (process.env.CLIENT_URL || 'http://localhost:5173') + '/update-password'
        });

        if (error) throw error;

        // 3. Add to community_members
        const userId = data.user.id;

        // Find role ID
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', roleName || 'neighbor')
            .single();

        if (roleError) throw roleError;

        // Insert into community_members
        // Use UPSERT to handle re-invites or if profile already existed
        const { error: memberInsertError } = await supabaseAdmin
            .from('community_members')
            .upsert({
                profile_id: userId,
                community_id: communityId,
                role_id: roleData.id
            });

        if (memberInsertError) throw memberInsertError;

        // Assign units if any
        if (unitIds && unitIds.length > 0) {
            const unitInserts = unitIds.map(uid => ({
                profile_id: userId,
                unit_id: uid,
                is_primary: false
            }));

            // Note: unit_owners might need community_id context check, but IDs are unique globally usually.
            const { error: ownersError } = await supabaseAdmin
                .from('unit_owners')
                .insert(unitInserts);

            if (ownersError) throw ownersError;
        }

        res.status(201).json({ message: `Invitation sent to ${email}`, user: data.user });

    } catch (err) {
        console.error("Invite error:", err);
        res.status(400).json({ error: err.message });
    }
}

exports.updateUser = async (req, res) => {
    const { id } = req.params; // potentially the community_member_id or profile_id
    // Ideally we pass profile_id. Let's assume ID is profile_id for now as it's standard.
    const { roleName, unitIds } = req.body;
    const communityId = req.headers['x-community-id'];

    try {
        // Find role ID if roleName is provided
        let roleId = null;
        if (roleName) {
            const { data: roleData, error: roleError } = await supabase
                .from('roles')
                .select('id')
                .eq('name', roleName)
                .single();

            if (roleError) throw roleError;
            roleId = roleData.id;
        }

        // Update Community Member Role
        if (roleId) {
            const { error: updateError } = await supabaseAdmin
                .from('community_members')
                .update({ role_id: roleId })
                .eq('profile_id', id)
                .eq('community_id', communityId);

            if (updateError) throw updateError;
        }

        // Update Units
        if (unitIds !== undefined) {
            // 1. Get IDs of units in this community to identify which ownerships to delete
            // We want to delete ownerships where unit -> block -> community_id = current
            // Since we can't do complex joins in delete, we fetch relevant ownership IDs first.

            // Or safer: Fetch all unit_owners for this profile, verify which belong to this community, then delete specific IDs.
            const { data: userOwnerships } = await supabaseAdmin
                .from('unit_owners')
                .select('id, units(block_id, blocks(community_id))')
                .eq('profile_id', id);

            if (userOwnerships) {
                const idsToDelete = userOwnerships
                    .filter(uo => uo.units?.blocks?.community_id === communityId)
                    .map(uo => uo.id);

                if (idsToDelete.length > 0) {
                    const { error: delError } = await supabaseAdmin
                        .from('unit_owners')
                        .delete()
                        .in('id', idsToDelete);
                    if (delError) throw delError;
                }
            }

            // Insert new
            if (unitIds.length > 0) {
                const unitInserts = unitIds.map(uid => ({
                    profile_id: id,
                    unit_id: uid
                }));
                const { error: insError } = await supabaseAdmin
                    .from('unit_owners')
                    .insert(unitInserts);

                if (insError) throw insError;
            }
        }

        res.json({ message: 'User updated' });
    } catch (err) {
        console.error("Update user error:", err);
        res.status(400).json({ error: err.message });
    }
}
