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

// Helper: Get descendant block IDs (copied from notices logic)
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
                units:unit_id (unit_number, blocks(name)),
                blocks:block_id (name)
            `, { count: 'exact' }) // Request total count
            .eq('community_id', communityId);

        // Check if user is an admin (can see private reports)
        const isAdmin = roles.includes('super_admin') || roles.includes('admin') || roles.includes('president') || roles.includes('maintenance') || roles.includes('secretary');

        // RBAC Filtering (Base Scope)
        if (isAdmin) {
            // Admins see ALL reports (public + private)
        } else if (roles.includes('vocal')) {
            // Vocals: Can see public reports in their blocks OR their own reports
            // Filter out private reports (except their own)
            const mode = req.query.mode || 'all'; // 'my', 'block', 'all'

            if (mode === 'my') {
                query = query.eq('user_id', user.id);
            } else if (mode === 'block') {
                const vocalBlockIds = await getVocalBlocks(member.id);
                if (vocalBlockIds.length > 0) {
                    // Only public reports in their blocks
                    query = query.in('block_id', vocalBlockIds).eq('visibility', 'public');
                } else {
                    query = query.eq('1', '0'); // No blocks, no results
                }
            } else {
                // Default: Own reports + public block reports
                const vocalBlockIds = await getVocalBlocks(member.id);
                if (vocalBlockIds.length > 0) {
                    // Own reports (any visibility) OR public block reports
                    query = query.or(`user_id.eq.${user.id},and(block_id.in.(${vocalBlockIds.join(',')}),visibility.eq.public)`);
                } else {
                    query = query.eq('user_id', user.id);
                }
            }
        } else {
            // Resident: See own reports OR public reports for their units/blocks (or target_blocks overlap)
            const myUnitIds = member.profile?.unit_owners?.map(uo => uo.unit_id).filter(Boolean) || [];
            // Get all blocks the user is part of (including parents up to root)
            // For simplicity, let's just check direct blocks and rely on the fact that if a report targets a parent, it effectively targets children?
            // Actually no, the report stores ALL expanded IDs. So we just check if my block ID is in target_blocks.
            const myBlockIds = member.profile?.unit_owners?.map(uo => uo.units?.block_id).filter(Boolean) || [];

            let orConditions = [`user_id.eq.${user.id}`];

            if (myUnitIds.length > 0) {
                orConditions.push(`and(unit_id.in.(${myUnitIds.join(',')}),visibility.eq.public)`);
            }

            // Block Reports (Legacy block_id OR New target_blocks)
            // CRITICAL FIX: Only allow seeing block reports IF unit_id IS NULL.
            // If unit_id is set, it is a private/specific unit report and neighbors should not see it 
            // (unless they are the owner, covered above, or it's a global warning).

            if (myBlockIds.length > 0) {
                // Legacy check: block_id IN myBlocks AND unit_id IS NULL
                const legacyBlockCheck = `and(block_id.in.(${myBlockIds.join(',')}),unit_id.is.null)`;

                // New check: target_blocks overlaps with myBlockIds AND unit_id IS NULL
                // Note: 'target_blocks' usually implies specific blocks. If a unit report also targets blocks? 
                // Usually a unit report targets the unit. If I target Blocks + Unit, it's ambiguous.
                // Let's assume for now Block Targeting implies "Common Area / Whole Block" scope.
                const newBlockCheck = `and(target_blocks.ov.{${myBlockIds.join(',')}},unit_id.is.null)`;

                orConditions.push(`and(or(${legacyBlockCheck},${newBlockCheck}),visibility.eq.public)`);
            }

            // Community Reports (target_type = 'all' or 'community')
            // If it's a community report, everyone sees it.
            // Even if it has a unit_id? 
            // If I set "Community" scope but specify "Unit 101"?
            // The frontend clears unit_id if scope is community.
            // But let's be safe. If target_type is community, it's public.
            orConditions.push(`and(target_type.in.(all,community),visibility.eq.public)`);

            query = query.or(orConditions.join(','));
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

exports.getById = async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

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

        const roles = await getMemberRoles(member.id);
        const isAdmin = roles.some(r => ['super_admin', 'admin', 'president', 'maintenance', 'secretary'].includes(r));
        const isVocal = roles.includes('vocal');

        // Fetch Report
        const { data: report, error } = await supabaseAdmin
            .from('reports')
            .select(`
                *,
                profiles:user_id (full_name, email),
                units:unit_id (unit_number, blocks(name)),
                blocks:block_id (name)
            `)
            .eq('id', id)
            .eq('community_id', communityId)
            .single();

        if (error || !report) return res.status(404).json({ error: 'Report not found' });

        // Permission Check
        let canView = false;
        if (isAdmin) canView = true;
        else if (report.user_id === user.id) canView = true;
        else {
            // Check visibility
            if (report.visibility !== 'public') return res.status(403).json({ error: 'Unauthorized (Private)' });

            // Check Scope
            // 1. Community Scope
            if (report.target_type === 'community' || report.target_type === 'all') canView = true;

            // 2. Block/Unit Scope
            const myBlockIds = member.profile?.unit_owners?.map(uo => uo.units?.block_id).filter(Boolean) || [];

            // Legacy block_id check
            if (report.block_id && myBlockIds.includes(report.block_id)) canView = true;

            // Target Blocks check
            if (report.target_blocks && report.target_blocks.some(tb => myBlockIds.includes(tb))) canView = true;

            // Vocal Check (extra: they see reports in their managed blocks)
            if (isVocal && !canView) {
                const vocalBlocks = await getVocalBlocks(member.id);
                if (report.block_id && vocalBlocks.includes(report.block_id)) canView = true;
                if (report.target_blocks && report.target_blocks.some(tb => vocalBlocks.includes(tb))) canView = true;
            }
        }

        if (!canView) return res.status(403).json({ error: 'Unauthorized' });

        res.json(report);

    } catch (err) {
        console.error('Get Report One Error:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { title, description, category, image_url, unit_id, visibility, target_blocks, target_type } = req.body;
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
        const isAdmin = roles.includes('super_admin') || roles.includes('admin') || roles.includes('president') || roles.includes('secretary') || roles.includes('maintenance');
        const isVocal = roles.includes('vocal');

        // Residents (no roles or only simple 'resident' if that logic existed) are NOT allowed to create reports
        if (!isAdmin && !isVocal) {
            return res.status(403).json({ error: 'Only representatives and admins can create reports.' });
        }

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

            // If it's NOT their own unit, they must represent the block IF a block is specified.
            // If block_id is null, it's a Community report (allowed).
            if (!isOwnUnit && block_id) {
                // Validate permissions on the block
                if (!vocalBlockIds.includes(block_id)) {
                    return res.status(403).json({ error: 'You can only file reports for blocks you represent or your own unit.' });
                }
            }
            // Check target_blocks for Vocals too
            if (!isOwnUnit && target_blocks && target_blocks.length > 0) {
                const hasUnauthorizedBlock = target_blocks.some(id => !vocalBlockIds.includes(id));
                if (hasUnauthorizedBlock) {
                    return res.status(403).json({ error: 'You can only target blocks you represent.' });
                }
            }
        }

        // Expand target_blocks if provided
        let finalTargetBlocks = target_blocks || [];
        if (target_type === 'blocks' && finalTargetBlocks.length > 0) {
            finalTargetBlocks = await getDescendantBlockIds(finalTargetBlocks, communityId);
        } else if (target_type !== 'blocks') {
            finalTargetBlocks = null; // Clean up if not specific blocks
        }

        // Only admins can create private reports
        const reportVisibility = (isAdmin && visibility === 'private') ? 'private' : 'public';

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
                block_id, // Legacy support
                target_blocks: finalTargetBlocks,
                target_type: target_type || 'community',
                status: 'pending',
                visibility: reportVisibility
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
    const { status, title, description, category, block_id, unit_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    let communityId = req.headers['x-community-id'];

    // Handle potential duplicate headers (comma separated or array)
    if (Array.isArray(communityId)) communityId = communityId[0];
    if (communityId && communityId.includes(',')) {
        communityId = communityId.split(',')[0].trim();
    }

    if (!communityId) {
        return res.status(400).json({ error: 'Community ID header missing' });
    }

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        const { data: member, error: memberError } = await supabaseAdmin
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

        if (!member) {
            return res.status(403).json({ error: 'Not a member' });
        }

        const role = member.roles?.name;
        const profile = member.profile;

        // Fetch Report
        const { data: report, error: reportError } = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('id', id)
            .single();

        if (!report) {
            throw new Error('Report not found');
        }
        if (report.community_id !== communityId) {
            return res.status(404).json({ error: 'Report not in this community' });
        }

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
            if (!canUpdateStatus) {
                return res.status(403).json({ error: 'Unauthorized to update status' });
            }
            updates.status = status;
        }

        // Apply Content Update
        if (title || description || category || block_id !== undefined || unit_id !== undefined) {
            if (!canEditContent) {
                return res.status(403).json({ error: 'Unauthorized to edit report content' });
            }
            if (title) updates.title = title;
            if (description) updates.description = description;
            if (category) updates.category = category;
            if (block_id !== undefined) updates.block_id = block_id;
            if (unit_id !== undefined) updates.unit_id = unit_id;
        }

        if (Object.keys(updates).length <= 1) { // only updated_at
            return res.status(400).json({ error: 'No fields to update' });
        }

        const { error: updateError } = await supabaseAdmin
            .from('reports')
            .update(updates)
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }
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
        const roles = await getMemberRoles(member.id); // Use helper to get all roles
        const isVocal = roles.includes('vocal');
        const isPowerUser = roles.some(r => ['super_admin', 'admin', 'president', 'maintenance'].includes(r));

        if (isPowerUser) {
            // Verify report belongs to community
            const { error } = await supabaseAdmin.from('reports').delete().eq('id', id).eq('community_id', communityId);
            if (error) throw error;
        } else {
            // Fetch report to check ownership/block
            const { data: report } = await supabaseAdmin.from('reports').select('user_id, status, community_id, block_id').eq('id', id).single();

            if (!report) return res.status(404).json({ error: 'Report not found' });
            if (report.community_id !== communityId) return res.status(403).json({ error: 'Wrong community' });

            let canDelete = false;

            // 1. Own Report (Pending/Rejected)
            if (report.user_id === user.id && (report.status === 'pending' || report.status === 'rejected')) {
                canDelete = true;
            }

            // 2. Vocal (Block Specific)
            if (!canDelete && isVocal && report.block_id) {
                const vocalBlockIds = await getVocalBlocks(member.id);
                if (vocalBlockIds.includes(report.block_id)) {
                    canDelete = true;
                }
            }

            if (!canDelete) return res.status(403).json({ error: 'Unauthorized' });

            const { error } = await supabaseAdmin.from('reports').delete().eq('id', id);
            if (error) throw error;
        }


        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
