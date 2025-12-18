const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getAll = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Fetch full profile to get unit info (for block targeting)
        // Note: unit_owners might span multiple communities, but block_id usually unique.
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*, unit_owners(units(block_id))')
            .eq('id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');

        // Get user's block IDs (could be multiple if multiple units)
        const userBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id).filter(Boolean) || [];

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

        // Check Permissions in Community Members
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member of this community' });

        const allowedRoles = ['admin', 'president', 'secretary'];
        if (!allowedRoles.includes(member.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized: Only admins can create polls.' });
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
                target_type: targetType || 'all',
                target_blocks: targetBlocks || null
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

        // Check Permissions
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        const allowedRoles = ['admin', 'president', 'secretary'];
        if (!member || !allowedRoles.includes(member.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { error } = await supabaseAdmin
            .from('polls')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Poll deleted' });
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

        // Check Permission
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        const allowedRoles = ['admin', 'president', 'secretary'];
        if (!member || !allowedRoles.includes(member.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized' });
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
