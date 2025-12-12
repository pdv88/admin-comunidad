const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getMyCommunity = async (req, res) => {
    const userId = req.user.id; // Assumes middleware populates req.user

    try {
        // 1. Get user's community_id from profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('community_id')
            .eq('id', userId)
            .single();

        if (profileError || !profile?.community_id) {
            return res.status(404).json({ error: 'Community not found for this user.' });
        }

        // 2. Fetch community details
        const { data: community, error: commError } = await supabase
            .from('communities')
            .select('*')
            .eq('id', profile.community_id)
            .single();

        if (commError) throw commError;

        res.json(community);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCommunity = async (req, res) => {
    const userId = req.user.id;
    const { name, address } = req.body;

    try {
        // 1. Verify user is Admin (middleware should handle, but double check)
        // We can trust the RBAC middleware if applied.

        // 2. Get user's community_id
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('community_id')
            .eq('id', userId)
            .single();

        if (!profile?.community_id) return res.status(404).json({ error: 'No community linked.' });

        // 3. Update Community
        const { data, error } = await supabaseAdmin
            .from('communities')
            .update({ name, address })
            .eq('id', profile.community_id)
            .select();

        if (error) throw error;

        res.json(data[0]);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
