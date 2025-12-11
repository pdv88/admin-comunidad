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
                .select('id, name')
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
                .select('id, full_name, email, unit_id')
                .in('id', userIds);

            if (!profilesError && profiles) {
                profiles.forEach(p => { profileMap[p.id] = p; });
                // console.log('DEBUG: Profiles fetched:', profiles.map(p => ({ id: p.id, unit_id: p.unit_id })));

                // Fetch Units if we have profiles with units
                const unitIds = [...new Set(profiles.map(p => p.unit_id).filter(uid => uid))];
                // console.log('DEBUG: Unit IDs to fetch:', unitIds);

                if (unitIds.length > 0) {
                    const { data: unitsData } = await supabaseAdmin
                        .from('units')
                        .select('id, block, number, floor, door')
                        .in('id', unitIds);

                    if (unitsData) {
                        unitsData.forEach(u => { unitMap[u.id] = u; });
                        // console.log('DEBUG: Units fetched:', unitsData);
                    }
                }
            }
        }

        // 4. Map everything
        result = payments.map(payment => {
            const profile = profileMap[payment.user_id];
            const unit = profile?.unit_id ? unitMap[profile.unit_id] : null;

            return {
                ...payment,
                campaigns: payment.campaign_id ? campaignMap[payment.campaign_id] : null,
                profiles: profile ? {
                    ...profile,
                    units: unit // Attach unit info to profile
                } : { full_name: 'Unknown', email: 'N/A' }
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
