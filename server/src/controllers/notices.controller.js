const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getAll = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Fetch User Profile & Roles
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select(`
                *,
                roles(name),
                unit_owners(
                    unit_id,
                    units(
                        id,
                        block_id
                    )
                )
            `)
            .eq('id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');

        const role = profile.roles?.name;

        // Base Query
        let query = supabaseAdmin
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });

        // RBAC Filtering
        if (['admin', 'president', 'secretary', 'maintenance'].includes(role)) {
            // See ALL notices (Global + All Blocks)
        } else {
            // Vocals and Residents: See Global (block_id IS NULL) + Their Blocks
            const myBlockIds = profile.unit_owners
                ?.map(uo => uo.units?.block_id)
                .filter(Boolean);

            if (myBlockIds && myBlockIds.length > 0) {
                // block_id IS NULL OR block_id IN (myBlockIds)
                query = query.or(`block_id.is.null,block_id.in.(${myBlockIds.join(',')})`);
            } else {
                // Only Global
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

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select(`*, roles(name), unit_owners(units(block_id))`)
            .eq('id', user.id)
            .single();

        const role = profile.roles?.name;

        // 1. Permission Check: Who can create notices?
        if (!['admin', 'president', 'secretary', 'vocal'].includes(role)) {
            return res.status(403).json({ error: 'Unauthorized to create notices' });
        }

        // 2. Scope Check: Can this user post to this scope?
        let finalBlockId = block_id || null; // Force null if undefined

        if (role === 'vocal') {
            // Vocals MUST post to a specific block they own
            const vocalBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id);

            if (!finalBlockId) {
                // If they didn't select one, and they have exactly one, default to it
                if (vocalBlockIds.length === 1) {
                    finalBlockId = vocalBlockIds[0];
                } else {
                    return res.status(400).json({ error: 'Vocals must specify a block for the notice' });
                }
            }

            // Verify they own the block they are posting to
            if (!vocalBlockIds.includes(finalBlockId)) {
                return res.status(403).json({ error: 'You can only post notices for your assigned blocks' });
            }
        }
        // Admins/Presidents can post Global (null) or Any Block (id) - no extra checks needed

        const { data: notice, error } = await supabaseAdmin
            .from('notices')
            .insert([{
                created_by: user.id,
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

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('roles(name)')
            .eq('id', user.id)
            .single();

        const role = profile.roles?.name;

        if (['admin', 'president'].includes(role)) {
            // Admin can delete any
            const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);
            if (error) throw error;
        } else {
            // Others (Vocal/Secretary) can only delete their own
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
