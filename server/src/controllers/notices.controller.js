const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get all descendant block IDs
const getDescendantBlockIds = async (parentIds, communityId) => {
    const { data: allBlocks } = await supabaseAdmin
        .from('blocks')
        .select('id, parent_id')
        .eq('community_id', communityId);

    if (!allBlocks) return parentIds;

    let totalIds = [...parentIds];
    let toProcess = [...parentIds];

    while (toProcess.length > 0) {
        const currentId = toProcess.shift();
        const children = allBlocks.filter(b => b.parent_id === currentId).map(b => b.id);
        const newIds = children.filter(id => !totalIds.includes(id));
        totalIds = [...totalIds, ...newIds];
        toProcess = [...toProcess, ...newIds];
    }

    return totalIds;
};

// Helper to get block IDs that a user represents as vocal
const getVocalBlocks = async (memberId) => {
    const { data } = await supabaseAdmin
        .from('member_roles')
        .select('block_id, roles!inner(name)')
        .eq('member_id', memberId)
        .eq('roles.name', 'vocal');
    return data?.map(r => r.block_id).filter(Boolean) || [];
};

// Helper to get user's roles from member_roles table
const getMemberRoles = async (memberId) => {
    const { data } = await supabaseAdmin
        .from('member_roles')
        .select('roles(name)')
        .eq('member_id', memberId);
    return data?.map(r => r.roles?.name).filter(Boolean) || [];
};

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
        if (['super_admin', 'admin', 'president', 'secretary', 'maintenance'].includes(role)) {
            // See ALL notices in this community
        } else {
            // Vocals and Residents: See Global (target_type='all') + Their Blocks
            const myBlockIds = profile.unit_owners
                ?.map(uo => uo.units?.block_id)
                .filter(Boolean);

            if (myBlockIds && myBlockIds.length > 0) {
                // Logic:
                // 1. target_type = 'all' (Global)
                // 2. target_type = 'blocks' AND target_blocks OVERLAPS myBlockIds
                // 3. Old logic fallback: block_id IS NULL OR block_id IN (myBlockIds)

                // Supabase doesn't support easy "overlaps" in one line with OR mixed in easily in JS client sometimes.
                // But we can use .or() with filters.
                // However, simpler is to filter in memory if volume is low, OR construct a complex query.
                // Let's try to construct a query that covers both legacy and new.

                // Legacy: block_id
                // New: target_blocks (array)

                // We want notices where:
                // (target_type = 'all')
                // OR
                // (target_blocks && [myBlockIds]) -- overlap
                // OR legacy: (block_id is null) OR (block_id in myBlockIds)

                // PostgreSQL overlap operator is &&.
                // .or(`target_type.eq.all,target_blocks.cs.{${myBlockIds.join(',')}}`)

                // 'cs' is contains. We want overlap. Overlap is 'ov'.
                // target_blocks.ov.{id1,id2}

                // let orCondition = `target_type.eq.all,block_id.is.null`; // Original (Leaky)
                // New logic: 
                // 1. target_type = 'all'
                // 2. Legacy Global: block_id is null AND target_type is null
                // 3. User Specific: target_blocks overlap OR block_id match

                let orCondition = `target_type.eq.all,and(block_id.is.null,target_type.is.null)`;
                if (myBlockIds.length > 0) {
                    orCondition += `,target_blocks.ov.{${myBlockIds.join(',')}},block_id.in.(${myBlockIds.join(',')})`;
                }

                query = query.or(orCondition);

            } else {
                query = query.or('target_type.eq.all,and(block_id.is.null,target_type.is.null)');
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
    const { title, content, priority, block_id, target_blocks, target_type } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Get member record
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        // Get user's roles from member_roles table
        const roles = await getMemberRoles(member.id);

        // 1. Permission Check - check if user has any of the allowed roles
        const allowedRoles = ['super_admin', 'admin', 'president', 'secretary', 'vocal'];
        const hasPermission = roles.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized to create notices' });
        }

        // 2. Scope Check and Data Prep
        let finalTargetType = target_type || (block_id ? 'blocks' : 'all');
        let finalTargetBlocks = target_blocks || (block_id ? [block_id] : []);

        // Ensure legacy block_id compatibility if new fields aren't used
        if (!finalTargetBlocks.length && block_id) {
            finalTargetBlocks = [block_id];
        }

        const isVocal = roles.includes('vocal');
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'secretary'].includes(r));

        if (isVocal && !isAdmin) {
            // Vocals can only post to their assigned blocks
            const vocalBlockIds = await getVocalBlocks(member.id);

            if (finalTargetType !== 'blocks' || finalTargetBlocks.length === 0) {
                return res.status(400).json({ error: 'Vocals must specify target blocks' });
            }

            // Verify all targets are within vocal's scope
            // Note: Vocals can target their blocks AND descendants of their blocks.
            // But usually vocal assignment is at the parent level (e.g. Tower A).
            // So we should verify that the selected blocks are EITHER the assigned blocks OR descendants.

            // Actually, simplest is: are the selected blocks in the vocal's assigned block list?
            // If the UI sends only the parent, we expand it. 
            // If the UI sends parent + child, we verify all.

            // Let's resolve valid descendant blocks for the vocal first? 
            // Or just check strictly against assigned blocks?
            // Usually a vocal for "Tower A" should be able to post to "Tower A" (implicit all) or "Tower A - Floor 1".

            // Complex. For now, strict check: targeted blocks must be in the assigned list OR be children of assigned list.
            const allowedScope = await getDescendantBlockIds(vocalBlockIds, communityId);

            const unauthorized = finalTargetBlocks.some(id => !allowedScope.includes(id));
            if (unauthorized) {
                return res.status(403).json({ error: 'You can only post notices for your assigned blocks' });
            }
        }

        // EXPANSION LOGIC: 
        // If "Select all children" is desired behavior for ANY block selection:
        // We expand the finalTargetBlocks to include all their descendants.
        if (finalTargetType === 'blocks' && finalTargetBlocks.length > 0) {
            finalTargetBlocks = await getDescendantBlockIds(finalTargetBlocks, communityId);
        }

        const { data: notice, error } = await supabaseAdmin
            .from('notices')
            .insert([{
                created_by: user.id,
                community_id: communityId,
                title,
                content,
                priority: priority || 'normal',
                block_id: finalTargetBlocks.length === 1 ? finalTargetBlocks[0] : null, // Legacy support
                target_blocks: finalTargetBlocks, // NEW
                target_type: finalTargetType // NEW
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

        if (['super_admin', 'admin', 'president'].includes(role)) {
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
