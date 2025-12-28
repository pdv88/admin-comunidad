const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

const sendEmail = require('../utils/sendEmail');

// Helper to get user and their role
const getUserAndMember = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    let communityId = req.headers['x-community-id'];

    if (communityId && communityId.includes(',')) {
        const potentialIds = communityId.split(',').map(id => id.trim());
        // Verify which ID actually exists in the DB
        const { data: validComms } = await supabaseAdmin
            .from('communities')
            .select('id')
            .in('id', potentialIds);

        if (validComms && validComms.length > 0) {
            communityId = validComms[0].id; // Use the first VALID ID found
            communityId = potentialIds[0]; // Fallback
        }
    }

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

    // memberError usually means row not found or duplicate, failing strictly is safer
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

        // 1. Get all occupied units in the community (must have at least one owner)
        const { data: units, error: unitsError } = await supabaseAdmin
            .from('units')
            .select('id, unit_number, block_id, blocks!inner(community_id, name), unit_owners!inner(id, profile:profile_id(email, full_name))') // Inner join on unit_owners ensures occupancy
            .eq('blocks.community_id', communityId);

        if (unitsError) throw unitsError;
        if (!units || units.length === 0) return res.status(400).json({ error: 'No occupied units found in this community' });

        // 2. Check for existing fees for this period
        const { data: existingFees, error: existingError } = await supabaseAdmin
            .from('monthly_fees')
            .select('unit_id')
            .eq('community_id', communityId)
            .eq('period', period);

        if (existingError) throw existingError;

        const existingUnitIds = new Set(existingFees.map(f => f.unit_id));

        // 3. Filter units that don't have a fee yet
        const unitsToBill = units.filter(unit => !existingUnitIds.has(unit.id));

        if (unitsToBill.length === 0) {
            return res.status(200).json({ message: 'All units already have fees for this period.', count: 0 });
        }

        // 4. Prepare inserts for new fees only
        const feeRecords = unitsToBill.map(unit => ({
            community_id: communityId,
            unit_id: unit.id,
            period: period, // YYYY-MM-01
            amount: amount,
            status: 'pending'
        }));

        // 5. Insert new records
        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .insert(feeRecords)
            .select();

        if (error) throw error;

        // Fetch Community Name and Logo
        const { data: communityData } = await supabaseAdmin
            .from('communities')
            .select('name, logo_url')
            .eq('id', communityId)
            .single();
        const communityName = communityData?.name || 'Su Comunidad';
        const communityLogo = communityData?.logo_url;

        // 6. Send Email Notifications (Async, don't block response)
        (async () => {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            const link = `${clientUrl}/app/payments`;

            for (const fee of data) {
                try {
                    // Find unit info for this fee
                    const unit = units.find(u => u.id === fee.unit_id);
                    if (unit && unit.unit_owners && unit.unit_owners.length > 0) {
                        // Notify all owners? Or just the first one? Let's notify primary (0) for now.
                        const ownerProfile = unit.unit_owners[0].profile;
                        if (ownerProfile && ownerProfile.email) {
                            await sendEmail({
                                email: ownerProfile.email,
                                subject: `Nuevo Recibo de Mantenimiento - ${communityName} - ${period}`,
                                templateName: 'monthly_fee_bill.html',
                                context: {
                                    period: period,
                                    amount: fee.amount,
                                    unit_details: `${unit.blocks?.name} - ${unit.unit_number}`,
                                    link: link,
                                    community_name: communityName,
                                    community_logo: communityLogo,
                                    user_name: ownerProfile.full_name || 'Vecino'
                                }
                            });

                        }
                    }
                } catch (emailErr) {
                    console.error(`Failed to send email for fee ${fee.id}:`, emailErr);
                }
            }
        })();

        res.status(201).json({ message: `Generated ${data.length} new fees. (${existingUnitIds.size} already existed)`, count: data.length });

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
                payment_id: fee.payment_id, // include payment link
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

exports.deleteFee = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeId } = req.params;

        // Check if fee has payments
        const { data: fee } = await supabaseAdmin
            .from('monthly_fees')
            .select('payment_id')
            .eq('id', feeId)
            .eq('community_id', communityId)
            .single();

        if (fee?.payment_id) {
            return res.status(400).json({ error: 'Cannot delete a fee with a registered payment.' });
        }

        const { error } = await supabaseAdmin
            .from('monthly_fees')
            .delete()
            .eq('id', feeId)
            .eq('community_id', communityId);

        if (error) throw error;

        res.json({ message: 'Fee deleted successfully' });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.resendFeeEmail = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeId } = req.params;

        // 1. Fetch Fee with Unit details
        const { data: fee, error: feeError } = await supabaseAdmin
            .from('monthly_fees')
            .select(`
                *,
                units (
                    id,
                    unit_number,
                    blocks (name),
                    unit_owners (
                        profile_id,
                        profile:profile_id (email, full_name)
                    )
                )
            `)
            .eq('id', feeId)
            .eq('community_id', communityId)
            .single();

        if (feeError || !fee) return res.status(404).json({ error: 'Fee not found' });

        // 2. Identify Owner Email (with Fallback)
        const unitOwnerLink = fee.units?.unit_owners?.[0];
        const ownerProfile = unitOwnerLink?.profile;
        let ownerEmail = ownerProfile?.email;

        // Fallback: If profile has no email, try fetching from Auth
        if (!ownerEmail && unitOwnerLink?.profile_id) {
            try {
                const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(unitOwnerLink.profile_id);
                if (user && user.email) {
                    ownerEmail = user.email;
                    // Optional: Self-heal profile
                    await supabaseAdmin.from('profiles').update({ email: user.email }).eq('id', unitOwnerLink.profile_id);
                }
            } catch (authErr) {
                console.error("Auth fetch failed:", authErr);
            }
        }

        if (!ownerEmail) {
            return res.status(400).json({ error: 'No owner email found for this unit (Profile incomplete).' });
        }

        // 3. Send Email
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const link = `${clientUrl}/app/maintenance`;

        // Fetch Community Name and Logo
        const { data: communityData } = await supabaseAdmin
            .from('communities')
            .select('name, logo_url')
            .eq('id', communityId)
            .single();
        const communityName = communityData?.name || 'Su Comunidad';
        const communityLogo = communityData?.logo_url;

        await sendEmail({
            email: ownerEmail,
            subject: `Recordatorio: Recibo de Mantenimiento - ${communityName} - ${fee.period}`,
            templateName: 'monthly_fee_bill.html',
            context: {
                period: fee.period,
                amount: fee.amount,
                unit_details: `${fee.units?.blocks?.name} - ${fee.units?.unit_number}`,
                link: link,
                community_name: communityName,
                community_logo: communityLogo,
                user_name: ownerProfile?.full_name || 'Vecino'
            }
        });

        res.json({ message: `Email resent to ${ownerEmail}` });

    } catch (error) {
        console.error("Resend email error:", error);
        res.status(400).json({ error: error.message });
    }
};
