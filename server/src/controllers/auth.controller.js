const supabase = require('../config/supabaseClient');

exports.register = async (req, res) => {
    const { email, password, fullName } = req.body;

    try {
        // Register user in Supabase Auth
        // We pass a custom metadata 'role' to hint the trigger
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

        if (error) throw error;

        res.status(201).json({ message: 'User registered successfully. Please verify your email.', user: data.user });
    } catch (error) {
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

        if (error) throw error;

        // Fetch user profile with role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, roles(*)')
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
            .select('*, roles(*)')
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
        const { error: updateError } = await supabase.auth.updateUser({ password: password });
        if (updateError) throw updateError;
        res.json({ message: 'Password updated' });
    } catch (err) {
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
