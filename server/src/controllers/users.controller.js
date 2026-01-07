const supabase = require('../config/supabaseClient'); // Normal client for queries
const supabaseAdmin = require('../config/supabaseAdmin'); // Admin client for auth management
const randomstring = require('randomstring');

exports.listUsers = async (req, res) => {
    try {
        let communityId = req.headers['x-community-id'];

        // Handle duplicate headers (concatenated by comma)
        if (communityId && communityId.includes(',')) {
            communityId = communityId.split(',')[0].trim();
        }

        if (!communityId) {
            console.error(`[ListUsers] Error: Community ID Missing`);
            return res.status(400).json({ error: 'Community ID header missing' });
        }



        // 1. Fetch community members
        const { data: members, error: memberError } = await supabaseAdmin
            .from('community_members')
            .select(`
                *,
                profiles (*),
                roles ( name )
            `)
            .eq('community_id', communityId);

        if (memberError) {
            console.error(`[ListUsers] Member Query Error:`, memberError);
            throw memberError;
        }



        if (!members || members.length === 0) {
            // console.log(`[ListUsers] No members found for community ${communityId}`);
            return res.json([]);
        }

        const profileIds = members.map(m => m.profile_id);

        // 2. Fetch Unit Owners (and Units) for these profiles
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

        // 3. Fetch Auth Data for all profiles (to check 'email_confirmed_at')
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

        // 4. Map structure
        const users = members.map(member => {
            const profile = member.profiles || {};
            const authUser = authMap[member.profile_id];

            // Determine if confirmed
            // Refined Logic: User is confirmed only if they have logged in SINCE they were added to this community.
            // This handles cases where an old user is re-invited but hasn't accessed this community yet.
            const lastSign = authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null;
            const joinedAt = member.created_at ? new Date(member.created_at) : null;

            const isConfirmed = !!(lastSign && joinedAt && lastSign > joinedAt);

            // DEBUG: Print status for this user
            // console.log(`[UserStatus] ${profile.email} | LastSign: ${authUser?.last_sign_in_at} | Joined: ${member.created_at} | Confirmed: ${isConfirmed}`);

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
                role_id: member.role_id,
                is_confirmed: isConfirmed,
                email: authUser?.email || profile.email,
                phone: profile.phone
            };
        });

        res.json(users);
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

        const allowedRoles = ['president', 'admin', 'secretary'];
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
                    redirectTo: baseUrl + '/update-password'
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
                                    redirectTo: baseUrl + '/update-password'
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

        res.status(201).json({ message: `Invitation sent to ${email}`, userId: userId });

    } catch (err) {
        console.error("Invite error:", err);
        res.status(400).json({ error: err.message });
    }
}

exports.updateUser = async (req, res) => {
    const { id } = req.params; // potentially the community_member_id or profile_id
    // Ideally we pass profile_id. Let's assume ID is profile_id for now as it's standard.
    const { roleName, unitIds, fullName, phone } = req.body;
    let communityId = req.headers['x-community-id'];
    if (communityId && communityId.includes(',')) communityId = communityId.split(',')[0].trim();

    try {
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

        // Find role ID if roleName is provided
        let roleId = null;
        if (roleName) {
            // CHECK PRIVILEGES: Only Super Admin (is_admin_registration) can change roles
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw new Error('No token provided');

            const { data: { user: requester }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !requester) throw new Error('Invalid token');

            if (requester.user_metadata?.is_admin_registration !== true) {
                // If not super admin, check if they are trying to change role
                // Fetch current role to see if it's actually changing? 
                // Or just blanket deny any roleName field presence?
                // For simplicity, strict restriction: explicit role change requires privileges.
                return res.status(403).json({ error: 'Only the Super Admin can change user roles.' });
            }

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

        // Perform Deletion via Admin Client (Hard Delete)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (deleteError) throw deleteError;

        res.json({ message: 'Account deleted successfully' });

    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ error: err.message });
    }
}
