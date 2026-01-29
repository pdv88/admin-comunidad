const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get user and their member info
const getUserAndMember = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    let communityId = req.headers['x-community-id'];

    if (communityId && communityId.includes(',')) {
        communityId = communityId.split(',')[0].trim();
    }

    if (!token) throw new Error('No token provided');
    if (!communityId) throw new Error('Community ID header missing');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');

    const { data: member, error: memberError } = await supabaseAdmin
        .from('community_members')
        .select(`
            id,
            profile: profile_id(*)
        `)
        .eq('profile_id', user.id)
        .eq('community_id', communityId)
        .single();

    if (memberError || !member) throw new Error('Not a member of this community');

    // Fetch roles
    const { data: memberRoles, error: rolesError } = await supabaseAdmin
        .from('member_roles')
        .select('roles(name)')
        .eq('member_id', member.id);

    // Flatten roles
    const roles = memberRoles?.map(mr => mr.roles?.name).filter(Boolean) || [];
    member.roleNames = roles;

    return { user, member, communityId };
};

exports.getAmenities = async (req, res) => {
    try {
        const { communityId } = await getUserAndMember(req);

        const { data, error } = await supabaseAdmin
            .from('amenities')
            .select('*')
            .eq('community_id', communityId)
            .order('name');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createAmenity = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const isAdmin = member.roleNames.includes('admin') || member.roleNames.includes('president');

        if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });

        const { name, description, is_reservable, reservation_limits } = req.body;

        const { data, error } = await supabaseAdmin
            .from('amenities')
            .insert([{
                community_id: communityId,
                name,
                description,
                is_reservable,
                reservation_limits
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateAmenity = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const isAdmin = member.roleNames.includes('admin') || member.roleNames.includes('president');

        if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabaseAdmin
            .from('amenities')
            .update(updates)
            .eq('id', id)
            .eq('community_id', communityId)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteAmenity = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const isAdmin = member.roleNames.includes('admin') || member.roleNames.includes('president');

        if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });

        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('amenities')
            .delete()
            .eq('id', id)
            .eq('community_id', communityId);

        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// --- Reservations ---

exports.getReservations = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const isAdmin = member.roleNames.includes('admin') || member.roleNames.includes('president') || member.roleNames.includes('secretary');

        let query = supabaseAdmin
            .from('reservations')
            .select(`
                *,
                amenities(name),
                units(unit_number, block_id, blocks(id, name))
            `)
            .eq('community_id', communityId);

        const { data: reservations, error } = await query.order('date', { ascending: false });

        if (error) throw error;

        // Manually fetch profiles since foreign key is to auth.users, not profiles table
        if (reservations && reservations.length > 0) {
            const userIds = [...new Set(reservations.map(r => r.user_id))];
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);

            const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

            reservations.forEach(r => {
                r.profiles = profileMap[r.user_id] || { full_name: 'Unknown User', email: '' };
            });
        }

        res.json(reservations || []);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createReservation = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const { amenity_id, date, start_time, end_time, notes, target_user_id } = req.body;

        // 1. Fetch Amenity Details & Limits
        const { data: amenity } = await supabaseAdmin
            .from('amenities')
            .select('*')
            .eq('id', amenity_id)
            .single();

        if (!amenity || !amenity.is_reservable) {
            return res.status(400).json({ error: 'Amenity not found or not reservable' });
        }

        const isAdmin = member.roleNames.includes('admin') || member.roleNames.includes('president');

        // Determine Subject User (Who is this reservation for?)
        let subjectUserId = user.id;
        if (isAdmin && target_user_id) {
            subjectUserId = target_user_id;
        }

        // 2. Determine Unit (Subject User must have a unit)
        const { data: unitOwner } = await supabaseAdmin
            .from('unit_owners')
            .select('unit_id, units!inner(id, blocks!inner(community_id))')
            .eq('profile_id', subjectUserId)
            .eq('units.blocks.community_id', communityId)
            .limit(1)
            .single();

        const unitId = unitOwner?.unit_id;

        // 3. Check Availability (Overlap) - Global Check
        const { data: overlaps } = await supabaseAdmin
            .from('reservations')
            .select('id')
            .eq('amenity_id', amenity_id)
            .eq('date', date)
            .in('status', ['approved', 'pending'])
            .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`)
            .lt('start_time', end_time)
            .gt('end_time', start_time);

        if (overlaps && overlaps.length > 0) {
            return res.status(400).json({ error: 'Time slot already reserved or pending.' });
        }

        // 4. Check Limits & Availability Rules
        // Limits now ALWAYS apply to the SUBJECT USER
        if (amenity.reservation_limits) {
            const limits = amenity.reservation_limits;

            // Check Allowed Days
            if (limits.allowed_days && Array.isArray(limits.allowed_days)) {
                const [y, m, d] = date.split('-').map(Number);
                const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 = Sun

                if (!limits.allowed_days.includes(dayOfWeek)) {
                    return res.status(400).json({ error: 'Amenities are closed on this day.' });
                }
            }

            // Check Exception Days (Holidays/Maintenance)
            if (limits.exception_days && Array.isArray(limits.exception_days)) {
                if (limits.exception_days.includes(date)) {
                    return res.status(400).json({ error: 'Amenity is closed on this date (Holiday/Maintenance).' });
                }
            }

            // Check Time Range
            if (limits.schedule_start && limits.schedule_end) {
                const sTime = start_time.length === 5 ? start_time + ':00' : start_time;
                const eTime = end_time.length === 5 ? end_time + ':00' : end_time;
                const lStart = limits.schedule_start.length === 5 ? limits.schedule_start + ':00' : limits.schedule_start;
                const lEnd = limits.schedule_end.length === 5 ? limits.schedule_end + ':00' : limits.schedule_end;

                if (lStart <= lEnd) {
                    if (sTime < lStart || eTime > lEnd) {
                        return res.status(400).json({ error: `Reservation must be within opening hours (${limits.schedule_start} - ${limits.schedule_end}).` });
                    }
                } else {
                    if (sTime > lEnd && sTime < lStart) {
                        return res.status(400).json({ error: `Reservation start time is outside opening hours (${limits.schedule_start} - ${limits.schedule_end}).` });
                    }
                    if (eTime > lEnd && eTime < lStart) {
                        return res.status(400).json({ error: `Reservation end time is outside opening hours (${limits.schedule_start} - ${limits.schedule_end}).` });
                    }
                }
            }

            // Check Monthly Limit (Max Days per Month)
            if (limits.max_days_per_month) {
                const [year, month] = date.split('-').map(Number);
                const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
                const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

                let query = supabaseAdmin
                    .from('reservations')
                    .select('id', { count: 'exact', head: true })
                    .eq('amenity_id', amenity_id)
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
                    .in('status', ['approved', 'pending']);

                if (unitId) {
                    query = query.eq('unit_id', unitId);
                } else {
                    query = query.eq('user_id', subjectUserId);
                }

                const { count, error: countError } = await query;
                if (countError) throw countError;

                if (count >= limits.max_days_per_month) {
                    return res.status(400).json({ error: `Monthly reservation limit reached. Max ${limits.max_days_per_month} reservations per month.` });
                }
            }

            if (limits.max_hours_per_day) {
                // Calculate duration requested
                const start = new Date(`1970-01-01T${start_time}`);
                const end = new Date(`1970-01-01T${end_time}`);
                const durationHours = (end - start) / (1000 * 60 * 60);

                // Fetch existing reservations for this unit/user on this date
                let query = supabaseAdmin
                    .from('reservations')
                    .select('start_time, end_time')
                    .eq('amenity_id', amenity_id)
                    .eq('date', date)
                    .in('status', ['approved', 'pending']);

                if (unitId) {
                    query = query.eq('unit_id', unitId);
                } else {
                    query = query.eq('user_id', subjectUserId);
                }

                const { data: existing } = await query;

                const existingHours = (existing || []).reduce((acc, r) => {
                    const s = new Date(`1970-01-01T${r.start_time}`);
                    const e = new Date(`1970-01-01T${r.end_time}`);
                    return acc + ((e - s) / (1000 * 60 * 60));
                }, 0);

                if ((existingHours + durationHours) > limits.max_hours_per_day) {
                    return res.status(400).json({ error: `Daily limit exceeded. Max ${limits.max_hours_per_day} hours allowed.` });
                }
            }
        }

        // 5. Create
        const { data, error } = await supabaseAdmin
            .from('reservations')
            .insert([{
                community_id: communityId,
                amenity_id,
                user_id: subjectUserId,
                unit_id: unitId,
                date,
                start_time,
                end_time,
                notes,
                status: isAdmin ? 'approved' : 'pending' // Admins auto-approve? Let's say yes for now, or maybe pending. User didn't specify. Assuming approved if admin.
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Create Reservation Error:", err);
        res.status(400).json({ error: err.message });
    }
};

exports.updateReservationStatus = async (req, res) => {
    try {
        const { user, member, communityId } = await getUserAndMember(req);
        const isAdmin = member.roleNames.includes('admin') || member.roleNames.includes('president');

        const { id } = req.params;
        const { status, admin_notes } = req.body; // status: 'approved' | 'rejected' | 'cancelled'

        if (!['approved', 'rejected', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Fetch reservation to check ownership
        const { data: reservation, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .eq('id', id)
            .eq('community_id', communityId)
            .single();

        if (fetchError || !reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        const isOwner = reservation.user_id === user.id;

        // Authorization Logic
        // Admin: can do anything
        // Owner: can only 'cancelled'
        if (!isAdmin) {
            if (!isOwner) return res.status(403).json({ error: 'Unauthorized' });
            if (status !== 'cancelled') return res.status(403).json({ error: 'Only admins can approve/reject' });
        }

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({ status, admin_notes })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
