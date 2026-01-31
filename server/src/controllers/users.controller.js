const supabase = require('../config/supabaseClient'); // Normal client for queries
const supabaseAdmin = require('../config/supabaseAdmin'); // Admin client for auth management
const randomstring = require('randomstring');

exports.listUsers = async (req, res) => {
    try {
        let communityId = req.headers['x-community-id'];
        const { page = 1, limit = 10, search = '' } = req.query;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Handle duplicate headers (concatenated by comma)
        if (communityId && communityId.includes(',')) {
            communityId = communityId.split(',')[0].trim();
        }

        if (!communityId) {
            console.error(`[ListUsers] Error: Community ID Missing`);
            return res.status(400).json({ error: 'Community ID header missing' });
        }

        // 1. Build Query for Community Members
        let query = supabaseAdmin
            .from('community_members')
            .select(`
                *,
                profiles!inner (*),
                roles ( name )
            `, { count: 'exact' })
            .eq('community_id', communityId);

        // Apply Search Filter on Profiles if provided
        if (search) {
            // Note: filtering on joined table requires !inner which we added above.
            // We search full_name OR email OR phone.
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`, { foreignTable: 'profiles' });
        }

        // Apply Pagination
        query = query.range(from, to).order('created_at', { ascending: false });

        const { data: members, count, error: memberError } = await query;

        if (memberError) {
            console.error(`[ListUsers] Member Query Error:`, memberError);
            throw memberError;
        }

        if (!members || members.length === 0) {
            return res.json({ data: [], count: 0 });
        }

        const profileIds = members.map(m => m.profile_id);

        // 2. Fetch Unit Owners (and Units) for these profiles
        // We only need ownerships for the users displayed on this page
        const { data: ownerships, error: unitsError } = await supabaseAdmin
            .from('unit_owners')
            .select(`
                *,
                units (
                    *,
                    blocks ( * )
                )
            `)
            .in('profile_id', profileIds);

        if (unitsError) throw unitsError;

        // 3. Fetch roles from member_roles table for these members
        const memberIds = members.map(m => m.id);
        let memberRoles = [];
        if (memberIds.length > 0) {
            const { data: rolesData, error: rolesError } = await supabaseAdmin
                .from('member_roles')
                .select('*, roles(*), blocks(*)')
                .in('member_id', memberIds);
            if (!rolesError) memberRoles = rolesData || [];
        }

        // 4. Fetch Auth Data for all profiles (to check 'email_confirmed_at')
        // Using Promise.all to fetch individually as there's no bulk fetch by ID list in admin API currently exposed easily
        const authUsers = await Promise.all(
            profileIds.map(async (uid) => {
                try {
                    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(uid);
                    return user || null;
                } catch (e) {
                    return null;
                }
            })
        );

        const authMap = {};
        authUsers.forEach(u => {
            if (u) authMap[u.id] = u;
        });

        // 5. Map structure
        const users = members.map(member => {
            const profile = member.profiles || {};
            const authUser = authMap[member.profile_id];

            // Determine if confirmed
            // Refined Logic: User is confirmed only if they have logged in SINCE they were added to this community.
            // This handles cases where an old user is re-invited but hasn't accessed this community yet.
            const lastSign = authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null;
            const joinedAt = member.created_at ? new Date(member.created_at) : null;

            const isConfirmed = !!(lastSign && joinedAt && lastSign > joinedAt);

            // Find ownerships for this profile AND filter by community via blocks
            const userOwnerships = ownerships?.filter(uo =>
                uo.profile_id === member.profile_id &&
                uo.units?.blocks?.community_id === communityId
            ) || [];

            // Get roles from member_roles table
            const rawRoles = memberRoles
                .filter(mr => mr.member_id === member.id)
                .map(mr => ({
                    id: mr.role_id,
                    name: mr.roles?.name,
                    block_id: mr.block_id,
                    block_name: mr.blocks?.name
                }));

            // Advanced Deduplication: Prioritize Specific Roles
            // If a user has "Vocal (Global)" AND "Vocal (Block A)", we only want to show "Vocal (Block A)".

            // 1. Group by Role ID
            const rolesById = new Map();
            rawRoles.forEach(r => {
                if (!rolesById.has(r.id)) rolesById.set(r.id, []);
                rolesById.get(r.id).push(r);
            });

            const finalRolesList = [];
            rolesById.forEach((roleList) => {
                // If this role type has ANY block-specific entries, filter out the global (null block) ones.
                const hasSpecific = roleList.some(r => r.block_id);
                if (hasSpecific) {
                    // Keep only specific ones
                    finalRolesList.push(...roleList.filter(r => r.block_id));
                } else {
                    // Keep the global one(s)
                    finalRolesList.push(...roleList);
                }
            });

            // 2. Final uniqueness check (by composite key) to be safe
            const uniqueRolesMap = new Map();
            finalRolesList.forEach(r => {
                const key = `${r.id}_${r.block_id || 'global'}`;
                if (!uniqueRolesMap.has(key)) {
                    uniqueRolesMap.set(key, r);
                }
            });
            const roles = Array.from(uniqueRolesMap.values());

            return {
                ...profile,   // Profile details
                roles: roles.length > 0 ? roles : [{ name: 'resident' }],  // Role details (array)
                unit_owners: userOwnerships,
                community_member_id: member.id,
                is_confirmed: isConfirmed,
                email: authUser?.email || profile.email,
                phone: profile.phone
            };
        });

        res.json({ data: users, count });
    } catch (err) {
        console.error("List users error:", err);
        res.status(500).json({ error: err.message });
    }
}

exports.inviteUser = async (req, res) => {
    const { email, fullName, roleName, unitIds, phone } = req.body;
    let communityId = req.headers['x-community-id'];

    // Handle potential duplicate headers (e.g. "id, id")
    if (communityId && communityId.includes(',')) {
        communityId = communityId.split(',')[0].trim();
    }

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        // 1. Verify Inviter's Permission in this Community
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token provided');

        const { data: { user: inviterUser }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !inviterUser) throw new Error('Invalid token');

        // Check if inviter is Admin/President/Secretary in this community
        // Also fetch Community Name for the email
        const { data: membership, error: memberError } = await supabaseAdmin
            .from('community_members')
            .select('roles(name), communities(name, logo_url)')
            .eq('profile_id', inviterUser.id)
            .eq('community_id', communityId)
            .single();

        if (memberError || !membership) throw new Error('Inviter is not a member of this community');

        // Helper to handle potential arrays from Supabase
        const inviterRoleData = Array.isArray(membership.roles) ? membership.roles[0] : membership.roles;
        // Check both array/object cases for communities
        const communityData = (membership.communities && Array.isArray(membership.communities))
            ? membership.communities[0]
            : (membership.communities || null);

        // Fallback: If communityData is missing (e.g. join failed), fetch it directly
        let finalCommunityName = communityData?.name;
        let finalCommunityLogo = communityData?.logo_url;

        if (!finalCommunityName) {
            console.log('Community Data missing in join, executing fallback fetch...');

            const { data: cData } = await supabaseAdmin
                .from('communities')
                .select('name, logo_url')
                .eq('id', communityId)
                .single();

            if (cData) {
                finalCommunityName = cData.name;
                finalCommunityLogo = cData.logo_url;
            }
        }

        const inviterRole = inviterRoleData?.name;

        const allowedRoles = ['super_admin', 'president', 'admin', 'secretary'];
        if (!allowedRoles.includes(inviterRole)) {
            throw new Error('Insufficient permissions to invite users');
        }

        const communityName = finalCommunityName || 'su comunidad';
        const communityLogo = finalCommunityLogo;

        // Determine the Base URL
        // Force https://habiio.com in production to avoid accidentally using localhost from a leaked .env file
        // Check for NODE_ENV, or Railway specific variables (RAILWAY_ENVIRONMENT, RAILWAY_GIT_COMMIT_SHA)
        const isProduction = process.env.NODE_ENV === 'production' ||
            !!process.env.RAILWAY_ENVIRONMENT ||
            !!process.env.RAILWAY_GIT_COMMIT_SHA;

        const baseUrl = isProduction ? 'https://habiio.com' : (process.env.CLIENT_URL || 'https://habiio.com');

        // 2. Check if user already exists
        let userId;
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingProfile) {
            userId = existingProfile.id;

            // Generate magic link for existing user to redirect to update-password
            // This allows them to easily sign in and update credentials if needed, or just access the app.
            const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
                options: {
                    redirectTo: baseUrl + '/login'
                }
            });

            const link = magicLinkData?.properties?.action_link || (baseUrl + '/login');

            // User exists: Send a notification email that they were added to a new community
            const sendEmail = require('../utils/sendEmail');
            await sendEmail({
                email: email,
                subject: `Bienvenido a ${communityName} - Admin Comunidad`,
                templateName: 'invitation.html',
                context: {
                    communityName: communityName,
                    communityLogo: communityLogo,
                    link: link
                }
            });

        } else {
            // User not in profiles. Check if in Auth (Zombie user?) or Brand new.
            let isNewUser = false;
            let linkActionLink = null;

            // Attempt to get user via generateLink (invite/recovery) to check existence.
            try {
                const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'invite', // 'invite' creates a link to confirm/set password
                    email: email,
                    options: { redirectTo: (process.env.CLIENT_URL || 'https://habiio.com') + '/update-password' }
                });

                if (inviteError || !inviteData.user) {
                    throw new Error('User not found');
                }

                // User FOUND in Auth!
                userId = inviteData.user.id;
                linkActionLink = inviteData.properties.action_link;

            } catch (checkErr) {
                // User really doesn't exist (or generateLink failed), create them.
                isNewUser = true;

                try {
                    // Standard create user with email_confirm: true (as it likely was before)
                    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                        email: email,
                        email_confirm: true,
                        user_metadata: {
                            full_name: fullName,
                            is_admin_registration: false,
                            community_id: communityId
                        }
                    });

                    if (createError) throw createError;
                    userId = userData.user.id;

                    // Generate Link
                    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                        type: 'invite',
                        email: email,
                        options: {
                            redirectTo: baseUrl + '/update-password'
                        }
                    });

                    if (linkError) throw linkError;
                    linkActionLink = linkData.properties.action_link;

                } catch (creationError) {
                    // Check if error is "email_exists" (user already in Auth but not in Profiles/Zombie)
                    if (creationError?.code === 'email_exists' || creationError?.status === 422) {
                        try {
                            // Recover: fetch User ID by generating a magic link (which returns user object)
                            const { data: magicData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
                                type: 'magiclink',
                                email: email,
                                options: {
                                    redirectTo: baseUrl + '/login'
                                }
                            });

                            if (magicError || !magicData.user) {
                                throw creationError; // Re-throw original if recovery fails
                            }

                            userId = magicData.user.id;
                            linkActionLink = magicData.properties.action_link;

                        } catch (recoveryError) {
                            console.error("Recovery Failed:", recoveryError);
                            throw creationError;
                        }
                    } else {
                        console.error("Create User Failed:", creationError);
                        throw creationError;
                    }
                }
            }

            // Send Custom Email
            if (linkActionLink) {
                const sendEmail = require('../utils/sendEmail');
                await sendEmail({
                    email: email,
                    from: `${communityName} <info@habiio.com>`,
                    subject: `Invitación a ${communityName}`,
                    templateName: 'invitation.html',
                    context: {
                        communityName: communityName,
                        communityLogo: communityLogo,
                        link: linkActionLink
                    }
                });
            }

            // Ensure profile exists AND update metadata to ensures name is synced
            if (userId) {
                // Sync metadata specifically for recovered/zombie users who might have empty metadata
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        full_name: fullName
                    }
                });

                await supabaseAdmin.from('profiles').upsert({
                    id: userId,
                    email: email,
                    full_name: fullName,
                    phone: phone || null
                });
            }
        }

        // 4. Add to community_members
        // Find role ID
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('name', roleName || 'neighbor')
            .single();

        if (roleError) throw roleError;

        // Insert into community_members (upsert to handle existing members)
        const { data: memberData, error: memberInsertError } = await supabaseAdmin
            .from('community_members')
            .upsert({
                profile_id: userId,
                community_id: communityId,
                role_id: roleData.id // Keep for backwards compatibility
            }, { onConflict: 'profile_id,community_id' })
            .select('id')
            .single();

        if (memberInsertError) throw memberInsertError;

        // Insert into member_roles table (new multi-role system)
        if (memberData) {
            // First, remove any existing roles for this member (to avoid duplicates)
            await supabaseAdmin
                .from('member_roles')
                .delete()
                .eq('member_id', memberData.id)
                .is('block_id', null);

            // Insert the new role
            const { error: roleInsertError } = await supabaseAdmin
                .from('member_roles')
                .insert({
                    member_id: memberData.id,
                    role_id: roleData.id
                });

            if (roleInsertError) throw roleInsertError;
        }

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

        res.status(201).json({ message: `Invitation sent to ${email}`, userId: userId });

    } catch (err) {
        console.error("Invite error:", err);
        res.status(400).json({ error: err.message });
    }
}

exports.updateUser = async (req, res) => {
    const { id } = req.params; // potentially the community_member_id or profile_id
    // Ideally we pass profile_id. Let's assume ID is profile_id for now as it's standard.
    const { roleName, roleNames, unitIds, fullName, phone } = req.body;
    let communityId = req.headers['x-community-id'];
    if (communityId && communityId.includes(',')) communityId = communityId.split(',')[0].trim();

    try {
        // PERMISSION CHECK
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token provided');

        const { data: { user: requester }, error: permAuthError } = await supabase.auth.getUser(token);
        if (permAuthError || !requester) throw new Error('Invalid token');

        // Check if requester is Admin/President in this community
        const { data: membership, error: memberError } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', requester.id)
            .eq('community_id', communityId)
            .single();

        if (memberError || !membership) throw new Error('Insufficient permissions: Not a member');

        const requesterRole = Array.isArray(membership.roles) ? membership.roles[0]?.name : membership.roles?.name;
        if (!['super_admin', 'admin', 'president'].includes(requesterRole)) {
            throw new Error('Insufficient permissions to update users');
        }

        // Update Profile Name/Phone passed
        if (fullName || phone !== undefined) {
            const updates = {};
            if (fullName) updates.full_name = fullName;
            if (phone !== undefined) updates.phone = phone;

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(updates)
                .eq('id', id);

            if (profileError) throw profileError;
        }

        // Support both roleNames (array) and roleName (single) for backwards compatibility
        const roleNamesToUse = roleNames || (roleName ? [roleName] : null);

        // Find role IDs if roleNames is provided
        let roleIds = [];
        if (roleNamesToUse && roleNamesToUse.length > 0) {
            // CHECK PRIVILEGES: Only Super Admin (is_admin_registration) can change roles
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw new Error('No token provided');

            const { data: { user: requester }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !requester) throw new Error('Invalid token');

            if (requester.user_metadata?.is_admin_registration !== true) {
                // If not super admin, check if they are trying to change role
                // Strict restriction: explicit role change requires privileges.
                return res.status(403).json({ error: 'Only the Super Admin can change user roles.' });
            }

            // Fetch all role IDs for the given role names
            const { data: rolesData, error: rolesError } = await supabaseAdmin
                .from('roles')
                .select('id, name')
                .in('name', roleNamesToUse);

            if (rolesError) throw rolesError;
            roleIds = rolesData.map(r => r.id);
        }

        // Update Community Member Roles (using member_roles table)
        if (roleIds.length > 0) {
            // First, get the member_id from community_members
            const { data: memberData, error: memberError } = await supabaseAdmin
                .from('community_members')
                .select('id')
                .eq('profile_id', id)
                .eq('community_id', communityId)
                .single();

            if (memberError) throw memberError;

            if (memberData) {
                // Delete existing roles for this member (except block-specific vocal roles)
                await supabaseAdmin
                    .from('member_roles')
                    .delete()
                    .eq('member_id', memberData.id)
                    .is('block_id', null); // Only delete non-block roles

                // Insert all new roles
                if (roleIds.length > 0) {
                    const inserts = roleIds.map(roleId => ({
                        member_id: memberData.id,
                        role_id: roleId
                    }));

                    const { error: insertError } = await supabaseAdmin
                        .from('member_roles')
                        .insert(inserts);

                    if (insertError) throw insertError;
                }
            }
        }

        // Update Units
        if (unitIds !== undefined) {
            // 1. Get IDs of units in this community to identify which ownerships to delete
            // We want to delete ownerships where unit -> block -> community_id = current
            // Update Units if provided (handle assignment/unassignment logic?)
            // For simplicity, we might just wipe and re-insert or diff.
            // Current logic in frontend sends FULL list of assigned unit IDs.
            // So we can: delete all *for this community* and re-insert.

            // CAUTION: Removing all unit_owners for this user might remove units from OTHER communities if we don't filter by community units.
            // Ideally we check which units belong to this community.
            if (unitIds) {
                const { data: communityUnits } = await supabaseAdmin
                    .from('units')
                    .select('id, blocks!inner(community_id)')
                    .eq('blocks.community_id', communityId);

                const communityUnitIds = communityUnits.map(u => u.id);

                // Delete existing for this user AND this community's units
                await supabaseAdmin
                    .from('unit_owners')
                    .delete()
                    .eq('profile_id', id)
                    .in('unit_id', communityUnitIds);

                if (unitIds.length > 0) {
                    const inserts = unitIds.map(uid => ({
                        profile_id: id,
                        unit_id: uid,
                        is_primary: false // default
                    }));
                    await supabaseAdmin.from('unit_owners').insert(inserts);
                }
            }
        }

        res.json({ message: 'User updated successfully' });

    } catch (err) {
        console.error("Update user error:", err);
        res.status(400).json({ error: err.message });
    }
}

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    let communityId = req.headers['x-community-id'];
    if (communityId && communityId.includes(',')) communityId = communityId.split(',')[0].trim();

    if (!communityId) {
        return res.status(400).json({ error: 'Community ID is required' });
    }

    try {
        // PERMISSION CHECK
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token provided');

        const { data: { user: requester }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !requester) throw new Error('Invalid token');

        const { data: membership, error: permError } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', requester.id)
            .eq('community_id', communityId)
            .single();

        if (permError || !membership) throw new Error('Insufficient permissions');

        const requesterRole = Array.isArray(membership.roles) ? membership.roles[0]?.name : membership.roles?.name;
        if (!['super_admin', 'admin', 'president'].includes(requesterRole)) {
            throw new Error('Insufficient permissions to delete users');
        }

        // 1. Unassign units belonging to this community
        const { data: communityUnits } = await supabaseAdmin
            .from('units')
            .select('id, blocks!inner(community_id)')
            .eq('blocks.community_id', communityId);

        if (communityUnits && communityUnits.length > 0) {
            const communityUnitIds = communityUnits.map(u => u.id);
            await supabaseAdmin
                .from('unit_owners')
                .delete()
                .eq('profile_id', id)
                .in('unit_id', communityUnitIds);
        }

        // 2. Remove from community_members
        const { error: memberError } = await supabaseAdmin
            .from('community_members')
            .delete()
            .eq('profile_id', id)
            .eq('community_id', communityId);

        if (memberError) throw memberError;

        res.json({ message: 'User removed from community successfully' });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

exports.resendInvitation = async (req, res) => {
    const { id } = req.params; // userId (profile_id)
    let communityId = req.headers['x-community-id'];
    if (communityId && communityId.includes(',')) communityId = communityId.split(',')[0].trim();

    if (!communityId) return res.status(400).json({ error: 'Community ID required' });

    try {
        // PERMISSION CHECK
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token provided');

        const { data: { user: requester }, error: permAuthError } = await supabase.auth.getUser(token);
        if (permAuthError || !requester) throw new Error('Invalid token');

        const { data: membership, error: permError } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', requester.id)
            .eq('community_id', communityId)
            .single();

        if (permError || !membership) throw new Error('Insufficient permissions');

        const requesterRole = Array.isArray(membership.roles) ? membership.roles[0]?.name : membership.roles?.name;
        // Allows secretary as well for resending invites
        if (!['super_admin', 'admin', 'president', 'secretary'].includes(requesterRole)) {
            throw new Error('Insufficient permissions to resend invitations');
        }

        // 1. Fetch User Profile & Auth
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
        if (authError || !user) throw new Error('User not found');

        // Check confirmation (Optional: allow resend anyway if they lost password, but user asked for "if not set")
        // But "resend INVITATION" usually implies they haven't joined. 
        // If they HAVE joined, we should maybe send a password reset instead?
        // For simplicity and matching "Invite" flow, we send a Magic Link (which acts as both).

        // 2. Fetch Community Details
        const { data: community } = await supabaseAdmin
            .from('communities')
            .select('name, logo_url')
            .eq('id', communityId)
            .single();

        const communityName = community?.name || 'su comunidad';
        const communityLogo = community?.logo_url;

        // 3. Generate Magic Link (Redirect to update-password)
        const baseUrl = (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT)
            ? 'https://habiio.com'
            : (process.env.CLIENT_URL || 'https://habiio.com');

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: user.email,
            options: {
                redirectTo: baseUrl + '/update-password'
            }
        });

        if (linkError) throw linkError;

        const link = linkData.properties.action_link;

        // 4. Send Email
        const sendEmail = require('../utils/sendEmail');
        await sendEmail({
            email: user.email,
            from: `${communityName} <info@habiio.com>`,
            subject: `Invitación a ${communityName} (Reenvío)`,
            templateName: 'invitation.html',
            context: {
                communityName: communityName,
                communityLogo: communityLogo,
                link: link
            }
        });

        res.json({ message: 'Invitation resent successfully' });

    } catch (err) {
        console.error("Resend invite error:", err);
        res.status(400).json({ error: err.message });
    }
}

exports.deleteAccount = async (req, res) => {
    const { id } = req.params;

    try {
        // Security Check: Only allow deleting SELF or strictly Super Admin (future)
        // For now, strictly enforce that the requester is deleting their own account.
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

        if (user.id !== id) {
            return res.status(403).json({ error: 'You can only delete your own account.' });
        }

        // Additional Safety: Check if they are actually an admin registration (subscriber)
        // The user requested "only the user who suscribes... should be able to see this button".
        // The endpoint should probably enforce this too to prevent accidental deletion by normal neighbors if they somehow hit this API.
        if (user.user_metadata?.is_admin_registration !== true) {
            return res.status(403).json({ error: 'Only subscriber accounts can perform self-deletion.' });
        }

        // Pre-Delete Cleanup: Nullify or Delete dependencies to avoid Foreign Key constraints (RESTRICT)
        // 1. Nullify 'created_by' in Campaigns
        await supabaseAdmin.from('campaigns').update({ created_by: null }).eq('created_by', id);

        // 2. Nullify 'created_by' in Notices
        await supabaseAdmin.from('notices').update({ created_by: null }).eq('created_by', id);

        // 3. Nullify 'created_by' in Polls
        await supabaseAdmin.from('polls').update({ created_by: null }).eq('created_by', id);

        // 4. Cleanup Reports (Try Set Null, if fails/not-nullable, Delete)
        // Reports usually require a user, so we might need to delete them if user goes away
        const { error: reportError } = await supabaseAdmin.from('reports').update({ user_id: null }).eq('user_id', id);
        if (reportError) {
            // If Set Null failed (e.g. Not Null constraint), Delete them
            await supabaseAdmin.from('reports').delete().eq('user_id', id);
        }

        // 1. Find all communities where this user is a super_admin (to cascade delete)
        const { data: adminMemberships } = await supabaseAdmin
            .from('community_members')
            .select(`
                community_id,
                roles!inner (name)
            `)
            .eq('profile_id', id)
            .eq('roles.name', 'super_admin');

        // 2. Explicitly remove Community Membership & Unit Ownership for SELF
        await supabaseAdmin.from('unit_owners').delete().eq('profile_id', id);
        await supabaseAdmin.from('community_members').delete().eq('profile_id', id);

        if (adminMemberships && adminMemberships.length > 0) {
            for (const membership of adminMemberships) {
                const commId = membership.community_id;

                // A. Delete All OTHER Members of this Community (Residents, etc.)
                const { data: otherMembers } = await supabaseAdmin
                    .from('community_members')
                    .select('profile_id')
                    .eq('community_id', commId)
                    .neq('profile_id', id);

                if (otherMembers && otherMembers.length > 0) {
                    for (const member of otherMembers) {
                        // SAFETY CHECK: Only delete Auth User if they have NO other community memberships
                        // We check how many memberships they have EXCLUDING the one being deleted.
                        const { count: otherMemCount } = await supabaseAdmin
                            .from('community_members')
                            .select('*', { count: 'exact', head: true })
                            .eq('profile_id', member.profile_id)
                            .neq('community_id', commId);

                        if (otherMemCount === 0) {
                            // Delete Auth User (Cascades to Profile, Unit Owners, etc.)
                            await supabaseAdmin.auth.admin.deleteUser(member.profile_id);
                        } else {
                            // Just remove from THIS community explicitly (though community deletion will also cascade)
                            await supabaseAdmin.from('community_members').delete().eq('profile_id', member.profile_id).eq('community_id', commId);
                        }
                    }
                }

                // B. Delete Community Assets (Blocks, Documents, etc.)
                // Explicitly delete everything to ensure no RESTRICT constraints fail

                // 1. Delete Dependencies of Blocks -> Units
                const { data: blocks } = await supabaseAdmin.from('blocks').select('id').eq('community_id', commId);
                const blockIds = blocks?.map(b => b.id) || [];

                if (blockIds.length > 0) {
                    // Delete Units in these blocks (and unit_owners via cascade or manual?)
                    // unit_owners usually reference units on delete cascade? Or profile? 
                    // We deleted profiles, so unit_owners might be gone if profile-bound. 
                    // But let's delete units which might have other ties.
                    await supabaseAdmin.from('unit_owners').delete().in('unit_id',
                        (await supabaseAdmin.from('units').select('id').in('block_id', blockIds)).data?.map(u => u.id) || []
                    );
                    await supabaseAdmin.from('units').delete().in('block_id', blockIds);
                }

                // 2. Delete Community Tables
                await supabaseAdmin.from('community_documents').delete().eq('community_id', commId);
                await supabaseAdmin.from('amenities').delete().eq('community_id', commId); // Cascades reservations
                await supabaseAdmin.from('reservations').delete().eq('community_id', commId); // Explicit safety
                await supabaseAdmin.from('reports').delete().eq('community_id', commId); // Explicit safety
                await supabaseAdmin.from('notices').delete().eq('community_id', commId);
                await supabaseAdmin.from('polls').delete().eq('community_id', commId); // Cascades options/votes?
                await supabaseAdmin.from('campaigns').delete().eq('community_id', commId);

                // Payments often track history. Deleting community deletes all payment records?
                // Yes, per "permanently delete... associated data".
                await supabaseAdmin.from('payments').delete().eq('community_id', commId);
                await supabaseAdmin.from('visits').delete().eq('community_id', commId);

                // 3. Delete Blocks
                await supabaseAdmin.from('blocks').delete().eq('community_id', commId);

                // C. Delete Community
                await supabaseAdmin.from('communities').delete().eq('id', commId);
            }
        }

        // Perform Deletion via Admin Client (Hard Delete)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (deleteError) throw deleteError;

        res.json({ message: 'Account deleted successfully' });

    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ error: err.message });
    }
}
