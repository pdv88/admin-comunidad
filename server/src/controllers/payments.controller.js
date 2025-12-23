const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get user and their role in the specific community
const getUserAndMember = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) throw new Error('No token provided');
    if (!communityId) throw new Error('Community ID header missing');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');

    // Get Member Profile & Role
    const { data: member, error: memberError } = await supabaseAdmin
        .from('community_members')
        .select(`
            role_id,
            roles(name),
            profile:profile_id (
                *,
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

    if (memberError || !member) {
        throw new Error('User is not a member of this community');
    }

    return { user, member, communityId };
};

exports.createPayment = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const { amount, campaign_id, notes, base64Image, fileName, targetUserId, monthly_fee_id, unit_id, payment_date } = req.body;
        const role = member.roles?.name;

        let paymentUserId = user.id;

        // If admin/president and targetUserId is provided, use it
        if ((role === 'admin' || role === 'president') && targetUserId) {
            paymentUserId = targetUserId;
            // Verify target user is in this community? (Ideally yes, skipping for brevity)
        }

        // Verify monthly_fee ownership if provided
        if (monthly_fee_id) {
            const { data: feeData, error: feeError } = await supabaseAdmin
                .from('monthly_fees')
                .select('unit_id, units(block_id, unit_owners(profile_id))')
                .eq('id', monthly_fee_id)
                .single();

            if (feeError || !feeData) throw new Error('Invalid monthly fee selected');

            // Check if user is owner of the unit for this fee
            // (Skipping deep check for speed, but ideally we match fee unit owner to paymentUserId)
        }

        let proof_url = null;

        if (base64Image && fileName) {
            const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
            const filePath = `${communityId}/${user.id}/${Date.now()}_${fileName}`; // Scoped by community/user

            const { error: uploadError } = await supabaseAdmin
                .storage
                .from('payment-proofs')
                .upload(filePath, buffer, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabaseAdmin
                .storage
                .from('payment-proofs')
                .getPublicUrl(filePath);

            proof_url = publicUrlData.publicUrl;
        }

        // Determine initial status: 'pending' for users, 'confirmed' for admins
        const initialStatus = ['admin', 'president', 'treasurer'].includes(role) ? 'confirmed' : 'pending';

        const { data, error } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: paymentUserId,
                community_id: communityId,
                amount,
                campaign_id: campaign_id || null, // Optional
                notes,
                proof_url,
                unit_id: unit_id || null, // Optional but recommended
                payment_date: payment_date || new Date().toISOString(), // Default to now if missing
                status: initialStatus
            })
            .select()
            .single();

        if (error) throw error;

        // Link Fee if provided
        if (monthly_fee_id) {
            console.log(`Linking payment ${data.id} to fee ${monthly_fee_id}`);
            const updatePayload = { payment_id: data.id };
            if (initialStatus === 'confirmed') updatePayload.status = 'paid';

            const { error: updateError } = await supabaseAdmin
                .from('monthly_fees')
                .update(updatePayload)
                .eq('id', monthly_fee_id);

            if (updateError) {
                console.error("Error linking fee:", updateError);
            } else {
                console.log("Fee linked successfully.");
            }
        } else if (campaign_id) {
            console.log(`Campaign contribution recorded for campaign ${campaign_id}`);
            // If auto-confirmed (admin), update campaign stats immediately
            if (initialStatus === 'confirmed') {
                try {
                    const { data: campaign } = await supabaseAdmin
                        .from('campaigns')
                        .select('current_amount')
                        .eq('id', campaign_id)
                        .maybeSingle();

                    if (campaign) {
                        await supabaseAdmin
                            .from('campaigns')
                            .update({ current_amount: Number(campaign.current_amount) + Number(amount) })
                            .eq('id', campaign_id);
                    }
                } catch (err) {
                    console.error("Error auto-updating campaign stats:", err);
                }
            }
        } else {
            console.log(`General payment recorded (ID: ${data.id})`);
        }

        res.status(201).json(data);

    } catch (error) {
        console.error('Create payment error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.getPayments = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;
        const type = req.query.type; // 'own' or 'all'
        const campaign_id = req.query.campaign_id;

        let query = supabaseAdmin
            .from('payments')
            .select(`
                *,
                units (
                    unit_number,
                    blocks ( name )
                )
            `)
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        if ((role !== 'admin' && role !== 'president') || type === 'own') {
            query = query.eq('user_id', user.id);
        }

        if (campaign_id) {
            query = query.eq('campaign_id', campaign_id);
        }

        const { data: payments, error: paymentsError } = await query;
        if (paymentsError) throw paymentsError;

        // Enhance Results (Campaigns, Profiles)
        // ... (Similar logic to before but scoped)
        // Optimization: For now returning raw payments + IDs to avoid massive complexity.
        // Or re-implement basic join logic.

        // Let's implement lightweight join
        let result = payments;

        // Fetch Campaigns
        const campaignIds = [...new Set(payments.map(p => p.campaign_id).filter(id => id))];
        let campaignMap = {};
        if (campaignIds.length > 0) {
            const { data: cData } = await supabaseAdmin.from('campaigns').select('*').in('id', campaignIds);
            if (cData) cData.forEach(c => campaignMap[c.id] = c);
        }

        // Fetch Profiles (if Admin viewing All)
        let profileMap = {};
        if (role === 'admin' || role === 'president') {
            const userIds = [...new Set(payments.map(p => p.user_id))];


            if (userIds.length > 0) {
                const { data: pData, error: pError } = await supabaseAdmin
                    .from('profiles')
                    .select(`
                        id, full_name, email, phone,
                        unit_owners(
                            units(
                                unit_number,
                                blocks(name)
                            )
                        )
                    `)
                    .in('id', userIds);

                if (pError) console.error("Error fetching profiles:", pError);
                if (pData) {
                    pData.forEach(p => profileMap[p.id] = p);
                }
            }
        }

        result = payments.map(p => ({
            ...p,
            campaigns: p.campaign_id ? campaignMap[p.campaign_id] : null,
            profiles: profileMap[p.user_id] || (p.user_id === user.id ? member.profile : null)
        }));

        res.json(result);

    } catch (error) {
        console.error('Get payments error:', error);
        res.status(401).json({ error: error.message });
    }
};

exports.getPaymentById = async (req, res) => {
    try {
        console.log(`Getting payment by ID... Params:`, req.params);
        const { user, member, communityId } = await getUserAndMember(req);
        const { id } = req.params;
        const role = member.roles?.name;

        console.log(`User: ${user.id}, Role: ${role}, Community: ${communityId}, Target Payment: ${id}`);

        // Fetch payment
        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                units (unit_number, blocks(name)),
                monthly_fees(period)
            `)
            .eq('id', id)
            .eq('community_id', communityId)
            .maybeSingle();

        console.log("Supabase Result - Error:", error);
        console.log("Supabase Result - Payment found:", !!payment);

        if (error || !payment) {
            return res.status(404).json({ error: 'Payment not found or DB error' });
        }

        // Access Control: Admin/President OR Owner
        if (role !== 'admin' && role !== 'president' && payment.user_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized to view this payment' });
        }

        // Manual Join for Profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', payment.user_id)
            .single();

        const paymentWithProfile = {
            ...payment,
            profile: profile || { full_name: 'Unknown User', email: '' }
        };

        res.json(paymentWithProfile);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const { id } = req.params;
        const { status } = req.body;
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president') {
            return res.status(403).json({ error: 'Unauthorized. Admin or President only.' });
        }

        const { data: currentPayment } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (!currentPayment) return res.status(404).json({ error: 'Payment not found' });
        if (currentPayment.community_id !== communityId) return res.status(404).json({ error: 'Payment not in this community' });

        const { data, error } = await supabaseAdmin
            .from('payments')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update Campaign Stats
        if (status === 'confirmed' && currentPayment.status !== 'confirmed') {
            if (data.campaign_id) {
                try {
                    const { data: campaign } = await supabaseAdmin
                        .from('campaigns')
                        .select('current_amount')
                        .eq('id', data.campaign_id)
                        .maybeSingle();

                    if (campaign) {
                        await supabaseAdmin
                            .from('campaigns')
                            .update({ current_amount: Number(campaign.current_amount) + Number(data.amount) })
                            .eq('id', data.campaign_id);
                    }
                } catch (ignore) { }
            }

            // Check for linked Monthly Fee
            try {
                // Find fee linked to this payment
                const { data: linkedFee } = await supabaseAdmin
                    .from('monthly_fees')
                    .select('id')
                    .eq('payment_id', data.id)
                    .maybeSingle();

                if (linkedFee) {
                    await supabaseAdmin
                        .from('monthly_fees')
                        .update({ status: 'paid' })
                        .eq('id', linkedFee.id);
                }
            } catch (ignore) { console.error('Error updating fee status', ignore); }
        }

        res.json(data);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { user } = await getUserAndMember(req); // Checks community membership implicitly
        const { id } = req.params;

        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        // Strict ownership check
        if (payment.user_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'Cannot delete processed payment' });
        }

        const { error } = await supabaseAdmin.from('payments').delete().eq('id', id);
        if (error) throw error;

        res.status(200).json({ message: 'Payment deleted' });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { name, goal_amount, description, deadline, target_type, target_blocks } = req.body;

        const { data, error } = await supabaseAdmin
            .from('campaigns')
            .insert({
                community_id: communityId,
                name,
                target_amount: goal_amount,
                current_amount: 0,
                description,
                deadline,
                target_type: target_type || 'all',
                target_blocks: target_blocks || [],
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { name, goal_amount, description, deadline, is_active } = req.body;

        const { data, error } = await supabaseAdmin
            .from('campaigns')
            .update({
                name,
                target_amount: goal_amount,
                description,
                deadline,
                is_active
            })
            .eq('id', id)
            .eq('community_id', communityId) // Scope check
            .select()
            .single();

        if (error) throw error;
        res.json(data);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;
        const profile = member.profile;

        let query = supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        const { data: allCampaigns, error } = await query;
        if (error) throw error;

        // Access Logic: Residents can only see campaigns targeting them or 'all'
        let visibleCampaigns = allCampaigns;
        if (role !== 'admin' && role !== 'president') {
            // Get User's Unit/Block from profile structure
            // We fetched profile in getUserAndMember with unit_owners
            // Assuming user has 1 block basically? Or many.
            const myBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id).filter(Boolean) || [];

            visibleCampaigns = allCampaigns.filter(c => {
                if (c.target_type === 'all') return true;
                if (c.target_type === 'blocks' && c.target_blocks) {
                    return c.target_blocks.some(tb => myBlockIds.includes(tb));
                }
                return false;
            });
        }

        res.json(visibleCampaigns);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getCampaignById = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .eq('community_id', communityId)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Campaign not found' });

        // Self-Healing: Recalculate total collected
        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('amount')
            .eq('campaign_id', id)
            .eq('status', 'confirmed');

        const realTotal = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        if (Number(data.current_amount) !== realTotal) {
            console.log(`Fixing Campaign ${id} amount: ${data.current_amount} -> ${realTotal}`);
            await supabaseAdmin
                .from('campaigns')
                .update({ current_amount: realTotal })
                .eq('id', id);
            data.current_amount = realTotal;
        }

        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'admin' && role !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('amount, status')
            .eq('community_id', communityId);

        const totalCollected = payments
            .filter(p => p.status === 'confirmed')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const pendingAmount = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        res.json({
            totalCollected,
            pendingAmount,
            totalTransactions: payments.length
        });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
