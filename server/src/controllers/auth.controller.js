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
                    is_admin_registration: true,
                    // Store community_id in metadata as backup/reference
                    community_id: communityId
                },
            },
        });

        if (error) {
            // Rollback community creation if auth fails? 
            // For MVP, we might leave a ghost community or try to delete it.
            // Let's try to cleanup.
            await require('../config/supabaseAdmin').from('communities').delete().eq('id', communityId);
            throw error;
        }

        // 3. Link User Profile to Community
        // We need to wait for trigger or manually update. 
        // Since we have supabaseAdmin and want to be sure, let's manually update/ensure.
        // If trigger creates profile, we update it. If not, we insert it.

        // Wait a moment for trigger? Or just use Upsert.
        // Let's use Upsert with the same ID.
        const { error: profileError } = await require('../config/supabaseAdmin')
            .from('profiles')
            .upsert({
                id: data.user.id,
                email: email,
                full_name: fullName,
                community_id: communityId,
                // Admin role usually has specific ID, but let's assume default trigger sets it or we set it here.
                // If this is a NEW community, this user MUST be an Admin.
                // We should probably set the role to 'admin' explicitly given they registered a new community.
                // Hardcoding admin role UUID for now or looking it up?
                // Better to look it up, but for speed let's assume the 'admin' role name logic or ID.
                // Let's just update community_id for now and rely on is_admin_registration logic or manual promotion if needed.
                // Actually, if they register a community, they SHOULD be admin.
            })
            .select();

        // Use a separate step to ensure Role is Admin if possible, but 'is_admin_registration' metadata 
        // might be used by a trigger to assign role.
        // If we don't have that trigger logic verified, we should manually set the role here.
        // Let's fetch the 'admin' role ID.
        const { data: roleData } = await require('../config/supabaseAdmin')
            .from('roles')
            .select('id')
            .eq('name', 'admin')
            .single();

        if (roleData) {
            await require('../config/supabaseAdmin')
                .from('profiles')
                .update({ role_id: roleData.id })
                .eq('id', data.user.id);
        }

        if (profileError) {
            console.error("Error linking profile to community:", profileError);
            // Non-fatal? The user exists.
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

        // Fetch user profile with role
        // Fetch user profile with role using Admin client to bypass RLS
        const { data: profile, error: profileError } = await require('../config/supabaseAdmin')
            .from('profiles')
            .select('*, roles(*), unit_owners(units(*, blocks(*)))')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error("Profile fetch error:", profileError);
        }

        res.status(200).json({
            message: 'Login successful',
            token: data.session.access_token,
            user: { ...data.user, profile }
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
            .select('*, roles(*), unit_owners(units(*, blocks(*)))')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error("Profile fetch error:", profileError);
        }



        res.status(200).json({
            user: { ...user, profile }
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
