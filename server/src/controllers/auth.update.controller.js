// Add this to auth.controller.js
exports.updatePassword = async (req, res) => {
    const { password } = req.body;

    // The user should have a valid session token in Authorization header
    // Supabase auth middleware usually handles this, putting user in req.user
    // But since we are using supabase directly, we can get the user from the token

    // For simplicity with this hybrid approach:
    // We assume the frontend passed a Bearer token.
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error) throw error;

        const { error: updateError } = await supabase.auth.updateUser({ password: password });
        if (updateError) throw updateError;

        res.json({ message: 'Password updated' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
