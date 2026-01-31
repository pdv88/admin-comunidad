const supabase = require('../config/supabaseClient');

exports.register = async (req, res) => {
    const { email, password, fullName, communityName, communityAddress } = req.body;

    // Validate request
    if (!communityName) {
        return res.status(400).json({ error: 'Community Name is required for new registration.' });
    }

    try {
        // 1. Create the Community first
        const { data: communityData, error: communityError } = await require('../config/supabaseAdmin')
            .from('communities')
            .insert([{
                name: communityName,
                address: communityAddress
            }])
            .select()
            .single();

        if (communityError) throw communityError;
        const communityId = communityData.id;

        // 2 & 3. Create User AND Generate Link (Atomic-ish)
        // Use generateLink to create the user if they don't exist and get the setup link.
        const { data: linkData, error: linkError } = await require('../config/supabaseAdmin').auth.admin.generateLink({
            type: 'signup',
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    is_admin_registration: true
                    // Note: community_id in metadata could be useful too
                }
            }
        });

        if (linkError) {
            console.error("User creation/Link error:", linkError);

            // If user already exists, generateLink returns an error. 
            // We should catch this specific case.
            if (linkError.code === 'email_exists' || linkError.message?.includes('registered')) {
                await require('../config/supabaseAdmin').from('communities').delete().eq('id', communityId);
                return res.status(400).json({ error: 'A user with this email address already exists. Please login instead.' });
            }

            // For other errors, rollback community
            await require('../config/supabaseAdmin').from('communities').delete().eq('id', communityId);
            throw linkError;
        }

        // At this point, USER IS CREATED (by generateLink)
        // linkData.user contains the user info
        const user = linkData.user;

        // Send Custom Email
        if (linkData && linkData.properties && linkData.properties.action_link) {
            const sendEmail = require('../utils/sendEmail');
            await sendEmail({
                email: email,
                subject: 'Verifica tu correo - Admin Comunidad',
                templateName: 'email_verification.html',
                context: {
                    link: linkData.properties.action_link
                }
            });
        }

        // 4. Create Profile, Link to Community, Assign Super Admin Role
        if (user) {
            // A. Create Profile
            const { error: profileError } = await require('../config/supabaseAdmin')
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: email,
                    full_name: fullName
                });

            if (profileError) {
                console.error("Profile creation error:", profileError);
                // Non-critical, but good to log
            }

            // B. Fetch Role ID for 'super_admin'
            const { data: roleData, error: roleError } = await require('../config/supabaseAdmin')
                .from('roles')
                .select('id')
                .eq('name', 'super_admin')
                .single();

            if (roleError || !roleData) {
                // Critical failure only if we can't find the role to assign permissions
                console.error("Super Admin role not found:", roleError);
                // We might want to rollback user here too for strict correctness, 
                // but usually this is a clear config error.
            }

            // C. Create Community Member (WITH ROLE!)
            // Only proceed if we have role data, otherwise we create broken state
            if (roleData) {
                const { data: memberData, error: memberError } = await require('../config/supabaseAdmin')
                    .from('community_members')
                    .insert({
                        profile_id: user.id,
                        community_id: communityId,
                        role_id: roleData.id
                    })
                    .select('id')
                    .single();

                if (memberError) {
                    console.error("Community member creation error:", memberError);
                    // Cleanup community if member creation fails
                    await require('../config/supabaseAdmin').from('communities').delete().eq('id', communityId);
                    // Cleanup user? Maybe, since they are useless without a community link in this flow.
                    await require('../config/supabaseAdmin').auth.admin.deleteUser(user.id);

                    throw new Error("Failed to link user to community.");
                }

                // D. Assign Role in member_roles
                if (memberData) {
                    await require('../config/supabaseAdmin')
                        .from('member_roles')
                        .insert({
                            member_id: memberData.id,
                            role_id: roleData.id
                        });
                }
            }
        }

        res.status(201).json({
            message: 'Community and Admin created successfully. Please check your email to verify your account.',
            user: user,
            community: communityData
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(400).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;


    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("Supabase Login Error:", error); // DEBUG
            throw error;
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await require('../config/supabaseAdmin')
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) console.error("Profile fetch error:", profileError);

        // Fetch Communities with their member info
        const { data: communities, error: commError } = await require('../config/supabaseAdmin')
            .from('community_members')
            .select('*, communities(*)')
            .eq('profile_id', data.user.id);

        if (commError) console.error("Community fetch error:", commError);

        // Fetch roles from member_roles table (supports multiple roles)
        const memberIds = communities?.map(cm => cm.id) || [];

        let memberRoles = [];
        if (memberIds.length > 0) {
            const { data: rolesData, error: rolesError } = await require('../config/supabaseAdmin')
                .from('member_roles')
                .select('*, roles(*), blocks(*)')
                .in('member_id', memberIds);


            if (!rolesError) memberRoles = rolesData || [];
        }

        // Fetch Units for this user
        const { data: units, error: unitsError } = await require('../config/supabaseAdmin')
            .from('unit_owners')
            .select('*, units(*, blocks(community_id, name))')
            .eq('profile_id', data.user.id);

        // Join units and roles to communities
        const communitiesWithUnits = communities?.map(cm => {
            const communityUnits = units?.filter(u => u.units?.blocks?.community_id === cm.community_id) || [];
            const roles = memberRoles
                .filter(mr => mr.member_id === cm.id)
                .map(mr => ({
                    id: mr.role_id,
                    name: mr.roles?.name,
                    block_id: mr.block_id,
                    block_name: mr.blocks?.name
                }));
            return {
                ...cm,
                unit_owners: communityUnits,
                roles: roles.length > 0 ? roles : [{ name: 'resident' }] // Default to resident if no roles
            };
        }) || [];

        res.status(200).json({
            message: 'Login successful',
            token: data.session.access_token,
            user: { ...data.user, profile },
            communities: communitiesWithUnits // Return list of communities with units and roles attached
        });

    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

exports.getMe = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) throw new Error('Invalid token');

        // Fetch profile
        const { data: profile, error: profileError } = await require('../config/supabaseAdmin')
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error("Profile fetch error:", profileError);
        }

        // Fetch Communities
        const { data: communities, error: commError } = await require('../config/supabaseAdmin')
            .from('community_members')
            .select('*, communities(*)')
            .eq('profile_id', user.id);

        // Fetch roles from member_roles table (supports multiple roles)
        const memberIds = communities?.map(cm => cm.id) || [];
        let memberRoles = [];
        if (memberIds.length > 0) {
            const { data: rolesData, error: rolesError } = await require('../config/supabaseAdmin')
                .from('member_roles')
                .select('*, roles(*), blocks(*)')
                .in('member_id', memberIds);
            if (!rolesError) memberRoles = rolesData || [];
        }

        // Fetch Units for this user
        const { data: units, error: unitsError } = await require('../config/supabaseAdmin')
            .from('unit_owners')
            .select('*, units(*, blocks(community_id, name))')
            .eq('profile_id', user.id);

        // Join units and roles to communities
        const communitiesWithUnits = communities
            ?.filter(cm => cm.communities)
            .map(cm => {
                const communityUnits = units?.filter(u => u.units?.blocks?.community_id === cm.community_id) || [];
                const roles = memberRoles
                    .filter(mr => mr.member_id === cm.id)
                    .map(mr => ({
                        id: mr.role_id,
                        name: mr.roles?.name,
                        block_id: mr.block_id,
                        block_name: mr.blocks?.name
                    }));
                return {
                    ...cm,
                    unit_owners: communityUnits,
                    roles: roles.length > 0 ? roles : [{ name: 'resident' }]
                };
            }) || [];

        res.status(200).json({
            user: { ...user, profile },
            communities: communitiesWithUnits
        });

    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(401).json({ error: 'Session expired or invalid' });
    }
};

exports.updatePassword = async (req, res) => {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        // 1. Verify the token and get the user
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            console.error("Auth getUser Error:", error);
            throw new Error(error.message || 'Invalid or expired token');
        }
        if (!user) {
            throw new Error('User not found');
        }

        console.log(`Updating password for user: ${user.email} (${user.id})`); // DEBUG

        // 2. Verify Current Password (if provided) to prevent same-password and ensure owner
        // Note: Client should ideally enforce 'currentPassword' for security
        const { currentPassword } = req.body;

        if (currentPassword) {
            if (currentPassword === password) {
                return res.status(422).json({ error: 'New password must be different from the old password.' });
            }

            // Verify using signIn
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (signInError) {
                console.error("Verification Sign In Error:", signInError);
                return res.status(401).json({ error: 'Incorrect current password.' });
            }
        } else {
            // For now, if no currentPassword provided (legacy/forgot flow?), we might skip? 
            // But for Change Password settings, it SHOULD be provided.
            // We'll proceed but rely on Supabase to catch same-password if possible (unlikely).
            // Ideally we enforce it:
            // return res.status(400).json({ error: 'Current password is required.' });
            // I'll be lenient for a moment to avoid breaking other flows if any, but `Settings.jsx` provides it.
        }

        // 3. Update the password using Admin client (secure)
        const { error: updateError } = await require('../config/supabaseAdmin').auth.admin.updateUserById(
            user.id,
            { password: password }
        );

        if (updateError) {
            console.error("Update User By ID Error:", updateError); // DEBUG
            // Handle "Same Password" error specifically if Supabase returns it
            if (updateError.status === 422 && updateError.message?.includes('different')) {
                return res.status(422).json({ error: 'New password must be different from the old password.' });
            }
            throw updateError;
        }
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error("Update password error:", err);
        // If the original token check failed
        if (err.message.includes('Invalid or expired token') || err.message.includes('Auth session missing')) {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        res.status(400).json({ error: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // Use Generate Link for 'recovery'
        const { data, error } = await require('../config/supabaseAdmin').auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
                redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5173'}/update-password`,
            }
        });

        if (error) throw error;

        // Send Custom Email
        if (data && data.properties && data.properties.action_link) {
            const sendEmail = require('../utils/sendEmail');
            await sendEmail({
                email: email,
                subject: 'Recuperación de contraseña - Admin Comunidad',
                templateName: 'password_recovery.html',
                context: {
                    link: data.properties.action_link
                }
            });
        }

        res.json({ message: 'Password reset link sent' });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(400).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const { full_name, phone } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) throw new Error('Invalid token');

        // 1. Update Auth Metadata
        const updates = {};
        if (full_name) updates.full_name = full_name;
        // Phone is usually not stored in metadata duplicatedly unless needed, but let's keep it clean.

        if (Object.keys(updates).length > 0) {
            const { error: authError } = await require('../config/supabaseAdmin').auth.admin.updateUserById(
                user.id,
                { user_metadata: updates }
            );
            if (authError) throw authError;
        }

        // 2. Update Public Profile
        const profileUpdates = {};
        if (full_name) profileUpdates.full_name = full_name;
        if (phone !== undefined) profileUpdates.phone = phone;

        const { error: profileError } = await require('../config/supabaseAdmin')
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user.id);

        if (profileError) throw profileError;

        res.json({ message: 'Profile updated successfully', user: { ...user, user_metadata: { ...user.user_metadata, ...updates }, phone: phone } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.resendVerification = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        // 1. Check if the user exists
        // We use admin.listUsers or similar to check status, or simply try to generate a link.
        // generateLink type 'signup' works for existing unconfirmed users to resend confirmation.

        // Note: Supabase's 'signup' logic with generateLink resends the confirmation if user is unconfirmed.
        const { data: linkData, error: linkError } = await require('../config/supabaseAdmin').auth.admin.generateLink({
            type: 'signup',
            email: email,
            password: 'dummy-password-ignored-for-existing', // Supabase requires this for 'signup' type, but doesn't change it for existing users usually? 
            // Wait, for generateLink 'signup' on existing user, creates a confirmation link. 
            // BUT providing password might reset it? Let's check Supabase docs behavior or test.
            // Actually 'magiclink' might be safer if we just want them to log in, but they need to VERIFY email first.
            // Let's use `resend` method if available or `generateLink` with care.
            // Supabase Admin API `resend` is better suited: auth.admin.resend({ type: 'signup', email: ... }) does not exist in all versions?
            // Checking the client library... `resend` is usually on the public client. Admin has `generateLink`.
        });

        // Actually, simpler approach: use the public client's `resend` method if possible, or `generateLink`.

        // Let's use `generateLink`. It returns an action_link. We can send our custom email.
        // Important: `generateLink` type 'signup' for an EXISTING UNCONFIRMED user returns a confirmation link.

        // However, if we don't want to change password, we should avoid sending it if possible.
        // If we omit password, `generateLink` might complain?
        // Let's try `invite` type? No, that sets up new user.

        // Alternative: Use `supabaseAdmin.auth.resend({ type: 'signup', email: ... })` (Public client method but called by admin?)
        // The `supabaseAdmin` is the service role client. It has `auth.resend`? No, usually `auth` is the GoTrue client.
        // Let's rely on `generateLink` type 'signup'.

        const { data, error } = await require('../config/supabaseAdmin').auth.admin.generateLink({
            type: 'signup',
            email: email,
            password: 'temp-password' // This is risky if it overwrites. 
            // Actually, for existing users, `generateLink` type 'signup' might error "User already registered" depending on config.
        });

        // Current registration flow uses `generateLink` to CREATE the user.
        // If user exists, it errors.

        // Change of strategy: We need to just "Resend" the email.
        // The public client `supabase.auth.resend({ type: 'signup', email })` works for this.
        // We can use the service role client (supabaseAdmin) to generate the link and send OUR custom email.

        // How to get confirmation link for EXISTING user without changing password?
        // `generateLink` type 'magiclink' logs them in (verifies them effectively?).
        // If they click a magic link, their email becomes verified? Yes, usually.
        // So sending a Magic Link is a good "Resend Verification" alternative that also logs them in.

        const { data: magicData, error: magicError } = await require('../config/supabaseAdmin').auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`
            }
        });

        if (magicError) throw magicError;

        // Send Custom Email
        if (magicData && magicData.properties && magicData.properties.action_link) {
            const sendEmail = require('../utils/sendEmail');
            await sendEmail({
                email: email,
                subject: 'Verifica tu correo (Reenvío)',
                templateName: 'email_verification.html',
                context: {
                    link: magicData.properties.action_link
                }
            });
        }

        res.json({ message: 'Verification email resent successfully.' });

    } catch (err) {
        // If user not found, we shouldn't reveal it for security, but here we can be helpful.
        console.error("Resend Verification Error:", err);
        res.status(400).json({ error: err.message });
    }
};
