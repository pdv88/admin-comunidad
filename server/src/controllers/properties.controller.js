
const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get user and their role in the specific community
const getUserAndMember = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) throw new Error('No token provided');
    if (!communityId) throw new Error('Community ID header missing');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');

    const { data: member, error: memberError } = await supabaseAdmin
        .from('community_members')
        .select(`
roles(name),
    profile: profile_id(*)
        `)
        .eq('profile_id', user.id)
        .eq('community_id', communityId)
        .single();

    if (memberError || !member) throw new Error('Not a member of this community');

    return { user, member, communityId };
};

exports.getAllBlocks = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const communityId = req.headers['x-community-id'];

        if (!token) return res.status(401).json({ error: 'No token' });
        if (!communityId) return res.status(400).json({ error: 'Community ID missing' });

        // Basic verification
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // Fetch blocks for THIS community
        const { data, error } = await supabase
            .from('blocks')
            .select(`
        *,
        units(
                    *,
            profiles(*)
        )
            `)
            .eq('community_id', communityId)
            .order('name');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createBlock = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const blockData = { ...req.body, community_id: communityId };

        const { data, error } = await supabaseAdmin.from('blocks').insert([blockData]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Error creating block:", err);
        res.status(400).json({ error: err.message });
    }
};

exports.updateBlock = async (req, res) => {
    const { id } = req.params;
    const { representative_id } = req.body;

    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabaseAdmin
            .from('blocks')
            .update({ representative_id })
            .eq('id', id)
            .eq('community_id', communityId) // Safety check
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createUnit = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        if (member.roles.name !== 'admin' && member.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Ensure the block belongs to this community
        const { block_id } = req.body;
        console.log(`[CreateUnit] CommunityID: ${communityId}, BlockID: ${block_id}`);

        if (block_id) {
            const { data: block } = await supabaseAdmin.from('blocks').select('community_id').eq('id', block_id).single();
            console.log(`[CreateUnit] Fetched Block:`, block);

            if (!block || block.community_id !== communityId) {
                console.error(`[CreateUnit] Mismatch! Block Comm: ${block?.community_id} vs Header Comm: ${communityId}`);
                return res.status(400).json({ error: 'Invalid block or community mismatch' });
            }
        }

        const { data, error } = await supabaseAdmin.from('units').insert([req.body]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.assignUnitToUser = async (req, res) => {
    const { userId, unitId } = req.body;
    try {
        const { member, communityId } = await getUserAndMember(req);
        if (member.roles.name !== 'admin' && member.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Verify unit belongs to community
        const { data: unit } = await supabaseAdmin.from('units').select('block_id, blocks(community_id)').eq('id', unitId).single();
        if (!unit || unit.blocks?.community_id !== communityId) {
            return res.status(400).json({ error: 'Unit not in this community' });
        }

        // Check if unit is already assigned
        const { data: existingOwner } = await supabaseAdmin
            .from('unit_owners')
            .select('*')
            .eq('unit_id', unitId)
            .single();

        if (existingOwner && existingOwner.profile_id !== userId) {
            return res.status(400).json({ error: 'This unit is already assigned to another user.' });
        }

        // I will switch to `unit_owners` insertion.
        const { data, error } = await supabaseAdmin
            .from('unit_owners')
            .upsert({ profile_id: userId, unit_id: unitId, is_primary: true }) // Assuming schema
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);

        // Return members of this community only
        const { data, error } = await supabaseAdmin
            .from('community_members')
            .select('profile:profile_id(*)')
            .eq('community_id', communityId);

        if (error) throw error;
        // Flatten
        const users = data.map(m => m.profile);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.deleteBlock = async (req, res) => {
    const { id } = req.params;
    try {
        const { member, communityId } = await getUserAndMember(req);
        if (member.roles.name !== 'admin' && member.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { error } = await supabaseAdmin
            .from('blocks')
            .delete()
            .eq('id', id)
            .eq('community_id', communityId); // Scope

        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteUnit = async (req, res) => {
    const { id } = req.params;
    try {
        const { member, communityId } = await getUserAndMember(req);
        if (member.roles.name !== 'admin' && member.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Verify ownership/community via block?
        // Delete directly with strict check might be complex.
        // Fetch first.
        const { data: unit } = await supabaseAdmin.from('units').select('block_id, blocks(community_id)').eq('id', id).single();
        if (!unit || unit.blocks?.community_id !== communityId) {
            return res.status(403).json({ error: 'Unauthorized or not found' });
        }

        const { error } = await supabaseAdmin.from('units').delete().eq('id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateUnit = async (req, res) => {
    const { id } = req.params;
    const { tenant_name, tenant_email, tenant_phone } = req.body;

    try {
        const { member, communityId } = await getUserAndMember(req);
        if (member.roles.name !== 'admin' && member.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Verify community
        const { data: unit } = await supabaseAdmin.from('units').select('block_id, blocks(community_id)').eq('id', id).single();
        if (!unit || unit.blocks?.community_id !== communityId) {
            return res.status(403).json({ error: 'Unauthorized or not found' });
        }

        const { data, error } = await supabaseAdmin
            .from('units')
            .update({ tenant_name, tenant_email, tenant_phone })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
