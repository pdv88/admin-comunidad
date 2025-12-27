const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getMyCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token provided' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Verify membership
        const { data: member, error: memberError } = await supabase
            .from('community_members')
            .select('community_id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (memberError || !member) {
            return res.status(404).json({ error: 'Not a member of this community.' });
        }

        // Fetch community details
        const { data: community, error: commError } = await supabase
            .from('communities')
            .select('*')
            .eq('id', communityId)
            .single();

        if (commError) throw commError;

        res.json(community);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token provided' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        // 1. Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Check permission (Admin/President)
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member.' });

        if (!['admin', 'president'].includes(member.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized to update community settings.' });
        }

        const { name, address, bank_details } = req.body;

        // 3. Update Community
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (address !== undefined) updates.address = address;
        if (bank_details !== undefined) updates.bank_details = bank_details;

        const { data, error } = await supabaseAdmin
            .from('communities')
            .update(updates)
            .eq('id', communityId)
            .select();

        if (error) throw error;

        res.json(data[0]);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { name, address } = req.body;

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // 1. Create Community
        const { data: community, error: commError } = await supabaseAdmin
            .from('communities')
            .insert([{ name, address: address || '' }])
            .select()
            .single();

        if (commError) throw commError;

        // 2. Get Admin Role ID
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'admin')
            .single();

        if (roleError) throw new Error('Admin role not found');

        // 3. Add User as Admin Member
        const { error: memberError } = await supabaseAdmin
            .from('community_members')
            .insert([{
                community_id: community.id,
                profile_id: user.id,
                role_id: roleData.id
            }]);

        if (memberError) throw memberError;

        res.status(201).json(community);

    } catch (err) {
        console.error("Create Community Error:", err);
        res.status(400).json({ error: err.message });
    }
};
