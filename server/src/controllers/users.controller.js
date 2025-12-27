const supabase = require('../config/supabaseClient'); // Normal client for queries
const supabaseAdmin = require('../config/supabaseAdmin'); // Admin client for auth management
const randomstring = require('randomstring');

exports.listUsers = async (req, res) => {
    try {
        const communityId = req.headers['x-community-id'];
        if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

        // 1. Fetch community members
        const { data: members, error: memberError } = await supabase
            .from('community_members')
            .select(`
                *,
                profiles (*),
                roles ( name )
            `)
            .eq('community_id', communityId);

        if (memberError) throw memberError;

        if (!members || members.length === 0) {
            return res.json([]);
        }

        const profileIds = members.map(m => m.profile_id);

        // 2. Fetch Unit Owners (and Units) for these profiles
        const { data: ownerships, error: unitsError } = await supabase
            .from('unit_owners')
            .select(`
                *,
                units (
                    *,
                    blocks ( community_id )
                )
            `)
            .in('profile_id', profileIds);

        if (unitsError) throw unitsError;

        // 3. Map structure
        const users = members.map(member => {
            const profile = member.profiles || {};
            // Find ownerships for this profile AND filter by community via blocks
            const userOwnerships = ownerships?.filter(uo =>
                uo.profile_id === member.profile_id &&
                uo.units?.blocks?.community_id === communityId
            ) || [];

            return {
                ...profile,   // Profile details
                roles: member.roles,  // Role details
                unit_owners: userOwnerships,
                community_member_id: member.id,
                role_id: member.role_id
            };
        });

        res.json(users);
    } catch (err) {
        console.error("List users error:", err);
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
        // Also fetch Community Name for the email
        const { data: membership, error: memberError } = await supabase
            .from('community_members')
            .select('roles(name), communities(name)')
            .eq('profile_id', inviterUser.id)
            .eq('community_id', communityId)
            .single();

        if (memberError || !membership) throw new Error('Inviter is not a member of this community');

        const allowedRoles = ['president', 'admin', 'secretary'];
        if (!allowedRoles.includes(membership.roles.name)) {
            throw new Error('Insufficient permissions to invite users');
        }

        const communityName = membership.communities?.name || 'su comunidad';

        // 2. Check if user already exists
        let userId;
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingProfile) {
            userId = existingProfile.id;
            // User exists: Send a notification email that they were added to a new community
            const sendEmail = require('../utils/sendEmail');
            await sendEmail({
                email: email,
                subject: `Bienvenido a ${communityName} - Admin Comunidad`,
                templateName: 'invitation.html', // Reusing invitation or a simplified "Added" email? Using invitation for now with slight context diff if possible, or just same generic "You have been invited/added"
                context: {
                    communityName: communityName,
                    link: (process.env.CLIENT_URL || 'http://localhost:5173') // Just link to app login since they have an account
                }
            });

        } else {
            // 3. New User: Create User + Generate Link
            // Use createUser instead of inviteUserByEmail to avoid default email
            const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                email_confirm: true, // Auto-confirm email because they are being "invited" by an admin? Or false? 
                // Usually for invites we want them to set a password.
                // If we set email_confirm: true, they can login immediately if they had a password (they don't).
                // We will send a link to 'update-password' which handles setting it.
                user_metadata: {
                    full_name: fullName,
                    is_admin_registration: false,
                    community_id: communityId // Metadata backup
                }
            });

            if (createError) throw createError;
            userId = userData.user.id;

            // Generate Invite/Recovery Link
            // 'invite' type works well, or 'recovery' to force password set.
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    redirectTo: (process.env.CLIENT_URL || 'http://localhost:5173') + '/update-password'
                }
            });

            if (linkError) throw linkError;

            // Send Custom Email
            if (linkData && linkData.properties && linkData.properties.action_link) {
                const sendEmail = require('../utils/sendEmail');
                await sendEmail({
                    email: email,
                    subject: `Invitación a ${communityName} - Admin Comunidad`,
                    templateName: 'invitation.html',
                    context: {
                        communityName: communityName,
                        link: linkData.properties.action_link
                    }
                });
            }

            // Ensure profile exists (manually upsert since we didn't use the hook or just to be safe)
            await supabaseAdmin.from('profiles').upsert({
                id: userId,
                email: email,
                full_name: fullName
            });
        }

        // 4. Add to community_members
        // Find role ID
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', roleName || 'neighbor')
            .single();

        if (roleError) throw roleError;

        // Insert into community_members
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
    const { roleName, unitIds, fullName } = req.body;
    const communityId = req.headers['x-community-id'];

    try {
        // Update Profile Name if provided
        if (fullName) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', id);

            if (profileError) throw profileError;
        }

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
