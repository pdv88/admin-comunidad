const supabase = require('../config/supabaseClient'); // Normal client for queries
const supabaseAdmin = require('../config/supabaseAdmin'); // Admin client for auth management
const randomstring = require('randomstring');

exports.listUsers = async (req, res) => {
    try {
        const { data, error } = await supabase.from('profiles').select('*, roles(name), unit_owners(unit_id, units(*))');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.inviteUser = async (req, res) => {
    const { email, fullName, roleName, unitIds } = req.body;

    try {
        // 1. Get Inviter's Community ID
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token provided');

        const { data: { user: inviterUser }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !inviterUser) throw new Error('Invalid token');

        const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('community_id')
            .eq('id', inviterUser.id)
            .single();

        if (!inviterProfile?.community_id) {
            throw new Error('Inviter does not belong to a community.');
        }

        // 2. Generate a temp password (or rely on magic link, but creating user requires password usually)
        // With inviteUserByEmail we don't need password.

        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                is_admin_registration: false,
                community_id: inviterProfile.community_id // Metadata backup
            },
            redirectTo: (process.env.CLIENT_URL || 'http://localhost:5173') + '/update-password'
        });

        if (error) throw error;

        // 3. We need to assign the role and unit to this new user.
        // The trigger 'handle_new_user' might run on insert to auth.users.
        // The default trigger assigns 'neighbor'. We can update it now.

        const userId = data.user.id;

        // Find role ID
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', roleName || 'neighbor')
            .single();

        if (roleError) throw roleError;

        // Update profile role AND community_id
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                role_id: roleData.id,
                community_id: inviterProfile.community_id // Explicitly set community ID
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Assign units if any
        if (unitIds && unitIds.length > 0) {
            const unitInserts = unitIds.map(uid => ({
                profile_id: userId,
                unit_id: uid,
                is_primary: false // Or true for first one?
            }));

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
    const { id } = req.params;
    const { roleName, unitIds } = req.body;

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

        // Prepare update object
        const updates = {};
        if (roleId) updates.role_id = roleId;
        // Don't update unit_id in profiles anymore

        // Update Profile
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        // Update Units
        if (unitIds !== undefined) {
            // Delete existing
            const { error: delError } = await supabaseAdmin
                .from('unit_owners')
                .delete()
                .eq('profile_id', id);

            if (delError) throw delError;

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

        res.json(data[0]);
    } catch (err) {
        console.error("Update user error:", err);
        res.status(400).json({ error: err.message });
    }
}
