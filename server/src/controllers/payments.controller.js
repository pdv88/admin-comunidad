const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');
const sendEmail = require('../utils/sendEmail');
const { formatCurrency } = require('../utils/currencyUtils');

// Helper to send payment confirmation email
const sendPaymentConfirmationEmail = async (paymentId, communityId) => {
    try {
        // 1. Fetch Payment with necessary details
        const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                profiles (full_name, email),
                units (unit_number, blocks (name)),
                communities (name, logo_url, currency)
            `)
            .eq('id', paymentId)
            .single();

        if (paymentError || !payment) throw new Error('Payment not found for email');

        // Identify recipient
        const ownerEmail = payment.profiles?.email;
        if (!ownerEmail) return; // No email, skip

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const communityCurrency = payment.communities?.currency || 'USD';

        // 2. Fetch specific period from linked fee if any
        let periodName = '';
        const { data: linkedFee } = await supabaseAdmin
            .from('monthly_fees')
            .select('period')
            .eq('payment_id', paymentId)
            .maybeSingle();

        if (linkedFee) {
            periodName = linkedFee.period;
        } else if (payment.campaign_id) {
            const { data: campaign } = await supabaseAdmin
                .from('campaigns')
                .select('name')
                .eq('id', payment.campaign_id)
                .maybeSingle();
            periodName = campaign?.name || 'Campaign Contribution';
        }

        await sendEmail({
            email: ownerEmail,
            from: `${payment.communities?.name} <info@habiio.com>`,
            subject: `Comprobante de Pago - ${payment.communities?.name}`,
            templateName: 'payment_receipt.html',
            context: {
                user_name: payment.profiles?.full_name || 'Vecino',
                amount_formatted: formatCurrency(payment.amount, communityCurrency),
                period_name: periodName,
                unit_details: payment.units ? `${payment.units.blocks?.name} - ${payment.units.unit_number}` : '',
                community_name: payment.communities?.name,
                community_logo: payment.communities?.logo_url,
                payment_date: new Date(payment.payment_date || payment.created_at).toLocaleDateString('es-ES'),
                payment_id: paymentId.slice(0, 8),
                link: `${clientUrl}/app/maintenance`,
                community_id: communityId // For logging
            }
        });
        console.log(`Confirmation email sent to ${ownerEmail} for payment ${paymentId}`);
    } catch (error) {
        console.error("Error sending payment confirmation email:", error);
    }
};

// Helper to get block IDs that a user represents as vocal
const getVocalBlocks = async (memberId, communityId) => {
    const { data: memberRoles } = await supabaseAdmin
        .from('member_roles')
        .select('block_id, roles!inner(name)')
        .eq('member_id', memberId)
        .eq('roles.name', 'vocal');

    const baseBlockIds = memberRoles?.map(r => r.block_id).filter(Boolean) || [];
    if (baseBlockIds.length === 0) return [];

    // Resolve hierarchy for these blocks
    return await getDescendantBlockIds(baseBlockIds, communityId);
};

const getDescendantBlockIds = async (parentIds, communityId) => {
    const { data: allBlocks } = await supabaseAdmin
        .from('blocks')
        .select('id, parent_id')
        .eq('community_id', communityId);

    if (!allBlocks) return parentIds;

    let totalIds = [...parentIds];
    let toProcess = [...parentIds];

    while (toProcess.length > 0) {
        const currentId = toProcess.shift();
        const children = allBlocks.filter(b => b.parent_id === currentId).map(b => b.id);
        const newIds = children.filter(id => !totalIds.includes(id));
        totalIds = [...totalIds, ...newIds];
        toProcess = [...toProcess, ...newIds];
    }

    return totalIds;
};

// Helper to get user's roles from member_roles table
const getMemberRoles = async (memberId) => {
    const { data } = await supabaseAdmin
        .from('member_roles')
        .select('roles(name)')
        .eq('member_id', memberId);
    return data?.map(r => r.roles?.name).filter(Boolean) || [];
};

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
            id,
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

    // Fetch roles from member_roles table for multi-role support
    const roles = await getMemberRoles(member.id);
    member.allRoles = roles;

    return { user, member, communityId };
};

exports.createPayment = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const { amount, campaign_id, notes, base64Image, fileName, targetUserId, unit_id, payment_date } = req.body;
        const role = member.roles?.name;

        let paymentUserId = user.id;

        // If admin/president/super_admin/treasurer and targetUserId is provided, use it
        const isAdmin = ['super_admin', 'admin', 'president', 'treasurer'].includes(role);

        if (isAdmin && targetUserId) {
            paymentUserId = targetUserId;
        }

        let proof_url = null;

        if (base64Image && fileName) {
            const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
            const filePath = `${communityId}/${user.id}/${Date.now()}_${fileName}`;

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
                campaign_id: campaign_id || null,
                notes,
                proof_url,
                unit_id: unit_id || null,
                payment_date: payment_date || new Date().toISOString(),
                status: initialStatus
            })
            .select()
            .single();

        if (error) throw error;

        // Update campaign stats if this is a campaign contribution
        if (campaign_id && initialStatus === 'confirmed') {
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

        res.status(201).json(data);

        // Async: Send Confirmation Email if auto-confirmed
        if (initialStatus === 'confirmed') {
            sendPaymentConfirmationEmail(data.id, communityId);
        }

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

        const isAdmin = ['super_admin', 'admin', 'president', 'treasurer'].includes(role);

        if (!isAdmin && type === 'own') {
            query = query.eq('user_id', user.id);
        } else if (!isAdmin) {
            // By default non-admins only see own payments unless specifc logic exists?
            // Usually getPayments defaults to own for residents.
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
        if (isAdmin) {
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

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized. Admin, President or Treasurer only.' });
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
            if (currentPayment.campaign_id) {
                try {
                    const { data: campaign } = await supabaseAdmin
                        .from('campaigns')
                        .select('current_amount')
                        .eq('id', currentPayment.campaign_id)
                        .maybeSingle();

                    if (campaign) {
                        await supabaseAdmin
                            .from('campaigns')
                            .update({ current_amount: Number(campaign.current_amount) + Number(data.amount) })
                            .eq('id', currentPayment.campaign_id);
                    }
                } catch (ignore) { }
            }

            // Check for linked fee based on payment type
            try {
                if (currentPayment.campaign_id) {
                    // Extraordinary fee payment - only check extraordinary_fees table
                    const { data: linkedExtFee } = await supabaseAdmin
                        .from('extraordinary_fees')
                        .select('id, campaign_id')
                        .eq('payment_id', data.id)
                        .maybeSingle();

                    if (linkedExtFee) {
                        await supabaseAdmin
                            .from('extraordinary_fees')
                            .update({ status: 'paid' })
                            .eq('id', linkedExtFee.id);

                        // Recalculate campaign progress
                        if (linkedExtFee.campaign_id) {
                            const { data: paidFees } = await supabaseAdmin
                                .from('extraordinary_fees')
                                .select('amount')
                                .eq('campaign_id', linkedExtFee.campaign_id)
                                .eq('status', 'paid');

                            const totalRaised = (paidFees || []).reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

                            await supabaseAdmin
                                .from('campaigns')
                                .update({ current_amount: totalRaised })
                                .eq('id', linkedExtFee.campaign_id);
                        }
                    }
                } else {
                    // Monthly fee payment - only check monthly_fees table
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
                }
            } catch (ignore) { console.error('Error updating fee status', ignore); }

            // Send Confirmation Email
            sendPaymentConfirmationEmail(data.id, communityId);
        } else if (status === 'rejected') {
            // Unlink fees and revert their status
            try {
                if (currentPayment.campaign_id) {
                    // Extraordinary fee
                    const { data: linkedExtFee } = await supabaseAdmin
                        .from('extraordinary_fees')
                        .select('id')
                        .eq('payment_id', data.id)
                        .maybeSingle();

                    if (linkedExtFee) {
                        await supabaseAdmin
                            .from('extraordinary_fees')
                            .update({ status: 'pending', payment_id: null })
                            .eq('id', linkedExtFee.id);
                    }
                } else {
                    // Monthly fee
                    const { data: linkedFee } = await supabaseAdmin
                        .from('monthly_fees')
                        .select('id')
                        .eq('payment_id', data.id)
                        .maybeSingle();

                    if (linkedFee) {
                        await supabaseAdmin
                            .from('monthly_fees')
                            .update({ status: 'pending', payment_id: null })
                            .eq('id', linkedFee.id);
                    }
                }
            } catch (err) {
                console.error('Error reverting fee linkage on rejection:', err);
            }
        }

        res.json(data);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { user, member } = await getUserAndMember(req); // Checks community membership implicitly
        const { id } = req.params;

        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        const role = member.roles?.name;
        const isAdmin = ['super_admin', 'admin', 'president', 'treasurer'].includes(role);

        // Strict ownership check (unless admin)
        if (payment.user_id !== user.id && !isAdmin) {
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
        const { user, member, communityId } = await getUserAndMember(req);
        const roles = member.allRoles || [];

        // Permission Check - admins + vocals can create campaigns
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'treasurer'].includes(r));
        const isVocal = roles.includes('vocal');

        if (!isAdmin && !isVocal) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const {
            name,
            goal_amount,
            description,
            deadline,
            target_type,
            target_blocks,
            is_mandatory,
            amount_per_unit,
            calculation_method // 'fixed' or 'coefficient'
        } = req.body;

        let finalTargetType = target_type || 'all';
        let finalTargetBlocks = target_blocks || [];

        // Vocals must target specific blocks (their blocks only)
        if (isVocal && !isAdmin) {
            const vocalBlockIds = await getVocalBlocks(member.id, communityId);

            if (!finalTargetBlocks || finalTargetBlocks.length === 0) {
                if (vocalBlockIds.length === 1) {
                    finalTargetBlocks = vocalBlockIds;
                    finalTargetType = 'blocks';
                } else {
                    return res.status(400).json({ error: 'Block representatives must specify target blocks for the campaign' });
                }
            }

            // Ensure vocal is only targeting their blocks
            const unauthorizedBlocks = finalTargetBlocks.filter(b => !vocalBlockIds.includes(b));
            if (unauthorizedBlocks.length > 0) {
                return res.status(403).json({ error: 'You can only create campaigns for blocks you represent' });
            }

            finalTargetType = 'blocks';
        }

        // 1. Fetch targeted users/units FIRST to calculate total if needed
        let unitQuery = supabaseAdmin
            .from('units')
            .select('id, unit_number, coefficient, block_id, blocks!inner(name), unit_owners!inner(profile:profile_id(id, email, full_name))')
            .eq('blocks.community_id', communityId);

        if (finalTargetType === 'blocks' && finalTargetBlocks.length > 0) {
            const resolvedBlocks = await getDescendantBlockIds(finalTargetBlocks, communityId);
            unitQuery = unitQuery.in('block_id', resolvedBlocks);
        }

        const { data: units } = await unitQuery;

        let finalTargetAmount = goal_amount;

        // Auto-calculate Target Amount for Fixed Method
        if (is_mandatory && calculation_method !== 'coefficient' && amount_per_unit > 0) {
            // Fixed Method: Goal = Amount Per Unit * Number of Units
            finalTargetAmount = Number(amount_per_unit) * (units ? units.length : 0);
        }

        const { data: campaign, error } = await supabaseAdmin
            .from('campaigns')
            .insert({
                community_id: communityId,
                created_by: user.id,
                name,
                target_amount: finalTargetAmount,
                current_amount: 0,
                description,
                deadline,
                target_type: finalTargetType,
                target_blocks: finalTargetBlocks,
                is_active: true,
                is_mandatory: !!is_mandatory,
                amount_per_unit: is_mandatory && calculation_method !== 'coefficient' ? (amount_per_unit || 0) : 0
            })
            .select()
            .single();

        if (error) throw error;

        // --- ASYNC LOGIC: Billing or Announcement ---
        (async () => {
            try {
                if (!units || units.length === 0) return;

                // 2. Fetch community info for branding
                const { data: community } = await supabaseAdmin
                    .from('communities')
                    .select('name, logo_url, currency')
                    .eq('id', communityId)
                    .single();

                const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

                if (is_mandatory) {
                    // GENERATE EXTRAORDINARY FEES (IN EXTRAORDINARY_FEES TABLE)

                    let feeRecords = [];

                    if (calculation_method === 'coefficient') {
                        // Re-normalization Logic
                        // 1. Sum coefficients of TARGETED units
                        const totalCoeff = units.reduce((sum, u) => sum + Number(u.coefficient || 0), 0);

                        if (totalCoeff > 0) {
                            feeRecords = units.map(unit => {
                                const unitCoeff = Number(unit.coefficient || 0);
                                // Formula: (Unit Coeff / Total Group Coeff) * Goal Amount
                                const share = unitCoeff / totalCoeff;
                                let feeAmount = share * Number(goal_amount);

                                // Round to 2 decimals
                                feeAmount = Math.round(feeAmount * 100) / 100;

                                return {
                                    community_id: communityId,
                                    unit_id: unit.id,
                                    amount: feeAmount,
                                    status: 'pending',
                                    campaign_id: campaign.id
                                };
                            });
                        }
                    } else {
                        // Fixed Amount Logic
                        if (amount_per_unit > 0) {
                            feeRecords = units.map(unit => ({
                                community_id: communityId,
                                unit_id: unit.id,
                                amount: amount_per_unit,
                                status: 'pending',
                                campaign_id: campaign.id
                            }));
                        }
                    }

                    if (feeRecords.length > 0) {
                        const { data: fees } = await supabaseAdmin.from('extraordinary_fees').insert(feeRecords).select();

                        // Send Bill Emails
                        if (fees) {
                            for (const fee of fees) {
                                const unit = units.find(u => u.id === fee.unit_id);
                                // Get primary owner
                                const owner = unit.unit_owners?.find(uo => uo.is_primary)?.profile
                                    || unit.unit_owners?.[0]?.profile;

                                if (owner?.email) {
                                    await sendEmail({
                                        email: owner.email,
                                        from: `${community?.name} <info@habiio.com>`,
                                        subject: `Cuota Extraordinaria: ${name} - ${community?.name}`,
                                        templateName: 'monthly_fee_bill.html',
                                        context: {
                                            user_name: owner.full_name || 'Vecino',
                                            period: name,
                                            amount: fee.amount,
                                            currency_symbol: formatCurrency(0, community?.currency || 'USD').replace(/[0-9.,\s]*/g, ''),
                                            unit_details: `${unit.blocks?.name} - ${unit.unit_number}`,
                                            community_name: community?.name,
                                            community_logo: community?.logo_url,
                                            link: `${clientUrl}/app/campaigns/${campaign.id}`,
                                            community_id: communityId
                                        }
                                    });
                                }
                            }
                        }
                    }
                } else {  // SEND OPTIONAL ANNOUNCEMENT
                    const uniqueOwners = Array.from(new Set(units.flatMap(u => u.unit_owners.map(uo => uo.profile)))).filter(p => p.email);

                    for (const owner of uniqueOwners) {
                        await sendEmail({
                            email: owner.email,
                            from: `${community?.name} <info@habiio.com>`,
                            subject: `Nueva Campaña: ${name} - ${community?.name}`,
                            templateName: 'campaign_announcement.html',
                            context: {
                                user_name: owner.full_name || 'Vecino',
                                campaign_name: name,
                                campaign_description: description,
                                community_name: community?.name,
                                community_logo: community?.logo_url,
                                link: `${clientUrl}/app/campaigns/${campaign.id}`,
                                community_id: communityId
                            }
                        });
                    }
                }
            } catch (err) {
                console.error("Error in campaign notification/billing logic:", err);
            }
        })();

        res.status(201).json(campaign);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const roles = member.allRoles || [];

        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'treasurer'].includes(r));
        const isVocal = roles.includes('vocal');

        if (!isAdmin && !isVocal) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { name, goal_amount, description, deadline, is_active } = req.body;

        // Get campaign to check ownership
        const { data: campaign } = await supabaseAdmin
            .from('campaigns')
            .select('created_by, target_blocks')
            .eq('id', id)
            .single();

        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        // Vocals can only update campaigns if they represent ALL targeted blocks
        // (Removing strict ownership check to allow collaboration within the block)
        if (isVocal && !isAdmin) {
            const vocalBlockIds = await getVocalBlocks(member.id);
            const campaignBlocks = campaign.target_blocks || [];

            // If campaign has no blocks or targets 'all', vocal generally shouldn't edit unless they are admin ?
            // Assuming vocals only manage block-specific campaigns.
            if (campaign.target_type === 'all') {
                return res.status(403).json({ error: 'Unauthorized. Vocals cannot edit community-wide campaigns.' });
            }

            // Must represent ALL blocks targeted by the campaign
            const canUpdate = campaignBlocks.length > 0 && campaignBlocks.every(b => vocalBlockIds.includes(b));

            // Fallback: If they created it, they might have created it before becoming a vocal? 
            // Better to stick to "represents block" rule. 
            // Or keep "created_by" as a safe fallback? 
            // User said "Vocals can crud campaigns for the blocks they represent". This implies jurisdiction over ownership.
            // I will enforce jurisdiction.

            if (!canUpdate) {
                return res.status(403).json({ error: 'You can only update campaigns for blocks you represent' });
            }
        }

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
        const roles = member.allRoles || [];
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'treasurer'].includes(r));
        const isVocal = roles.includes('vocal');
        const profile = member.profile;

        let query = supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        const { data: allCampaigns, error } = await query;
        if (error) throw error;

        // Admins see all
        if (isAdmin) {
            return res.json(allCampaigns);
        }

        // Filter for non-admins (Vocals & Residents)
        // Get User's Unit/Block from profile structure
        const myBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id).filter(Boolean) || [];

        let vocalBlockIds = [];
        if (isVocal) {
            vocalBlockIds = await getVocalBlocks(member.id);
        }

        // Visible if:
        // 1. Target is 'all'
        // 2. Target is 'blocks' AND (targets my home block OR targets a block I represent)
        const visibleCampaigns = allCampaigns.filter(c => {
            if (c.target_type === 'all') return true;
            if (c.target_type === 'blocks' && c.target_blocks) {
                const authorizedBlocks = [...new Set([...myBlockIds, ...vocalBlockIds])];
                return c.target_blocks.some(tb => authorizedBlocks.includes(tb));
            }
            return false;
        });

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

        // Self-Healing: Recalculate total collected based on campaign type
        let realTotal = 0;

        if (data.is_mandatory) {
            // Mandatory campaigns: Calculate from extraordinary_fees table
            const { data: paidFees } = await supabaseAdmin
                .from('extraordinary_fees')
                .select('amount')
                .eq('campaign_id', id)
                .eq('status', 'paid');

            realTotal = paidFees?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
        } else {
            // Voluntary campaigns: Calculate from payments table
            const { data: payments } = await supabaseAdmin
                .from('payments')
                .select('amount')
                .eq('campaign_id', id)
                .eq('status', 'confirmed');

            realTotal = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        }

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

exports.deleteCampaign = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const roles = member.allRoles || [];
        const { id } = req.params;

        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'treasurer'].includes(r));
        const isVocal = roles.includes('vocal');

        if (!isAdmin && !isVocal) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Fetch campaign to verify permissions
        const { data: campaign, error: fetchError } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .eq('community_id', communityId)
            .single();

        if (fetchError || !campaign) return res.status(404).json({ error: 'Campaign not found' });

        // Check Permissions
        if (isVocal && !isAdmin) {
            const vocalBlockIds = await getVocalBlocks(member.id, communityId);
            const campaignBlocks = campaign.target_blocks || [];

            if (campaign.target_type === 'all') {
                return res.status(403).json({ error: 'Unauthorized. Vocals cannot delete community-wide campaigns.' });
            }

            const canDelete = campaignBlocks.length > 0 && campaignBlocks.every(b => vocalBlockIds.includes(b));
            if (!canDelete) {
                return res.status(403).json({ error: 'You can only delete campaigns for blocks you represent' });
            }
        }

        const { error } = await supabaseAdmin
            .from('campaigns')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Campaign deleted successfully' });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
