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

        // Fetch Membership
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                roles(name),
                profile:profile_id (
                     unit_owners(
                        unit_id,
                        units(
                            id,
                            unit_number,
                            block_id,
                            blocks(name)
                        )
                    )
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const role = member.roles?.name;
        const profile = member.profile;

        let query = supabaseAdmin
            .from('reports')
            .select(`
                *,
                profiles:user_id (full_name, email),
                units:unit_id (unit_number, blocks(name))
            `)
            .eq('community_id', communityId) // Filter by Community
            .order('created_at', { ascending: false });

        // RBAC Filtering
        if (['admin', 'president', 'maintenance', 'secretary'].includes(role)) {
            // See ALL reports in community
        } else if (role === 'vocal') {
            // See reports for their BLOCKS or their own reports
            const myBlockIds = profile.unit_owners
                ?.map(uo => uo.units?.block_id)
                .filter(Boolean);

            if (myBlockIds && myBlockIds.length > 0) {
                query = query.or(`block_id.in.(${myBlockIds.join(',')}),user_id.eq.${user.id}`);
            } else {
                query = query.eq('user_id', user.id);
            }
        } else {
            // Resident: See ONLY own reports
            query = query.eq('user_id', user.id);
        }

        const { data: reports, error } = await query;
        if (error) throw error;

        res.json(reports);
    } catch (err) {
        console.error('Get Reports Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { title, description, category, image_url, unit_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Verify membership? Assuming frontend sends correct ID, but better to check if user belongs.
        // For efficiency, we might skip full role check here if "create report" is allowed for all members.
        // But verifying membership prevents data injection into random communities.
        const { data: member } = await supabaseAdmin // Lightweight check
            .from('community_members')
            .select('id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member of this community' });

        // If unit_id provided, fetch block_id
        // If NO unit_id, check if block_id was sent explicitly (Block Scope)
        let block_id = req.body.block_id || null;

        if (unit_id) {
            const { data: unit } = await supabaseAdmin
                .from('units')
                .select('block_id')
                .eq('id', unit_id)
                .single();
            if (unit) block_id = unit.block_id;
        }

        const { data: report, error } = await supabaseAdmin
            .from('reports')
            .insert([{
                user_id: user.id,
                community_id: communityId,
                title,
                description,
                category,
                image_url,
                unit_id,
                block_id,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(report);
    } catch (err) {
        console.error('Create Report Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
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

        // Fetch Report
        const { data: report } = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('id', id)
            .single();

        if (!report) throw new Error('Report not found');
        if (report.community_id !== communityId) return res.status(404).json({ error: 'Report not in this community' });

        // Authorization Logic
        let isAuthorized = false;

        if (['admin', 'president', 'maintenance'].includes(role)) {
            isAuthorized = true;
        } else if (role === 'vocal') {
            const vocalBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id);
            if (vocalBlockIds?.includes(report.block_id)) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Unauthorized to update status' });
        }

        const { error: updateError } = await supabaseAdmin
            .from('reports')
            .update({ status, updated_at: new Date() })
            .eq('id', id);

        if (updateError) throw updateError;
        res.json({ message: 'Status updated' });
    } catch (err) {
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
            // Verify report belongs to community
            const { error } = await supabaseAdmin.from('reports').delete().eq('id', id).eq('community_id', communityId);
            if (error) throw error;
        } else {
            // Regular users can only delete their own PENDING reports
            const { data: report } = await supabaseAdmin.from('reports').select('user_id, status, community_id').eq('id', id).single();

            if (!report) return res.status(404).json({ error: 'Report not found' });

            if (report.community_id !== communityId) return res.status(403).json({ error: 'Wrong community' });

            if (report.user_id !== user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            if (report.status !== 'pending') {
                return res.status(403).json({ error: 'Cannot delete processed reports' });
            }

            const { error } = await supabaseAdmin.from('reports').delete().eq('id', id);
            if (error) throw error;
        }

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
