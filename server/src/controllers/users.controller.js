const supabase = require('../config/supabaseClient'); // Normal client for queries
const supabaseAdmin = require('../config/supabaseAdmin'); // Admin client for auth management
const randomstring = require('randomstring');

exports.listUsers = async (req, res) => {
    try {
        const { data, error } = await supabase.from('profiles').select('*, roles(name), units(*)');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.inviteUser = async (req, res) => {
    const { email, fullName, roleName, unitId } = req.body;

    try {
        // 1. Generate a temp password (or rely on magic link, but creating user requires password usually)
        // With inviteUserByEmail we don't need password.

        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                is_admin_registration: false // It's an invitation, not a direct admin signup
            },
            // redirectTo: process.env.CLIENT_URL + '/update-password' // Redirect flow
        });

        if (error) throw error;

        // 2. We need to assign the role and unit to this new user.
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

        // Update profile with role and unit
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                role_id: roleData.id,
                unit_id: unitId || null
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        res.status(201).json({ message: `Invitation sent to ${email}`, user: data.user });

    } catch (err) {
        console.error("Invite error:", err);
        res.status(400).json({ error: err.message });
    }
}

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { roleName, unitId } = req.body;

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
        if (unitId !== undefined) updates.unit_id = unitId === "" ? null : unitId; // Handle unassignment

        // Use supabaseAdmin to bypass RLS
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json(data[0]);
    } catch (err) {
        console.error("Update user error:", err);
        res.status(400).json({ error: err.message });
    }
}
