const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get block IDs that a user represents as vocal
const getVocalBlocks = async (memberId) => {
    const { data } = await supabaseAdmin
        .from('member_roles')
        .select('block_id, roles!inner(name)')
        .eq('member_id', memberId)
        .eq('roles.name', 'vocal');
    return data?.map(r => r.block_id).filter(Boolean) || [];
};

// Helper to get user's roles from member_roles table
const getMemberRoles = async (memberId) => {
    const { data } = await supabaseAdmin
        .from('member_roles')
        .select('roles(name)')
        .eq('member_id', memberId);
    return data?.map(r => r.roles?.name).filter(Boolean) || [];
};

exports.getAll = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    // Pagination & Filter Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const category = req.query.category || 'all';

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Fetch Membership
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                roles(name),
                profile:profile_id (
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

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const roles = await getMemberRoles(member.id); // Use new helper
        const profile = member.profile;

        let query = supabaseAdmin
            .from('reports')
            .select(`
                *,
                profiles:user_id (full_name, email),
                units:unit_id (unit_number, blocks(name))
            `, { count: 'exact' }) // Request total count
            .eq('community_id', communityId);

        // RBAC Filtering (Base Scope)
        if (roles.includes('super_admin') || roles.includes('admin') || roles.includes('president') || roles.includes('maintenance') || roles.includes('secretary')) {
            // See ALL reports in community
        } else if (roles.includes('vocal')) {
            // Vocal Logic: Can see BLOCK reports or OWN reports
            // If we want "My Reports" tab specifically, user might send ?scope=my
            // But for general 'getAll', we usually return everything they have access to.
            // If frontend sends specific scope (e.g. 'my' or 'block'), we can respect that too,
            // but let's stick to the secure base logic + filters.

            const mode = req.query.mode || 'all'; // 'my', 'block', 'all'

            if (mode === 'my') {
                query = query.eq('user_id', user.id);
            } else if (mode === 'block') {
                // Use getVocalBlocks instead of unit_owners
                const vocalBlockIds = await getVocalBlocks(member.id);
                if (vocalBlockIds.length > 0) {
                    query = query.in('block_id', vocalBlockIds);
                } else {
                    query = query.eq('1', '0'); // No blocks, no results
                }
            } else {
                // Default Vocal View: Own + Block? Or just enforce what they CAN see?
                // Usually vocal sees everything in their block AND their own stuff.
                // If no mode specified, we return the Union.
                const vocalBlockIds = await getVocalBlocks(member.id);
                if (vocalBlockIds.length > 0) {
                    query = query.or(`block_id.in.(${vocalBlockIds.join(',')}),user_id.eq.${user.id}`);
                } else {
                    query = query.eq('user_id', user.id);
                }
            }

        } else {
            // Resident: See ONLY own reports
            query = query.eq('user_id', user.id);
        }

        // Apply Filters
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        if (category !== 'all') {
            query = query.eq('category', category);
        }
        if (search) {
            // ILIKE search on title, description. 
            // Searching related tables (profiles.full_name) is harder in one query without a view or rpc.
            // For now, let's search title/desc.
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Apply Pagination
        query = query.order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        const { data: reports, count, error } = await query;
        if (error) throw error;

        res.json({ data: reports, count });
    } catch (err) {
        console.error('Get Reports Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { title, description, category, image_url, unit_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('id, profile:profile_id(unit_owners(unit_id))')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member of this community' });

        const roles = await getMemberRoles(member.id);
        const isAdmin = roles.includes('super_admin') || roles.includes('admin') || roles.includes('president') || roles.includes('secretary');
        const isVocal = roles.includes('vocal');

        // If unit_id provided, fetch block_id
        // If NO unit_id, check if block_id was sent explicitly (Block Scope)
        let block_id = req.body.block_id || null;

        if (unit_id) {
            const { data: unit } = await supabaseAdmin
                .from('units')
                .select('block_id')
                .eq('id', unit_id)
                .single();
            if (unit) block_id = unit.block_id;
        }

        // Vocal Restrictions
        if (isVocal && !isAdmin) {
            const vocalBlockIds = await getVocalBlocks(member.id);

            // Check ownership of unit (Residents/Vocals can always report on their own units)
            const ownUnitIds = member.profile?.unit_owners?.map(uo => uo.unit_id) || [];
            const isOwnUnit = unit_id && ownUnitIds.includes(unit_id);

            // If it's NOT their own unit, they must represent the block.
            if (!isOwnUnit) {
                if (!block_id) {
                    // No block context? If they have 1 block, auto-assign.
                    if (vocalBlockIds.length === 1) {
                        block_id = vocalBlockIds[0];
                    } else {
                        // Ambiguous. 
                        return res.status(400).json({ error: 'Block Representatives must specify a block or unit.' });
                    }
                }

                // Validate permissions on the block
                if (!vocalBlockIds.includes(block_id)) {
                    return res.status(403).json({ error: 'You can only file reports for blocks you represent or your own unit.' });
                }
            }
        }

        const { data: report, error } = await supabaseAdmin
            .from('reports')
            .insert([{
                user_id: user.id,
                community_id: communityId,
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
    // status is for status updates. title/desc/category for edits.
    const { status, title, description, category } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                roles(name),
                profile:profile_id (
                     unit_owners(units(block_id))
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });

        const role = member.roles?.name;
        const profile = member.profile;

        // Fetch Report
        const { data: report } = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('id', id)
            .single();

        if (!report) throw new Error('Report not found');
        if (report.community_id !== communityId) return res.status(404).json({ error: 'Report not in this community' });

        // Authorization Logic
        let canUpdateStatus = false;
        let canEditContent = false;

        // 1. Status Update Rights
        if (['super_admin', 'admin', 'president', 'maintenance'].includes(role)) {
            canUpdateStatus = true;
            canEditContent = true; // Admins can edit content too
        } else if (role === 'vocal') {
            const vocalBlockIds = profile.unit_owners?.map(uo => uo.units?.block_id);
            if (vocalBlockIds?.includes(report.block_id)) {
                canUpdateStatus = true;
                canEditContent = true;
            }
        }

        // 2. Content Edit Rights (Owner can edit if pending)
        if (report.user_id === user.id && report.status === 'pending') {
            canEditContent = true;
        }

        const updates = { updated_at: new Date() };

        // Apply Status Update
        if (status) {
            if (!canUpdateStatus) return res.status(403).json({ error: 'Unauthorized to update status' });
            updates.status = status;
        }

        // Apply Content Update
        if (title || description || category) {
            if (!canEditContent) return res.status(403).json({ error: 'Unauthorized to edit report content' });
            if (title) updates.title = title;
            if (description) updates.description = description;
            if (category) updates.category = category;
        }

        if (Object.keys(updates).length <= 1) { // only updated_at
            return res.status(400).json({ error: 'No fields to update' });
        }

        const { error: updateError } = await supabaseAdmin
            .from('reports')
            .update(updates)
            .eq('id', id);

        if (updateError) throw updateError;
        res.json({ message: 'Report updated' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.addNote = async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Check access (simplification: if member of community, technically might be able to add note?? 
        // Better: Same read access as report)
        // For now, simple insert handling.

        const { data: note, error } = await supabaseAdmin
            .from('report_notes')
            .insert([{
                report_id: id,
                user_id: user.id,
                content
            }])
            .select()
            .single();

        if (error) throw error;
        res.json(note);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getNotes = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: notes, error } = await supabaseAdmin
            .from('report_notes')
            .select(`
                *,
                profiles:user_id (full_name, email)
            `)
            .eq('report_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(notes);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.addImage = async (req, res) => {
    const { id } = req.params;
    const { url } = req.body; // URL from client upload
    const token = req.headers.authorization?.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: img, error } = await supabaseAdmin
            .from('report_images')
            .insert([{
                report_id: id,
                url,
                uploaded_by: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        res.json(img);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getImages = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: images, error } = await supabaseAdmin
            .from('report_images')
            .select('*')
            .eq('report_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(images);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteImage = async (req, res) => {
    const { id, imageId } = req.params; // report id, image id
    const token = req.headers.authorization?.split(' ')[1];

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Fetch image to check ownership
        const { data: image } = await supabaseAdmin
            .from('report_images')
            .select('uploaded_by')
            .eq('id', imageId)
            .single();

        if (!image) return res.status(404).json({ error: 'Image not found' });

        // Check permissions: Owner of image or Admin/President
        // We need to fetch the user's role if we want to allow admins to delete others' images.
        // For simplicity/speed, let's fetch the member role.
        let canDelete = false;
        if (image.uploaded_by === user.id) {
            canDelete = true;
        } else {
            const communityId = req.headers['x-community-id'];
            if (communityId) {
                const { data: member } = await supabaseAdmin
                    .from('community_members')
                    .select('roles(name)')
                    .eq('profile_id', user.id)
                    .eq('community_id', communityId)
                    .single();

                const role = member?.roles?.name;
                if (['super_admin', 'admin', 'president'].includes(role)) {
                    canDelete = true;
                }
            }
        }

        if (!canDelete) return res.status(403).json({ error: 'Unauthorized to delete this image' });

        const { error } = await supabaseAdmin
            .from('report_images')
            .delete()
            .eq('id', imageId);

        if (error) throw error;
        res.json({ message: 'Image deleted' });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member' });
        const role = member.roles?.name;

        if (['super_admin', 'admin', 'president'].includes(role)) {
            // Verify report belongs to community
            const { error } = await supabaseAdmin.from('reports').delete().eq('id', id).eq('community_id', communityId);
            if (error) throw error;
        } else {
            // Regular users can only delete their own PENDING reports
            const { data: report } = await supabaseAdmin.from('reports').select('user_id, status, community_id').eq('id', id).single();

            if (!report) return res.status(404).json({ error: 'Report not found' });

            if (report.community_id !== communityId) return res.status(403).json({ error: 'Wrong community' });

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
