const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

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
                id,
                roles(name),
                profile:profile_id (
                     unit_owners(
                        unit_id,
                        units(
                            id,
                            block_id, 
                            name,
                            blocks(name)
                        )
                    )
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const roles = await getMemberRoles(member.id);
        const profile = member.profile;

        // Base Query
        let query = supabaseAdmin
            .from('visits')
            .select(`
                *,
                units (
                    name,
                    blocks (name)
                ),
                creator:created_by (
                    full_name,
                    email
                )
            `)
            .eq('community_id', communityId)
            .order('visit_date', { ascending: true }) // Upcoming first
            .order('visit_time', { ascending: true });

        // RBAC Filtering
        const privilegedRoles = ['admin', 'president', 'secretary', 'concierge', 'security', 'vp', 'treasurer'];
        const isPrivileged = roles.some(r => privilegedRoles.includes(r));

        if (isPrivileged) {
            // See ALL visits in this community (including providers)
        } else {
            // Residents: See only their own visits (created_by them OR linked to their units)
            const myUnitIds = profile.unit_owners
                ?.map(uo => uo.unit_id)
                .filter(Boolean);

            let conditions = [`created_by.eq.${user.id}`];
            if (myUnitIds && myUnitIds.length > 0) {
                conditions.push(`unit_id.in.(${myUnitIds.join(',')})`);
            }
            
            // OR logic: created_by = me OR unit_id IN (my_units)
            query = query.or(conditions.join(','));
        }

        const { data: visits, error } = await query;
        if (error) throw error;

        res.json(visits);
    } catch (err) {
        console.error('Get Visitors Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { visitor_name, visit_date, visit_time, type, unit_id, notes } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Get member record
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                id,
                profile:profile_id (
                     unit_owners(unit_id)
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const roles = await getMemberRoles(member.id);
        const privilegedRoles = ['admin', 'president', 'secretary', 'concierge', 'security', 'vp', 'treasurer'];
        const isPrivileged = roles.some(r => privilegedRoles.includes(r));

        let finalUnitId = unit_id || null;

        // Validation based on role and type
        if (isPrivileged) {
            // Admins can create 'provider'/'service' visits without unit_id
            if (['provider', 'service', 'delivery'].includes(type) && !finalUnitId) {
                // Allowed
            } else if (!finalUnitId && !['provider', 'service'].includes(type)) {
                // If it's a guest/family, usually linked to a unit, but maybe not strictly required for admins?
                // Let's allow admins to create generic visits if they want, but usually guests visit a unit.
            }
        } else {
            // Residents:
            // 1. Must link to one of THEIR units.
            const myUnitIds = member.profile.unit_owners?.map(uo => uo.unit_id) || [];
            
            if (finalUnitId) {
                if (!myUnitIds.includes(finalUnitId)) {
                    return res.status(403).json({ error: 'You can only register visitors for your own units' });
                }
            } else {
                // If no unit specified, and they have 1 unit, default to it.
                if (myUnitIds.length === 1) {
                    finalUnitId = myUnitIds[0];
                } else if (myUnitIds.length > 1) {
                    return res.status(400).json({ error: 'Please select which unit this visitor is for' });
                } else {
                    return res.status(403).json({ error: 'You do not own any units in this community' });
                }
            }

            // Residents typically create 'guest', 'family', 'delivery'
            // Prevent them from creating 'provider' visits for the whole community?
            // Usually 'provider' implies community-wide service.
            if (['provider', 'service'].includes(type)) {
                 return res.status(403).json({ error: 'Only admins can register community providers' });
            }
        }

        const { data: visit, error } = await supabaseAdmin
            .from('visits')
            .insert([{
                created_by: user.id,
                community_id: communityId,
                visitor_name,
                visit_date,
                visit_time,
                type,
                unit_id: finalUnitId,
                notes,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(visit);

    } catch (err) {
        console.error('Create Visit Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'completed', 'cancelled'
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: visit } = await supabaseAdmin.from('visits').select('*').eq('id', id).single();
        if (!visit) return res.status(404).json({ error: 'Visit not found' });

        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });
        const roles = await getMemberRoles(member.id);
        const privilegedRoles = ['admin', 'president', 'secretary', 'concierge', 'security', 'vp', 'treasurer'];
        const isPrivileged = roles.some(r => privilegedRoles.includes(r));

        if (isPrivileged) {
            // Admins can set any status
        } else {
            // Residents can only Cancel, and only if they created it or it's for their unit
            // And only if it's currently 'pending' (maybe?)
            const isOwner = visit.created_by === user.id; // Simplified
            
            if (!isOwner) return res.status(403).json({ error: 'Unauthorized' });

            if (status === 'cancelled') {
                 // Allowed to cancel
            } else {
                 return res.status(403).json({ error: 'Residents can only cancel visits' });
            }
        }

        const { data: updated, error } = await supabaseAdmin
            .from('visits')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);

    } catch (err) {
        console.error('Update Visit Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: visit } = await supabaseAdmin.from('visits').select('*').eq('id', id).single();
        if (!visit) return res.status(404).json({ error: 'Visit not found' });

        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        const roles = await getMemberRoles(member.id);
        const privilegedRoles = ['admin', 'president', 'secretary', 'concierge', 'security', 'vp', 'treasurer'];
        const isPrivileged = roles.some(r => privilegedRoles.includes(r));

        if (isPrivileged) {
            // Allowed
        } else {
            if (visit.created_by !== user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            if (visit.status !== 'pending') {
                return res.status(400).json({ error: 'Cannot delete past or active visits' });
            }
        }

        const { error } = await supabaseAdmin.from('visits').delete().eq('id', id);
        if (error) throw error;

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
