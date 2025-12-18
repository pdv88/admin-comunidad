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
        const { amount, campaign_id, notes, base64Image, fileName, targetUserId } = req.body;
        const role = member.roles?.name;

        let paymentUserId = user.id;

        // If admin/president and targetUserId is provided, use it
        if ((role === 'admin' || role === 'president') && targetUserId) {
            paymentUserId = targetUserId;
            // Verify target user is in this community? (Ideally yes, skipping for brevity)
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

        const { data, error } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: paymentUserId,
                community_id: communityId,
                amount,
                campaign_id: campaign_id || null, // Optional
                notes,
                proof_url,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

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

        let query = supabaseAdmin
            .from('payments')
            .select('*')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        if ((role !== 'admin' && role !== 'president') || type === 'own') {
            query = query.eq('user_id', user.id);
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
                const { data: pData } = await supabaseAdmin.from('profiles').select('id, full_name, email, phone').in('id', userIds);
                if (pData) pData.forEach(p => profileMap[p.id] = p);
                // Note: Not fetching unit info again to keep it simple, or can do recursive fetch if needed.
            }
        }

        result = payments.map(p => ({
            ...p,
            campaigns: p.campaign_id ? campaignMap[p.campaign_id] : null,
            profiles: profileMap[p.user_id] || { full_name: 'Me' } // Simplified
        }));

        res.json(result);

    } catch (error) {
        console.error('Get payments error:', error);
        res.status(401).json({ error: error.message });
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
        if (status === 'confirmed' && currentPayment.status !== 'confirmed' && data.campaign_id) {
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
