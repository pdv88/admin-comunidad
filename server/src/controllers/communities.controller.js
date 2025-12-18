const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getMyCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        const userId = user.id;

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
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        // 1. Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        const userId = user.id;
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('community_id, roles(name)')
            .eq('id', userId)
            .single();

        if (!profile?.community_id) return res.status(404).json({ error: 'No community linked.' });

        // Check permission (Admin/President)
        if (!['admin', 'president'].includes(profile.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized to update community settings.' });
        }

        const { name, address, bank_details } = req.body;

        // 3. Update Community
        const updates = {};
        if (name) updates.name = name;
        if (address) updates.address = address;
        if (bank_details) updates.bank_details = bank_details;

        const { data, error } = await supabaseAdmin
            .from('communities')
            .update(updates)
            .eq('id', profile.community_id)
            .select();

        if (error) throw error;

        res.json(data[0]);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
