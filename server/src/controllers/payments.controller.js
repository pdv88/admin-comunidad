const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get user from token
const getUserFromToken = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token provided');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');

    // Get profile for role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, roles(name)')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Profile fetch error inside payments:', profileError);
        throw new Error('Error fetching user profile');
    }
    if (!profile) {
        throw new Error('User profile not found');
    }

    return { user, profile };
};

exports.createPayment = async (req, res) => {
    try {
        const { user, profile } = await getUserFromToken(req);
        const { amount, campaign_id, notes, base64Image, fileName, targetUserId } = req.body;

        let paymentUserId = user.id;

        // If admin/president and targetUserId is provided, use it
        if ((profile.roles.name === 'admin' || profile.roles.name === 'president') && targetUserId) {
            paymentUserId = targetUserId;
        }

        let proof_url = null;

        // Handle Image Upload (if provided)
        if (base64Image && fileName) {
            const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
            const filePath = `${user.id}/${Date.now()}_${fileName}`;

            const { data: uploadData, error: uploadError } = await supabaseAdmin
                .storage
                .from('payment-proofs')
                .upload(filePath, buffer, {
                    contentType: 'image/jpeg', // Adjust based on file type if needed, strict for now
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: publicUrlData } = supabaseAdmin
                .storage
                .from('payment-proofs')
                .getPublicUrl(filePath);

            proof_url = publicUrlData.publicUrl;
        }

        // Insert Payment Record
        const { data, error } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: paymentUserId,
                amount,
                campaign_id: campaign_id || null, // Optional
                notes,
                proof_url,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Update Campaign Current Amount if exists (Optimistic, typically done on confirm, but let's decide logic)
        // User logic: "Barra de progreso... se actualiza automáticamente al CONFIRMAR un pago."
        // So we don't update campaign yet.

        res.status(201).json(data);

    } catch (error) {
        console.error('Create payment error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.getPayments = async (req, res) => {
    try {
        const { user, profile } = await getUserFromToken(req);
        const role = profile.roles.name;
        const type = req.query.type; // 'own' or 'all'

        // 1. Fetch payments (without joins)
        let query = supabaseAdmin
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false });

        // If not admin/president, OR if admin specifically wants 'own' payments
        if ((role !== 'admin' && role !== 'president') || type === 'own') {
            query = query.eq('user_id', user.id);
        }

        const { data: payments, error: paymentsError } = await query;
        if (paymentsError) throw paymentsError;

        // 2. Start constructing the result
        let result = payments;

        // 3. Manual Joins

        // 3a. Campaigns
        const campaignIds = [...new Set(payments.map(p => p.campaign_id).filter(id => id))];
        let campaignMap = {};

        if (campaignIds.length > 0) {
            const { data: campaignsData } = await supabaseAdmin
                .from('campaigns')
                .select('*') // Fetch all fields (target_amount, current_amount) for progress bars
                .in('id', campaignIds);

            if (campaignsData) {
                campaignsData.forEach(c => { campaignMap[c.id] = c; });
            }
        }

        // 3b. Profiles & Units (Only if fetching ALL for Admin/President)
        // If type === 'own', we don't necessarily need the full profile data of others, 
        // but it's fine to attach the user's own profile for consistency.
        let profileMap = {};
        let unitMap = {};

        // Optimize: only fetch profiles if we are showing the admin list or if it's the user's own list (one profile)
        const userIds = [...new Set(payments.map(p => p.user_id))];

        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, unit_id, email, phone')
                .in('id', userIds);

            if (!profilesError && profiles) {
                profiles.forEach(p => { profileMap[p.id] = p; });

                // Fetch Units
                const unitIds = [...new Set(profiles.map(p => p.unit_id).filter(uid => uid))];
                let blockMap = {};

                if (unitIds.length > 0) {
                    const { data: unitsData } = await supabaseAdmin
                        .from('units')
                        .select('id, unit_number, block_id')
                        .in('id', unitIds);

                    if (unitsData) {
                        unitsData.forEach(u => { unitMap[u.id] = u; });

                        // Fetch Blocks if we have units with block_ids
                        const blockIds = [...new Set(unitsData.map(u => u.block_id).filter(bid => bid))];

                        if (blockIds.length > 0) {
                            const { data: blocksData } = await supabaseAdmin
                                .from('blocks')
                                .select('id, name')
                                .in('id', blockIds);

                            if (blocksData) {
                                blocksData.forEach(b => { blockMap[b.id] = b; });
                            }
                        }
                    }
                }

                // Attach enhanced unit info (with block name) to profiles
                profiles.forEach(p => {
                    const unitRaw = unitMap[p.unit_id];
                    let enhancedUnit = null;

                    if (unitRaw) {
                        const block = blockMap[unitRaw.block_id];
                        enhancedUnit = {
                            ...unitRaw,
                            number: unitRaw.unit_number, // Map unit_number to number for frontend
                            block: block ? block.name : 'Unknown' // Map block name to block
                        };
                    }
                    p.units = enhancedUnit;
                    profileMap[p.id] = p;
                });
            }
        }

        // 4. Map everything
        result = payments.map(payment => {
            const profile = profileMap[payment.user_id];

            return {
                ...payment,
                campaigns: payment.campaign_id ? campaignMap[payment.campaign_id] : null,
                profiles: profile ? {
                    ...profile,
                    email: profile.email || 'N/A',
                    phone: profile.phone || 'N/A',
                    units: profile.units // Already processed above
                } : { full_name: 'Unknown', email: 'N/A', phone: 'N/A' }
            };
        });

        res.json(result);

    } catch (error) {
        console.error('Get payments error:', error);
        res.status(401).json({ error: error.message });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { user, profile } = await getUserFromToken(req);
        const { id } = req.params;
        const { status } = req.body; // 'confirmed' or 'rejected'

        if (profile.roles.name !== 'admin' && profile.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized. Admin or President only.' });
        }

        // Get current payment to check if it was already confirmed (to avoid double counting)
        const { data: currentPayment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', id)
            .maybeSingle(); // Use maybeSingle to avoid 406/400 error if not found

        if (fetchError) throw fetchError;
        if (!currentPayment) return res.status(404).json({ error: 'Payment not found' });

        // Update Status
        const { data, error } = await supabaseAdmin
            .from('payments')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Logic: specific business rule "Barra de progreso se actualiza al confirmar"
        if (status === 'confirmed' && currentPayment.status !== 'confirmed' && data.campaign_id) {
            try {
                // Increment campaign amount
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
            } catch (campaignError) {
                console.error('Error updating campaign stats (non-fatal):', campaignError);
                // Do not fail the request if campaign stats fail
            }
        }

        res.json(data);

    } catch (error) {
        console.error('Update payment error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { user } = await getUserFromToken(req);
        const { id } = req.params;

        // Fetch payment to verify ownership and status
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        // Check ownership
        if (payment.user_id !== user.id) {
            return res.status(403).json({ error: 'Unauthorized. You can only delete your own payments.' });
        }

        // Check status (Safety: only allow deleting pending payments)
        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'Cannot delete a processed payment.' });
        }

        // Delete (we could also delete the file from storage here, but omitting for brevity)
        const { error: deleteError } = await supabaseAdmin
            .from('payments')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.status(200).json({ message: 'Payment deleted' });

    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const { user, profile } = await getUserFromToken(req);
        if (profile.roles.name !== 'admin' && profile.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { name, goal_amount, description, deadline } = req.body;

        const { data, error } = await supabaseAdmin
            .from('campaigns')
            .insert({
                name,
                target_amount: goal_amount,
                current_amount: 0,
                description,
                deadline,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);

    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const { user, profile } = await getUserFromToken(req);
        if (profile.roles.name !== 'admin' && profile.roles.name !== 'president') {
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
            .select()
            .single();

        if (error) throw error;
        res.json(data);

    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getStats = async (req, res) => {
    // Consolidated reports for President/Admin
    try {
        const { user, profile } = await getUserFromToken(req);
        if (profile.roles.name !== 'admin' && profile.roles.name !== 'president') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Simple stats: Total Collected, Pending Amount, Count
        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('amount, status');

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
}
