const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getAll = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Fetch Membership & Roles
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                roles(name),
                profile:profile_id (
                     unit_owners(
                        unit_id,
                        units(
                            id,
                            block_id
                        )
                    )
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const role = member.roles?.name;
        const profile = member.profile; // joined profile data

        // Base Query
        let query = supabaseAdmin
            .from('notices')
            .select('*')
            .eq('community_id', communityId) // Filter by Community
            .order('created_at', { ascending: false });

        // RBAC Filtering - Block Level
        if (['admin', 'president', 'secretary', 'maintenance'].includes(role)) {
            // See ALL notices in this community
        } else {
            // Vocals and Residents: See Global (block_id IS NULL) + Their Blocks
            const myBlockIds = profile.unit_owners
                ?.map(uo => uo.units?.block_id)
                .filter(Boolean);

            if (myBlockIds && myBlockIds.length > 0) {
                query = query.or(`block_id.is.null,block_id.in.(${myBlockIds.join(',')})`);
            } else {
                query = query.is('block_id', null);
            }
        }

        const { data: notices, error } = await query;
        if (error) throw error;

        res.json(notices);
    } catch (err) {
        console.error('Get Notices Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { title, content, priority, block_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                roles(name),
                profile:profile_id (
                     unit_owners(units(block_id))
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const role = member.roles?.name;
        const profile = member.profile;

        // 1. Permission Check
        if (!['admin', 'president', 'secretary', 'vocal'].includes(role)) {
            return res.status(403).json({ error: 'Unauthorized to create notices' });
        }

        // 2. Scope Check
        let finalBlockId = block_id || null;

        if (role === 'vocal') {
            const vocalBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id);

            if (!finalBlockId) {
                if (vocalBlockIds.length === 1) {
                    finalBlockId = vocalBlockIds[0];
                } else {
                    return res.status(400).json({ error: 'Vocals must specify a block for the notice' });
                }
            }

            if (!vocalBlockIds.includes(finalBlockId)) {
                return res.status(403).json({ error: 'You can only post notices for your assigned blocks' });
            }
        }

        const { data: notice, error } = await supabaseAdmin
            .from('notices')
            .insert([{
                created_by: user.id,
                community_id: communityId,
                title,
                content,
                priority: priority || 'normal',
                block_id: finalBlockId
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(notice);

    } catch (err) {
        console.error('Create Notice Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });
        const role = member.roles?.name;

        if (['admin', 'president'].includes(role)) {
            const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);
            if (error) throw error;
        } else {
            const { data: notice } = await supabaseAdmin.from('notices').select('created_by').eq('id', id).single();
            if (!notice || notice.created_by !== user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);
            if (error) throw error;
        }

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
