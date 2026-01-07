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

        // 2. Register User in Supabase Auth
        // Use signUp to create the user. 
        // IMPORTANT: In Supabase Dashboard, disable "Enable Confirm Email" to prevent default email, 
        // OR rely on the fact that we can send a DUPLICATE custom one.
        // Better approach: Use Admin API to generate link, but we first need the user to exist? 
        // Actually, signUp sends the email automatically if enabled. 
        // To control it completely, we should ideally use Admin API to createUser (no email sent by default usually if email confirm is off??) 
        // or just let signUp happen and THEN send our own? No, that causes double emails.
        // The standard way to 'Custom Email' is to DISABLE default emails in Supabase and send your own.
        // We will assume the user has disabled the default emails.

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    is_admin_registration: true
                },
            },
        });

        if (error) {
            // Cleanup ghost community
            await require('../config/supabaseAdmin').from('communities').delete().eq('id', communityId);
            throw error;
        }

        // 3. Generate Link and Send Custom Email
        // We need to generate the link using Admin API
        const { data: linkData, error: linkError } = await require('../config/supabaseAdmin').auth.admin.generateLink({
            type: 'signup',
            email: email,
            password: password, // For signup link generation sometimes needed if user not created yet? No, generateLink works for existing users too for 'signup' type (email verification)
            // Wait, generateLink type 'signup' Creates the user if they don't exist? No.
            // Actually 'signup' link type acts as a confirmation link.
        });

        if (linkError) {
            console.error("Link generation error:", linkError);
            // Proceed but warn? Or fail? failing is safer for consistency.
        } else if (linkData && linkData.properties && linkData.properties.action_link) {
            const sendEmail = require('../utils/sendEmail');
            await sendEmail({
                email: email,
                subject: 'Verifica tu correo - Admin Comunidad',
                templateName: 'email_verification.html',
                context: {
                    link: linkData.properties.action_link // The verification link
                }
            });
        }


        // 4. Create Profile (if not exists)
        // Note: data.user might be null if email confirmation is required and we are waiting? 
        // Supabase returns user object even if unconfirmed.
        if (data.user) {
            const { error: profileError } = await require('../config/supabaseAdmin')
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    email: email,
                    full_name: fullName
                })
                .select();

            if (profileError) console.error("Profile creation error:", profileError);

            // 5. Link User to Community as Admin
            // Fetch 'admin' role ID
            const { data: roleData } = await require('../config/supabaseAdmin')
                .from('roles')
                .select('id')
                .eq('name', 'admin')
                .single();

            if (roleData) {
                await require('../config/supabaseAdmin')
                    .from('community_members')
                    .insert({
                        profile_id: data.user.id,
                        community_id: communityId,
                        role_id: roleData.id
                    });
            }
        }

        res.status(201).json({
            message: 'Community and Admin created successfully. Please check your email to verify your account.',
            user: data.user,
            community: communityData
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(400).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`); // DEBUG

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

        // Fetch Communities and Roles
        const { data: communities, error: commError } = await require('../config/supabaseAdmin')
            .from('community_members')
            .select('*, communities(*), roles(*)')
            .eq('profile_id', data.user.id);

        if (commError) console.error("Community fetch error:", commError);

        // Fetch Units for this user
        const { data: units, error: unitsError } = await require('../config/supabaseAdmin')
            .from('unit_owners')
            .select('*, units(*, blocks(community_id))')
            .eq('profile_id', data.user.id);

        // Join units to communities
        const communitiesWithUnits = communities?.map(cm => {
            const communityUnits = units?.filter(u => u.units?.blocks?.community_id === cm.community_id) || [];
            return {
                ...cm,
                unit_owners: communityUnits
            };
        }) || [];

        res.status(200).json({
            message: 'Login successful',
            token: data.session.access_token,
            user: { ...data.user, profile },
            communities: communitiesWithUnits // Return list of communities with units attached
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
            .select('*, communities(*), roles(*)')
            .eq('profile_id', user.id);

        // Fetch Units for this user
        const { data: units, error: unitsError } = await require('../config/supabaseAdmin')
            .from('unit_owners')
            .select('*, units(*, blocks(community_id))')
            .eq('profile_id', user.id);

        // Join units to communities
        const communitiesWithUnits = communities
            ?.filter(cm => cm.communities)
            .map(cm => {
                const communityUnits = units?.filter(u => u.units?.blocks?.community_id === cm.community_id) || [];
                return {
                    ...cm,
                    unit_owners: communityUnits
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

        if (error || !user) throw new Error('Invalid or expired token');

        console.log(`Updating password for user: ${user.email} (${user.id})`); // DEBUG

        // 2. Update the password using Admin client (secure)
        const { error: updateError } = await require('../config/supabaseAdmin').auth.admin.updateUserById(
            user.id,
            { password: password }
        );

        if (updateError) {
            console.error("Update User By ID Error:", updateError); // DEBUG
            throw updateError;
        }
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error("Update password error:", err);
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
