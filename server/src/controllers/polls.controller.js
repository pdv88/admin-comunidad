const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getAll = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Fetch full profile to get community_id and unit info (for block targeting)
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*, unit_owners(units(block_id))') // Assuming structure
            .eq('id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');
        const communityId = profile.community_id;

        // Get user's block IDs (could be multiple if multiple units)
        const userBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id).filter(Boolean) || [];

        // 1. Fetch Polls for this Community (Using Admin to bypass RLS, we prefer filtering explicitly)
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

        // 2. Fetch My Votes explicitly (since admin client returns ALL votes if we matched in the join)
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
                // Check if any of user's blocks match target list
                return p.target_blocks.some(tb => userBlockIds.includes(tb));
            }
            return true; // Default show if logic unclear? Or hide? Let's show if user is Admin/President maybe?
        });

        // 3. Fetch Vote Counts (Securely)
        // We can't do this efficiently in the loop without N+1 RPC calls or a separate view.
        // For MVP, checking counts via a separate admin-level query or RPC is best.
        // Let's use the RPC 'get_poll_results' for each poll? Or a summary query.
        // Optimization: Create a view 'poll_counts' that is public (or community scoped).
        // Let's assume we use an RPC designed for batch fetching or just loop for now.
        // Actually, let's use supabaseAdmin to fetch counts for these polls?
        // Or assume the user DOES NOT see counts until they vote?
        // User said "have a counter of how many votes".

        const enhancedPolls = await Promise.all(visiblePolls.map(async (p) => {
            // Get counts
            const { data: counts } = await supabaseAdmin.rpc('get_poll_results', { poll_id: p.id });

            // Calc total votes
            const totalVotes = counts ? counts.reduce((acc, curr) => acc + curr.vote_count, 0) : 0;

            // Check if voted
            const myVote = myVoteMap.get(p.id) || null;

            return {
                ...p,
                total_votes: totalVotes,
                my_vote: myVote,
                user_voted: !!myVote,
                results: counts // Detailed results [ {option_id, vote_count} ]
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

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;

        // Get Community ID and Roles
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*, roles(name)')
            .eq('id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');

        // Security Check: Role
        const allowedRoles = ['admin', 'president', 'secretary'];
        if (!allowedRoles.includes(profile.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized: Only admins can create polls.' });
        }

        // 1. Create Poll
        const { data: poll, error: pollError } = await supabaseAdmin
            .from('polls')
            .insert([{
                title,
                description,
                created_by: user.id,
                community_id: profile.community_id,
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
    // We should also check token here to verify user_id matches token
    // For now, let's assuming user_id passed is correct or verify it
    const token = req.headers.authorization?.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        if (user.id !== user_id) {
            return res.status(403).json({ error: 'Cannot vote for another user' });
        }

        const { data, error } = await supabaseAdmin
            .from('poll_votes')
            .insert([{ poll_id, option_id, user_id }])
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

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Check Role/Ownership
        // We can allow the creator OR any admin to delete? 
        // Let's enforce Admin/President role for safety regardless of creator.
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('roles(name)')
            .eq('id', user.id)
            .single();

        const allowedRoles = ['admin', 'president', 'secretary'];
        if (!allowedRoles.includes(profile?.roles?.name)) {
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

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Check Role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('roles(name)')
            .eq('id', user.id)
            .single();

        const allowedRoles = ['admin', 'president', 'secretary'];
        if (!allowedRoles.includes(profile?.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // We currently do NOT allow editing options to preserve vote integrity.
        // Only metadata.
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
