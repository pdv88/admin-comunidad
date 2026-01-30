const supabaseAdmin = require('../config/supabaseAdmin');
const supabase = require('../config/supabaseClient');

// Helper to get user and role
const getUserAndMember = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    let communityId = req.headers['x-community-id'];

    if (!token) throw new Error('No token provided');
    if (!communityId) throw new Error('Community ID header missing');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');

    const { data: member, error: memberError } = await supabaseAdmin
        .from('community_members')
        .select('role_id, roles(name)')
        .eq('profile_id', user.id)
        .eq('community_id', communityId)
        .single();

    if (memberError || !member) throw new Error('Not a member');
    return { user, member, communityId };
};

exports.getAlerts = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        // Only admins
        if (!['super_admin', 'admin', 'president'].includes(role)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabaseAdmin
            .from('system_alerts')
            .select('*')
            // Filter by community OR global (null)
            // But for multi-tenancy, usually we stick to community_id only. 
            // Since we didn't implement community_id logic in sendEmail log yet (it logs null),
            // let's temporarily fetch null community_id alerts if the user is a system super admin (maybe?).
            // Or just fetch specific community ones.
            // CAUTION: The migration allows null, checking specific logic.
            // If logEmailFailure inserts null, regular admins won't see it if we filter by community_id.
            // We should allow fetching where community_id is null AND user is super_admin?
            // Or, let's just stick to community_id for now. I'll need to fix logging later to include community_id.
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (!['super_admin', 'admin', 'president'].includes(role)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('system_alerts')
            .update({ is_read: true })
            .eq('id', id)
            .eq('community_id', communityId);

        if (error) throw error;
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteAlert = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (!['super_admin', 'admin', 'president'].includes(role)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('system_alerts')
            .delete()
            .eq('id', id)
            .eq('community_id', communityId);

        if (error) throw error;
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
