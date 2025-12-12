const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getAll = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Fetch Full Profile with Roles and Unity Ownership
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select(`
                *,
                roles(name),
                unit_owners(
                    unit_id,
                    units(
                        id,
                        unit_number,
                        block_id,
                        blocks(name)
                    )
                )
            `)
            .eq('id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');

        const role = profile.roles?.name;

        let query = supabaseAdmin
            .from('reports')
            .select(`
                *,
                profiles:user_id (full_name, email),
                units:unit_id (unit_number, blocks(name))
            `)
            .order('created_at', { ascending: false });

        // RBAC Filtering
        if (['admin', 'president', 'maintenance', 'secretary'].includes(role)) {
            // See ALL reports
        } else if (role === 'vocal') {
            // See reports for their BLOCKS or their own reports
            const myBlockIds = profile.unit_owners
                ?.map(uo => uo.units?.block_id)
                .filter(Boolean);

            if (myBlockIds && myBlockIds.length > 0) {
                // Filter by block_id IN myBlockIds OR user_id = me
                // Supabase syntax for OR with reference to column is tricky in JS client .or()
                // syntax: .or(`block_id.in.(${myBlockIds.join(',')}),user_id.eq.${user.id}`)
                query = query.or(`block_id.in.(${myBlockIds.join(',')}),user_id.eq.${user.id}`);
            } else {
                // Fallback if no blocks assigned, just own
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

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // If unit_id provided, fetch block_id
        let block_id = null;
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
    const { status } = req.body; // changing status
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

        // Fetch Report to check ownership/block
        const { data: report } = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('id', id)
            .single();

        if (!report) throw new Error('Report not found');

        // Authorization Logic
        let isAuthorized = false;

        if (['admin', 'president', 'maintenance'].includes(role)) {
            isAuthorized = true;
        } else if (role === 'vocal') {
            // Authorized if report is in vocal's block
            const vocalBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id);
            if (vocalBlockIds?.includes(report.block_id)) {
                isAuthorized = true;
            }
        }

        // Residents CANNOT update status (except maybe cancel if pending, not impl yet)

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
        console.error('Update Report Error:', err);
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
            // Admin/President can delete anything
            const { error } = await supabaseAdmin.from('reports').delete().eq('id', id);
            if (error) throw error;
        } else {
            // Regular users can only delete their own PENDING reports
            const { data: report } = await supabaseAdmin.from('reports').select('user_id, status').eq('id', id).single();

            if (!report) return res.status(404).json({ error: 'Report not found' });

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
