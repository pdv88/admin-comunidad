const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

const sendEmail = require('../utils/sendEmail');
const { getCurrencySymbol, formatCurrency } = require('../utils/currencyUtils');

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
        console.log('[DEBUG] Maintenance Role Check:', { role, required: ['super_admin', 'admin', 'president', 'treasurer'] });

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { period, amount, method, total_amount } = req.body;
        // method: 'fixed' | 'coefficient'
        // amount: used for 'fixed' (amount per unit)
        // total_amount: used for 'coefficient' (total budget to distribute)

        if (!period) {
            return res.status(400).json({ error: 'Period is required' });
        }

        // Fetch Community Info (Country)
        const { data: communityData } = await supabaseAdmin
            .from('communities')
            .select('name, logo_url, currency, country')
            .eq('id', communityId)
            .single();

        const communityCountry = communityData?.country || 'MX';
        const calculationMethod = method || (communityCountry === 'ES' ? 'coefficient' : 'fixed');

        // Validation based on method
        if (calculationMethod === 'fixed' && !amount) {
            return res.status(400).json({ error: 'Amount per unit is required for Fixed method' });
        }
        if (calculationMethod === 'coefficient' && !total_amount) {
            return res.status(400).json({ error: 'Total Amount (Budget) is required for Coefficient method' });
        }

        // 1. Get all occupied units
        const { data: units, error: unitsError } = await supabaseAdmin
            .from('units')
            .select('id, unit_number, coefficient, block_id, blocks!inner(community_id, name), unit_owners!inner(id, profile:profile_id(email, full_name))')
            .eq('blocks.community_id', communityId);

        if (unitsError) throw unitsError;
        if (!units || units.length === 0) return res.status(400).json({ error: 'NO_OCCUPIED_UNITS' });

        // Validate coefficients if method is 'coefficient'
        if (calculationMethod === 'coefficient') {
            const unitsWithoutCoeff = units.filter(u => !u.coefficient || Number(u.coefficient) === 0);
            if (unitsWithoutCoeff.length > 0) {
                return res.status(400).json({
                    error: 'MISSING_COEFFICIENTS',
                    units: unitsWithoutCoeff.map(u => ({
                        unit_number: u.unit_number,
                        block_name: u.blocks?.name || 'Unknown Block'
                    }))
                });
            }
        }

        // 2. Check for existing fees
        const { data: existingFees, error: existingError } = await supabaseAdmin
            .from('monthly_fees')
            .select('unit_id')
            .eq('community_id', communityId)
            .eq('period', period);

        if (existingError) throw existingError;

        const existingUnitIds = new Set(existingFees.map(f => f.unit_id));

        // 3. Filter units to bill
        const unitsToBill = units.filter(unit =>
            !existingUnitIds.has(unit.id) &&
            unit.unit_owners &&
            unit.unit_owners.length > 0
        );

        if (unitsToBill.length === 0) {
            return res.status(200).json({ message: 'All occupied units already have fees for this period.', count: 0 });
        }

        // 4. Prepare inserts
        let feeRecords = [];

        if (calculationMethod === 'coefficient') {
            // Distribute total_amount based on coefficient
            // Assumption: Sum of coefficients should be 100 or 1.
            // If they don't sum to 100/1, we calculate based on the unit's share? 
            // Typically: Fee = TotalBudget * (UnitCoefficient / TotalCoefficients)
            // Or just Fee = TotalBudget * (UnitCoefficient / 100) if likely %

            // Let's assume coefficient is a percentage (e.g. 5.23) or fraction (0.0523). 
            // To be safe, we might want to normalize. 
            // BUT, usually in Spain "Coeficiente de Participación" is fixed.
            // Let's try to detect scale. If max coefficient > 1, assume percentage (0-100). If <= 1, assume fraction.
            // Actually simplest is: Fee = total_amount * unit.coefficient (if fraction) or total_amount * (unit.coefficient / 100).

            // For now, let's treat it as a Percentage (0-100) which seems common in systems, or fraction. 
            // Let's check the max value.
            const maxCoeff = Math.max(...unitsToBill.map(u => Number(u.coefficient || 0)));
            const isPercentage = maxCoeff > 1;

            feeRecords = unitsToBill.map(unit => {
                const coeff = Number(unit.coefficient || 0);
                let feeAmount = 0;

                if (isPercentage) {
                    feeAmount = (Number(total_amount) * coeff) / 100;
                } else {
                    feeAmount = Number(total_amount) * coeff;
                }

                // Round to 2 decimals
                feeAmount = Math.round(feeAmount * 100) / 100;

                return {
                    community_id: communityId,
                    unit_id: unit.id,
                    period: period,
                    amount: feeAmount,
                    status: 'pending'
                };
            });

        } else {
            // Fixed Amount
            feeRecords = unitsToBill.map(unit => ({
                community_id: communityId,
                unit_id: unit.id,
                period: period,
                amount: amount,
                status: 'pending'
            }));
        }

        // 5. Insert new records
        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .insert(feeRecords)
            .select();

        if (error) throw error;

        const communityName = communityData?.name || 'Su Comunidad';
        const communityLogo = communityData?.logo_url;
        const communityCurrency = communityData?.currency || 'EUR';

        // 6. Send Email Notifications
        (async () => {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            const link = `${clientUrl}/app/payments`;

            for (const fee of data) {
                try {
                    const unit = units.find(u => u.id === fee.unit_id);
                    if (unit && unit.unit_owners && unit.unit_owners.length > 0) {
                        const ownerProfile = unit.unit_owners[0].profile;
                        if (ownerProfile && ownerProfile.email) {
                            await sendEmail({
                                email: ownerProfile.email,
                                from: `${communityName} <info@habiio.com>`,
                                subject: `Nuevo Recibo de Mantenimiento - ${communityName} - ${period}`,
                                templateName: 'monthly_fee_bill.html',
                                context: {
                                    period: period,
                                    amount: fee.amount,
                                    currency_symbol: getCurrencySymbol(communityCurrency),
                                    unit_details: `${unit.blocks?.name} - ${unit.unit_number}`,
                                    link: link,
                                    community_name: communityName,
                                    community_logo: communityLogo,
                                    user_name: ownerProfile.full_name || 'Vecino',
                                    community_id: communityId
                                }
                            });
                        }
                    }
                } catch (emailErr) {
                    console.error(`Failed to send email for fee ${fee.id}:`, emailErr);
                }
            }
        })();

        res.status(201).json({
            message: `Generated ${data.length} new fees. (${existingUnitIds.size} already existed)`,
            count: data.length,
            method: calculationMethod
        });

    } catch (error) {
        console.error('Generate fees error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.getCommunityStatus = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const {
            page = 1,
            limit = 10,
            sortBy = 'period',
            sortOrder = 'desc',
            period,
            status,
            search,
            block
        } = req.query;

        // Parse to Integers
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // Calculate Range
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;



        // Base Query
        const useInnerJoin = !!search || !!block;

        let selectString = `
            id, period, amount, status, payment_id, updated_at,
            units${useInnerJoin ? '!inner' : ''} (
                id,
                unit_number,
                blocks${useInnerJoin ? '!inner' : ''} (name, community_id),
                unit_owners${useInnerJoin ? '!inner' : ''} (
                    profile:profile_id (full_name, email)
                )
            )
        `;

        let query = supabaseAdmin
            .from('monthly_fees')
            .select(selectString, { count: 'exact' })
            .eq('community_id', communityId);

        // Filters
        if (period) {
            // Assume period is YYYY-MM. 
            const startOfMonth = `${period}-01`;
            const [year, month] = period.split('-').map(Number);
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            query = query.gte('period', startOfMonth).lte('period', endDate);
        }

        if (status) query = query.eq('status', status);

        // Safe Search: Filter by Unit Number (Two-step)
        if (search) {
            const { data: matchingUnits } = await supabaseAdmin
                .from('units')
                .select('id, blocks!inner(community_id)')
                .ilike('unit_number', `%${search}%`)
                .eq('blocks.community_id', communityId);

            const validUnitIds = matchingUnits?.map(u => u.id) || [];

            if (validUnitIds.length > 0) {
                query = query.in('unit_id', validUnitIds);
            } else {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }

        // Safe Search: Filter by Block Name (Two-step)
        if (block) {
            // Find units in matching blocks
            const { data: matchingUnitsInBlock } = await supabaseAdmin
                .from('units')
                .select('id, blocks!inner(name)')
                .ilike('blocks.name', `%${block}%`)
                .eq('blocks.community_id', communityId);

            const validUnitIds = matchingUnitsInBlock?.map(u => u.id) || [];

            if (validUnitIds.length > 0) {
                query = query.in('unit_id', validUnitIds);
            } else {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }

        // Sorting
        // IMPORTANT: Always add a secondary sort by ID to ensure deterministic pagination!
        if (sortBy === 'unit') {
            // Sort by Foreign Column: units(unit_number)
            // Note: This syntax works in recent JS client versions for One-to-One or Many-to-One
            query = query.order('unit_number', { foreignTable: 'units', ascending: sortOrder === 'asc' });
        } else if (sortBy === 'period') {
            query = query.order('period', { ascending: sortOrder === 'asc' });
            // Secondary sort by Unit Number (as a proxy for logical ordering by owner/unit)
            query = query.order('unit_number', { foreignTable: 'units', ascending: true });
        } else if (sortBy === 'status') {
            query = query.order('status', { ascending: sortOrder === 'asc' });
        } else {
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        }

        // Secondary deterministic sort
        query = query.order('id', { ascending: true });

        // Pagination
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        // Process data
        const result = data.map(fee => {
            const owner = fee.units?.unit_owners?.[0]?.profile || { full_name: 'No Owner' };
            return {
                id: fee.id,
                period: fee.period,
                amount: fee.amount,
                status: fee.status,
                payment_id: fee.payment_id,
                unit_number: fee.units?.unit_number,
                block_name: fee.units?.blocks?.name,
                owner_name: owner.full_name,
                owner_email: owner.email,
                updated_at: fee.updated_at
            };
        });

        res.json({
            data: result,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalCount: count
        });

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

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeId } = req.params;
        const { paymentId } = req.body; // Optional: Link to an actual payment transaction

        const updateData = {
            status: 'paid',
            updated_at: new Date().toISOString()
        };
        if (paymentId) updateData.payment_id = paymentId;

        // 1. Update Fee Status
        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .update(updateData)
            .eq('id', feeId)
            .eq('community_id', communityId)
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
            .single();

        if (error) throw error;

        // 2. Prepare Receipt Email (Async)
        (async () => {
            try {
                // Determine owner email
                const unitOwnerLink = data.units?.unit_owners?.[0];
                const ownerProfile = unitOwnerLink?.profile;
                let ownerEmail = ownerProfile?.email;

                // Fallback fetch if missing email
                if (!ownerEmail && unitOwnerLink?.profile_id) {
                    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(unitOwnerLink.profile_id);
                    if (user) ownerEmail = user.email;
                }

                if (ownerEmail) {
                    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

                    // Fetch Community Info
                    const { data: communityData } = await supabaseAdmin
                        .from('communities')
                        .select('name, logo_url, currency')
                        .eq('id', communityId)
                        .single();

                    const communityCurrency = communityData?.currency || 'EUR';

                    await sendEmail({
                        email: ownerEmail,
                        from: `${communityData?.name} <info@habiio.com>`,
                        subject: `Comprobante de Pago - ${communityData?.name}`,
                        templateName: 'payment_receipt.html',
                        context: {
                            user_name: ownerProfile?.full_name || 'Vecino',
                            amount_formatted: formatCurrency(data.amount, communityCurrency),
                            period_name: data.period, // Could format date better
                            unit_details: `${data.units?.blocks?.name} - ${data.units?.unit_number}`,
                            community_name: communityData?.name,
                            community_logo: communityData?.logo_url,
                            payment_date: new Date().toLocaleDateString('es-ES'),
                            payment_id: paymentId || data.id.slice(0, 8),
                            link: `${clientUrl}/app/maintenance`,
                            community_id: communityId // For logging
                        }
                    });
                    // console.log(`Receipt sent to ${ownerEmail}`);
                }
            } catch (emailErr) {
                console.error("Failed to send receipt email:", emailErr);
            }
        })();

        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteFee = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeId } = req.params;

        // Check if fee has payments or is paid
        const { data: fee } = await supabaseAdmin
            .from('monthly_fees')
            .select('payment_id, status')
            .eq('id', feeId)
            .eq('community_id', communityId)
            .single();

        if (fee?.payment_id || fee?.status === 'paid') {
            return res.status(400).json({ error: 'Cannot delete a paid fee.' });
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

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
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

        // Fetch Community Name, Logo and Currency
        const { data: communityData } = await supabaseAdmin
            .from('communities')
            .select('name, logo_url, currency')
            .eq('id', communityId)
            .single();
        const communityName = communityData?.name || 'Su Comunidad';
        const communityLogo = communityData?.logo_url;
        const communityCurrency = communityData?.currency || 'EUR';

        // Conditional Logic: Bill vs Receipt
        const isPaid = fee.status === 'paid';

        const emailConfig = isPaid ? {
            subject: `Comprobante de Pago - ${communityName}`,
            template: 'payment_receipt.html',
            context: {
                user_name: ownerProfile?.full_name || 'Vecino',
                amount_formatted: formatCurrency(fee.amount, communityCurrency),
                period_name: fee.period,
                unit_details: `${fee.units?.blocks?.name} - ${fee.units?.unit_number}`,
                community_name: communityName,
                community_logo: communityLogo,
                payment_date: new Date(fee.updated_at || new Date()).toLocaleDateString('es-ES'),
                payment_id: fee.payment_id || fee.id.slice(0, 8),
                link: link
            }
        } : {
            subject: `Recordatorio: Recibo de Mantenimiento - ${communityName} - ${fee.period}`,
            template: 'monthly_fee_bill.html',
            context: {
                period: fee.period,
                amount: fee.amount,
                currency_symbol: getCurrencySymbol(communityCurrency),
                unit_details: `${fee.units?.blocks?.name} - ${fee.units?.unit_number}`,
                link: link,
                community_name: communityName,
                community_logo: communityLogo,
                user_name: ownerProfile?.full_name || 'Vecino'
            }
        };

        await sendEmail({
            email: ownerEmail,
            from: `${communityName} <info@habiio.com>`,
            subject: emailConfig.subject,
            templateName: emailConfig.template,
            context: {
                ...emailConfig.context,
                community_id: communityId // For logging
            }
        });

        res.json({ message: `Email (${isPaid ? 'Receipt' : 'Bill'}) resent to ${ownerEmail}` });

    } catch (error) {
        console.error("Resend email error:", error);
        res.status(400).json({ error: error.message });
    }
};

exports.getFinancialStats = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 1. Calculate Date Range (Last 6 Months)
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 5); // 5 months back + current = 6
        sixMonthsAgo.setDate(1); // Start of that month

        const startPeriod = sixMonthsAgo.toISOString().slice(0, 7); // YYYY-MM
        const endPeriod = today.toISOString().slice(0, 7); // YYYY-MM

        // 2. Fetch Data
        const { data: fees, error } = await supabaseAdmin
            .from('monthly_fees')
            .select('period, amount, status')
            .eq('community_id', communityId)
            .gte('period', `${startPeriod}-01`);

        if (error) throw error;

        // 3. Aggregate Data
        const statsMap = {};

        // Initialize all months in range to ensure no gaps
        let currentLoopDate = new Date(sixMonthsAgo);
        while (currentLoopDate <= today) {
            const p = currentLoopDate.toISOString().slice(0, 7);
            statsMap[p] = { billed: 0, collected: 0 };
            currentLoopDate.setMonth(currentLoopDate.getMonth() + 1);
        }

        fees.forEach(fee => {
            // Fee period might be YYYY-MM-DD or YYYY-MM. normalizing
            const p = fee.period.slice(0, 7);
            if (statsMap[p]) {
                const amount = parseFloat(fee.amount || 0);
                statsMap[p].billed += amount;
                if (fee.status === 'paid') {
                    statsMap[p].collected += amount;
                }
            }
        });

        // 4. Format for Chart
        // Specific spanish abbreviations for the chart
        const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const result = Object.keys(statsMap).sort().map(key => {
            const [year, month] = key.split('-');
            const monthIndex = parseInt(month, 10) - 1;
            return {
                name: monthsEs[monthIndex],
                fullDate: key,
                billed: statsMap[key].billed,
                collected: statsMap[key].collected
            };
        });

        res.json(result);

    } catch (error) {
        console.error("Financial Stats Error:", error);
        res.status(400).json({ error: error.message });
    }
};

// Bulk delete fees (only those without payments)
exports.bulkDeleteFees = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeIds } = req.body;

        if (!feeIds || !Array.isArray(feeIds) || feeIds.length === 0) {
            return res.status(400).json({ error: 'feeIds array is required' });
        }

        // Find fees without payment_id and not paid (deletable)
        const { data: deletableFees, error: fetchError } = await supabaseAdmin
            .from('monthly_fees')
            .select('id')
            .eq('community_id', communityId)
            .in('id', feeIds)
            .is('payment_id', null)
            .neq('status', 'paid');

        if (fetchError) throw fetchError;

        const deletableIds = deletableFees?.map(f => f.id) || [];

        if (deletableIds.length === 0) {
            return res.status(400).json({ error: 'No deletable fees found (all are paid or have payments).' });
        }

        // Delete the fees
        const { error: deleteError } = await supabaseAdmin
            .from('monthly_fees')
            .delete()
            .eq('community_id', communityId)
            .in('id', deletableIds);

        if (deleteError) throw deleteError;

        res.json({
            message: `${deletableIds.length} fee(s) deleted successfully`,
            count: deletableIds.length,
            skipped: feeIds.length - deletableIds.length
        });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Bulk mark fees as paid
exports.bulkMarkAsPaid = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeIds } = req.body;

        if (!feeIds || !Array.isArray(feeIds) || feeIds.length === 0) {
            return res.status(400).json({ error: 'feeIds array is required' });
        }

        // Update all fees to paid status
        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .update({
                status: 'paid',
                updated_at: new Date().toISOString()
            })
            .eq('community_id', communityId)
            .in('id', feeIds)
            .select('id');

        if (error) throw error;

        // 2. Send emails for all marked fees (Async)
        (async () => {
            // Fetch full details for these fees to get owner emails
            const { data: fullFees } = await supabaseAdmin
                .from('monthly_fees')
                .select(`
                    id, amount, period, payment_id, updated_at,
                    units (
                        unit_number,
                        blocks (name),
                        unit_owners (
                            profile:profile_id (email, full_name)
                        )
                    )
                `)
                .in('id', feeIds);

            if (!fullFees) return;

            // Fetch Community Info
            const { data: communityData } = await supabaseAdmin
                .from('communities')
                .select('name, logo_url, currency')
                .eq('id', communityId)
                .single();

            const communityName = communityData?.name || 'Su Comunidad';
            const communityLogo = communityData?.logo_url;
            const communityCurrency = communityData?.currency || 'EUR';
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

            for (const fee of fullFees) {
                try {
                    const ownerProfile = fee.units?.unit_owners?.[0]?.profile;
                    const ownerEmail = ownerProfile?.email;

                    if (ownerEmail) {
                        await sendEmail({
                            email: ownerEmail,
                            from: `${communityName} <info@habiio.com>`,
                            subject: `Comprobante de Pago - ${communityName}`,
                            templateName: 'payment_receipt.html',
                            context: {
                                user_name: ownerProfile?.full_name || 'Vecino',
                                amount_formatted: formatCurrency(fee.amount, communityCurrency),
                                period_name: fee.period,
                                unit_details: `${fee.units?.blocks?.name} - ${fee.units?.unit_number}`,
                                community_name: communityName,
                                community_logo: communityLogo,
                                payment_date: new Date(fee.updated_at || new Date()).toLocaleDateString('es-ES'),
                                payment_id: fee.payment_id || fee.id.slice(0, 8),
                                link: `${clientUrl}/app/maintenance`,
                                community_id: communityId // For logging
                            }
                        });
                    }
                } catch (emailErr) {
                    console.error(`Failed to send bulk receipt for fee ${fee.id}:`, emailErr);
                }
            }
        })();

        res.json({
            message: `${data.length} fee(s) marked as paid`,
            count: data.length
        });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Revert a paid fee back to pending (only if no payment upload)
exports.revertToPending = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const role = member.roles?.name;

        if (role !== 'super_admin' && role !== 'admin' && role !== 'president' && role !== 'treasurer') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { feeId } = req.params;

        // Check if fee exists and has no payment upload
        const { data: fee, error: fetchError } = await supabaseAdmin
            .from('monthly_fees')
            .select('id, status, payment_id')
            .eq('id', feeId)
            .eq('community_id', communityId)
            .single();

        if (fetchError || !fee) {
            return res.status(404).json({ error: 'Fee not found' });
        }

        if (fee.payment_id) {
            return res.status(400).json({ error: 'Cannot revert a fee with a payment upload. Review the payment instead.' });
        }

        if (fee.status !== 'paid') {
            return res.status(400).json({ error: 'Fee is not marked as paid.' });
        }

        // Revert to pending
        const { data, error } = await supabaseAdmin
            .from('monthly_fees')
            .update({
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', feeId)
            .eq('community_id', communityId)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Fee reverted to pending', data });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
