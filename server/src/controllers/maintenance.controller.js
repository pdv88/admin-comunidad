const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get user and their role
const getUserAndMember = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) throw new Error('No token provided');
    if (!communityId) throw new Error('Community ID header missing');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');

    const { data: member, error: memberError } = await supabaseAdmin
        .from('community_members')
        .select('role_id, roles(name), profile_id, profile:profile_id(*)')
        .eq('profile_id', user.id)
        .eq('community_id', communityId)
        .single();

    if (memberError || !member) throw new Error('Not a member of this community');

    return { user, member, communityId };
};

exports.generateMonthlyFees = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { period, amount } = req.body; // period: '2025-01-01', amount: 50.00

        if (!period || !amount) {
            return res.status(400).json({ error: 'Period and Amount are required' });
        }

        // 1. Get all units in the community
        const { data: units, error: unitsError } = await supabaseAdmin
            .from('units')
            .select('id, block_id, blocks!inner(community_id)') // Filter via inner join on blocks
            .eq('blocks.community_id', communityId);

        if (unitsError) throw unitsError;
        if (!units || units.length === 0) return res.status(400).json({ error: 'No units found in this community' });

        // 2. Prepare inserts
        const feeRecords = units.map(unit => ({
            community_id: communityId,
            unit_id: unit.id,
            period: period, // Ensure YYYY-MM-01 format from client
            amount: amount,
            status: 'pending'
        }));

        // 3. Upsert (Insert or Do Nothing if exists)
        // We rely on UNIQUE(unit_id, period) constraint
        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .upsert(feeRecords, { onConflict: 'unit_id, period', ignoreDuplicates: true })
            .select();

        if (error) throw error;

        res.status(201).json({ message: `Fees generated for ${data.length} new records (duplicates ignored)`, count: data.length });

    } catch (error) {
        console.error('Generate fees error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.getCommunityStatus = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { period } = req.query;

        // Fetch all fees, optionally filtered by period
        let query = supabaseAdmin
            .from('monthly_fees')
            .select(`
                *,
                units (
                    id,
                    unit_number,
                    blocks (name),
                    unit_owners (
                        profile:profile_id (full_name, email, phone)
                    )
                )
            `)
            .eq('community_id', communityId)
            .order('period', { ascending: false });

        if (period) {
            query = query.eq('period', period);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Process data to be UI-friendly (flatten unit owners)
        const result = data.map(fee => {
            // Get primary owner or first owner
            const owner = fee.units?.unit_owners?.[0]?.profile || { full_name: 'No Owner' };
            return {
                id: fee.id,
                period: fee.period,
                amount: fee.amount,
                status: fee.status,
                unit_number: fee.units?.unit_number,
                block_name: fee.units?.blocks?.name,
                owner_name: owner.full_name,
                owner_email: owner.email
            };
        });

        res.json(result);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getMyStatement = async (req, res) => {
    try {
        const { user, communityId } = await getUserAndMember(req);

        // 1. Find units owned by this user in this community
        // Complex because unit_owners -> units -> blocks -> community_id
        const { data: myUnits, error: unitError } = await supabaseAdmin
            .from('unit_owners')
            .select(`
                unit_id,
                units!inner (
                    id,
                    unit_number,
                    blocks!inner (
                        id,
                        name,
                        community_id
                    )
                )
            `)
            .eq('profile_id', user.id)
            .eq('units.blocks.community_id', communityId);

        if (unitError) throw unitError;

        const unitIds = myUnits.map(u => u.unit_id);

        if (unitIds.length === 0) {
            return res.json([]); // No units, no fees
        }

        // 2. Fetch fees for these units
        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .select(`
                *,
                units (unit_number, blocks(name))
            `)
            .in('unit_id', unitIds)
            .order('period', { ascending: false });

        if (error) throw error;

        res.json(data);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.markAsPaid = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeId } = req.params;
        const { paymentId } = req.body; // Optional: Link to an actual payment transaction

        const updateData = {
            status: 'paid',
            updated_at: new Date().toISOString()
        };
        if (paymentId) updateData.payment_id = paymentId;

        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .update(updateData)
            .eq('id', feeId)
            .eq('community_id', communityId)
            .select()
            .single();

        if (error) throw error;

        res.json(data);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
