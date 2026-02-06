const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

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
// Helper to get user's roles from member_roles table
const getMemberRoles = async (memberId) => {
    const { data } = await supabaseAdmin
        .from('member_roles')
        .select('roles(name)')
        .eq('member_id', memberId);
    return data?.map(r => r.roles?.name).filter(Boolean) || [];
};

// Helper to get full block hierarchy (including parent blocks)
const getBlockHierarchy = async (blockIds) => {
    const allBlockIds = new Set(blockIds);

    for (const blockId of blockIds) {
        let currentBlockId = blockId;
        let depth = 0;
        const maxDepth = 10;

        while (currentBlockId && depth < maxDepth) {
            const { data: block } = await supabaseAdmin
                .from('blocks')
                .select('parent_id')
                .eq('id', currentBlockId)
                .single();

            if (block?.parent_id) {
                allBlockIds.add(block.parent_id);
                currentBlockId = block.parent_id;
            } else {
                break;
            }
            depth++;
        }
    }

    return [...allBlockIds];
};

exports.getAll = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Fetch member with profile/unit info
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                id,
                profile:profile_id (
                     unit_owners(units(block_id))
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const roles = await getMemberRoles(member.id);
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'secretary'].includes(r));

        // Get user's block IDs (direct from units)
        const directBlockIds = member.profile?.unit_owners?.map(uo => uo.units?.block_id).filter(Boolean) || [];

        // Get full hierarchy including parent blocks
        const userBlockIds = await getBlockHierarchy(directBlockIds);

        // 1. Fetch Polls for this Community
        let query = supabaseAdmin
            .from('polls')
            .select(`
                *,
                poll_options (
                    id,
                    option_text
                )
            `)
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        const { data: polls, error } = await query;
        if (error) throw error;

        // 2. Fetch My Votes explicitly
        const pollIds = polls.map(p => p.id);
        const { data: myVotes } = await supabaseAdmin
            .from('poll_votes')
            .select('poll_id, option_id')
            .eq('user_id', user.id)
            .in('poll_id', pollIds);

        const myVoteMap = new Map();
        if (myVotes) {
            myVotes.forEach(v => myVoteMap.set(v.poll_id, v.option_id));
        }

        // 3. Filter by Targeting and Enhance with Counts
        const visiblePolls = polls.filter(p => {
            if (isAdmin) return true; // Admins see all polls
            if (p.target_type === 'all') return true;
            if (p.target_type === 'blocks' && p.target_blocks) {
                return p.target_blocks.some(tb => userBlockIds.includes(tb));
            }
            return true;
        });

        // 4. Fetch Vote Counts (Securely)
        const enhancedPolls = await Promise.all(visiblePolls.map(async (p) => {
            const { data: counts } = await supabaseAdmin.rpc('get_poll_results', { poll_id: p.id });
            const totalVotes = counts ? counts.reduce((acc, curr) => acc + curr.vote_count, 0) : 0;
            const myVote = myVoteMap.get(p.id) || null;

            return {
                ...p,
                total_votes: totalVotes,
                my_vote: myVote,
                user_voted: !!myVote,
                results: counts
            };
        }));

        res.json(enhancedPolls);
    } catch (err) {
        console.error('Polls Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { title, description, options, deadline, targetType, targetBlocks } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;

        // Get member record
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member of this community' });

        // Get user's roles from member_roles table
        const roles = await getMemberRoles(member.id);

        // Permission Check - admins + vocals can create polls
        const allowedRoles = ['super_admin', 'admin', 'president', 'secretary', 'vocal'];
        const hasPermission = roles.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized: Only admins and block representatives can create polls.' });
        }

        // Scope Check for vocals
        const isVocal = roles.includes('vocal');
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'secretary'].includes(r));

        let finalTargetType = targetType || 'all';
        let finalTargetBlocks = targetBlocks || null;

        if (isVocal && !isAdmin) {
            // Vocals must target specific blocks (their blocks only)
            const vocalBlockIds = await getVocalBlocks(member.id);

            if (!finalTargetBlocks || finalTargetBlocks.length === 0) {
                if (vocalBlockIds.length === 1) {
                    finalTargetBlocks = vocalBlockIds;
                    finalTargetType = 'blocks';
                } else {
                    return res.status(400).json({ error: 'Block representatives must specify target blocks for the poll' });
                }
            }

            // Ensure vocal is only targeting their blocks
            const unauthorizedBlocks = finalTargetBlocks.filter(b => !vocalBlockIds.includes(b));
            if (unauthorizedBlocks.length > 0) {
                return res.status(403).json({ error: 'You can only create polls for blocks you represent' });
            }

            finalTargetType = 'blocks';
        }

        // 1. Create Poll
        const { data: poll, error: pollError } = await supabaseAdmin
            .from('polls')
            .insert([{
                title,
                description,
                created_by: user.id,
                community_id: communityId,
                ends_at: deadline,
                target_type: finalTargetType,
                target_blocks: finalTargetBlocks
            }])
            .select()
            .single();

        if (pollError) throw pollError;

        // 2. Create Options
        const optionsData = options.map(opt => ({
            poll_id: poll.id,
            option_text: opt
        }));

        const { error: optionsError } = await supabaseAdmin
            .from('poll_options')
            .insert(optionsData);

        if (optionsError) throw optionsError;

        res.status(201).json(poll);
    } catch (err) {
        console.error('Create Poll Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.vote = async (req, res) => {
    const { poll_id, option_id, user_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        if (user.id !== user_id) {
            return res.status(403).json({ error: 'Cannot vote for another user' });
        }

        const { data: poll } = await supabaseAdmin
            .from('polls')
            .select('ends_at')
            .eq('id', poll_id)
            .single();

        if (poll && poll.ends_at && new Date(poll.ends_at) < new Date()) {
            return res.status(400).json({ error: 'Poll has ended' });
        }

        const { data, error } = await supabaseAdmin
            .from('poll_votes')
            .upsert({
                poll_id,
                option_id,
                user_id
            }, { onConflict: 'poll_id, user_id' })
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deletePoll = async (req, res) => {
    const { id } = req.params;
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

        if (!member) return res.status(403).json({ error: 'Unauthorized' });

        // Get user's roles from member_roles table
        const roles = await getMemberRoles(member.id);
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'secretary'].includes(r));
        const isVocal = roles.includes('vocal');

        // Get poll info to check ownership/targeting
        const { data: poll } = await supabaseAdmin
            .from('polls')
            .select('created_by, target_blocks')
            .eq('id', id)
            .single();

        if (!poll) return res.status(404).json({ error: 'Poll not found' });

        // Admins can delete any poll
        if (isAdmin) {
            const { error } = await supabaseAdmin.from('polls').delete().eq('id', id);
            if (error) throw error;
            return res.json({ message: 'Poll deleted' });
        }

        // Vocals can delete polls they created for their blocks
        if (isVocal && poll.created_by === user.id) {
            const vocalBlockIds = await getVocalBlocks(member.id);
            const pollBlocks = poll.target_blocks || [];
            const canDelete = pollBlocks.every(b => vocalBlockIds.includes(b));

            if (canDelete) {
                const { error } = await supabaseAdmin.from('polls').delete().eq('id', id);
                if (error) throw error;
                return res.json({ message: 'Poll deleted' });
            }
        }

        return res.status(403).json({ error: 'Unauthorized' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { title, description, deadline, targetType, targetBlocks } = req.body;
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

        if (!member) return res.status(403).json({ error: 'Unauthorized' });

        // Get user's roles from member_roles table
        const roles = await getMemberRoles(member.id);
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'secretary'].includes(r));
        const isVocal = roles.includes('vocal');

        if (!isAdmin && !isVocal) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get poll info to check ownership
        const { data: poll } = await supabaseAdmin
            .from('polls')
            .select('created_by, target_blocks')
            .eq('id', id)
            .single();

        if (!poll) return res.status(404).json({ error: 'Poll not found' });

        // Vocals can only update polls they created for their blocks
        if (isVocal && !isAdmin) {
            if (poll.created_by !== user.id) {
                return res.status(403).json({ error: 'You can only update polls you created' });
            }
            const vocalBlockIds = await getVocalBlocks(member.id);
            const pollBlocks = poll.target_blocks || [];
            const canUpdate = pollBlocks.every(b => vocalBlockIds.includes(b));

            if (!canUpdate) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }

        const { error } = await supabaseAdmin
            .from('polls')
            .update({
                title,
                description,
                ends_at: deadline,
                target_type: targetType,
                target_blocks: targetBlocks
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Poll updated' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
