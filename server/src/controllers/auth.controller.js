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
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    is_admin_registration: true
                    // community_id is no longer stored in metadata as primary link
                },
            },
        });

        if (error) {
            // Cleanup ghost community
            await require('../config/supabaseAdmin').from('communities').delete().eq('id', communityId);
            throw error;
        }

        // 3. Create Profile (if not exists)
        const { error: profileError } = await require('../config/supabaseAdmin')
            .from('profiles')
            .upsert({
                id: data.user.id,
                email: email,
                full_name: fullName
            })
            .select();

        if (profileError) console.error("Profile creation error:", profileError);

        // 4. Link User to Community as Admin
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

        res.status(201).json({
            message: 'Community and Admin created successfully.',
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

        res.status(200).json({
            message: 'Login successful',
            token: data.session.access_token,
            user: { ...data.user, profile },
            communities: communities || [] // Return list of communities
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
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error("Profile fetch error:", profileError);
        }

        // Fetch Communities
        const { data: communities, error: commError } = await supabase
            .from('community_members')
            .select('*, communities(*), roles(*)')
            .eq('profile_id', user.id);

        res.status(200).json({
            user: { ...user, profile },
            communities: communities || []
        });

    } catch (error) {
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
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:5173/update-password', // Assuming frontend is on 5173
        });
        if (error) throw error;
        res.json({ message: 'Password reset link sent' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const { full_name } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) throw new Error('Invalid token');

        // 1. Update Auth Metadata
        const { error: authError } = await supabase.auth.updateUser({
            data: { full_name }
        });
        if (authError) throw authError;

        // 2. Update Public Profile
        const { error: profileError } = await require('../config/supabaseAdmin')
            .from('profiles')
            .update({ full_name })
            .eq('id', user.id);

        if (profileError) throw profileError;

        res.json({ message: 'Profile updated successfully', user: { ...user, user_metadata: { ...user.user_metadata, full_name } } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
