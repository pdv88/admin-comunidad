const supabase = require('../config/supabaseClient');

const authenticateToken = async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // Token invalid or expired
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user to request for controllers to use
        req.user = user;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = authenticateToken;
