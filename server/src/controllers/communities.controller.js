const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getMyCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    let communityId = req.headers['x-community-id'];

    // Handle potential duplicate header (e.g. "id, id")
    if (communityId && communityId.includes(',')) {
        communityId = communityId.split(',')[0].trim();
    }

    if (!token) return res.status(401).json({ error: 'No token provided' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Verify membership (Bypass RLS to be safe)
        const { data: member, error: memberError } = await supabaseAdmin
            .from('community_members')
            .select('community_id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (memberError || !member) {
            return res.status(404).json({ error: 'Not a member of this community.' });
        }

        // Fetch community details (Bypass RLS)
        const { data: community, error: commError } = await supabaseAdmin
            .from('communities')
            .select('*')
            .eq('id', communityId)
            .single();

        if (commError) throw commError;

        // Fetch Documents
        const { data: documents, error: docsError } = await supabaseAdmin
            .from('community_documents')
            .select('*')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        if (docsError) console.error("Documents fetch error:", docsError);

        res.json({ ...community, documents: documents || [] });

    } catch (err) {
        console.error("Get My Community Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token provided' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {
        // 1. Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Check permission (Admin/President)
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('roles(name)')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) return res.status(403).json({ error: 'Not a member.' });

        // Only super_admin (subscriber) and president can edit community settings
        if (!['super_admin', 'president'].includes(member.roles?.name)) {
            return res.status(403).json({ error: 'Unauthorized to update community settings.' });
        }

        const { name, address, bank_details, base64Logo, currency, country } = req.body;

        // 3. Update Community
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (address !== undefined) updates.address = address;
        if (bank_details !== undefined) updates.bank_details = bank_details;
        if (currency !== undefined) updates.currency = currency;
        if (country !== undefined) updates.country = country;

        // Handle Logo Upload
        if (base64Logo) {
            try {
                // Ensure bucket exists
                const { data: buckets } = await supabaseAdmin.storage.listBuckets();
                const bucketName = 'community-assets';
                if (!buckets.find(b => b.name === bucketName)) {
                    await supabaseAdmin.storage.createBucket(bucketName, { public: true });
                }

                const buffer = Buffer.from(base64Logo.split(',')[1], 'base64');
                const fileName = `logo_${communityId}_${Date.now()}.png`;
                const filePath = `${communityId}/${fileName}`;

                const { error: uploadError } = await supabaseAdmin
                    .storage
                    .from(bucketName)
                    .upload(filePath, buffer, {
                        contentType: 'image/png',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseAdmin
                    .storage
                    .from(bucketName)
                    .getPublicUrl(filePath);

                updates.logo_url = publicUrlData.publicUrl;
            } catch (logoErr) {
                console.error("Logo upload failed:", logoErr);
                // Don't fail the whole request, just log it? Or throw?
                // Let's throw to warn user
                throw new Error('Failed to upload logo: ' + logoErr.message);
            }
        }

        const { data, error } = await supabaseAdmin
            .from('communities')
            .update(updates)
            .eq('id', communityId)
            .select();

        if (error) throw error;

        res.json(data[0]);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { name, address } = req.body;

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Check for Super Admin (Registration Account)
        const isSuperAdmin = user.user_metadata?.is_admin_registration === true;

        if (!isSuperAdmin) {
            return res.status(403).json({ error: 'Only the Super Admin can create new communities.' });
        }

        // 1. Create Community
        const { data: community, error: commError } = await supabaseAdmin
            .from('communities')
            .insert([{ name, address: address || '' }])
            .select()
            .single();

        if (commError) throw commError;

        // 2. Get Super Admin Role ID (Since only Super Admins can create)
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('name', 'super_admin')
            .single();

        if (roleError) throw new Error('Admin role not found');

        // 3. Add User as Admin Member
        const { data: memberData, error: memberError } = await supabaseAdmin
            .from('community_members')
            .insert([{
                community_id: community.id,
                profile_id: user.id,
                role_id: roleData.id
            }])
            .select()
            .single();

        if (memberError) throw memberError;

        // 4. Add to member_roles (Critical for permissions/display)
        if (memberData) {
            const { error: rolesError } = await supabaseAdmin
                .from('member_roles')
                .insert([{
                    member_id: memberData.id,
                    role_id: roleData.id
                }]);

            if (rolesError) throw rolesError;
        }

        res.status(201).json(community);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { id } = req.params;

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!id) return res.status(400).json({ error: 'Community ID is required' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Check for Super Admin (Registration Account)
        const isSuperAdmin = user.user_metadata?.is_admin_registration === true;

        if (!isSuperAdmin) {
            return res.status(403).json({ error: 'Only the account that registered the app can delete communities.' });
        }

        const { error: deleteError } = await supabaseAdmin
            .from('communities')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({ message: 'Community deleted successfully' });

    } catch (err) {
        console.error("Delete Community Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getPublicInfo = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!communityId) return res.status(400).json({ error: 'Community ID header missing' });

    try {


        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // Verify membership (Any member can view this)
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select('id')
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .single();

        if (!member) {
            console.warn(`[PublicInfo] User ${user.id} is not a member of ${communityId}`);
            return res.status(403).json({ error: 'Not a member' });
        }

        // 1. Fetch Community Details (Public Fields + Bank Info)
        const { data: community, error: commError } = await supabaseAdmin
            .from('communities')
            .select('name, address, bank_details, logo_url')
            .eq('id', communityId)
            .single();

        if (commError) {
            console.error(`[PublicInfo] Community Fetch Error:`, commError);
            throw commError;
        }

        // 2. Fetch Leaders (Admin, President, Secretary, Vocal, Treasurer, Security, Maintenance)
        // We need to fetch users who have these roles EITHER in `roles` (legacy) OR `member_roles` (multi)

        // Step 2a: Fetch members with legacy roles
        const { data: legacyMembers, error: legacyError } = await supabaseAdmin
            .from('community_members')
            .select(`
                profile:profile_id(full_name, email, phone),
                roles!inner(name)
            `)
            .eq('community_id', communityId)
            .in('roles.name', ['admin', 'president', 'secretary', 'treasurer', 'vocal', 'security', 'maintenance']);

        if (legacyError) throw legacyError;

        // Step 2b: Fetch members with multi-roles via member_roles
        const { data: multiRoleMembers, error: multiError } = await supabaseAdmin
            .from('member_roles')
            .select(`
                roles!inner(name),
                block_id,
                blocks(name),
                community_members!inner(
                    profile:profile_id(full_name, email, phone),
                    community_id
                )
            `)
            .eq('community_members.community_id', communityId)
            .in('roles.name', ['admin', 'president', 'secretary', 'treasurer', 'vocal', 'security', 'maintenance']);

        if (multiError) throw multiError;

        // Format Leaders List - Group by person (email) to avoid duplicates
        const leadersMap = new Map();

        // Process Legacy Members
        (legacyMembers || []).forEach(m => {
            const email = m.profile.email;
            const roleName = m.roles?.name;

            if (!leadersMap.has(email)) {
                leadersMap.set(email, {
                    name: m.profile.full_name,
                    email: email,
                    phone: m.profile.phone,
                    roles: []
                });
            }

            if (roleName) {
                const leader = leadersMap.get(email);
                if (!leader.roles.some(r => r.role === roleName)) {
                    leader.roles.push({ role: roleName });
                }
            }
        });

        // Process Multi-Role Members
        (multiRoleMembers || []).forEach(r => {
            const email = r.community_members.profile.email;
            const roleName = r.roles.name;
            const blockName = r.blocks?.name;

            if (!leadersMap.has(email)) {
                leadersMap.set(email, {
                    name: r.community_members.profile.full_name,
                    email: email,
                    phone: r.community_members.profile.phone,
                    roles: []
                });
            }

            const leader = leadersMap.get(email);
            // Add role with block info for vocals
            if (roleName === 'vocal' && blockName) {
                leader.roles.push({ role: roleName, block: blockName });
            } else {
                // Check if this role already exists (avoid duplicates)
                if (!leader.roles.some(r => r.role === roleName)) {
                    leader.roles.push({ role: roleName });
                }
            }
        });

        // 3. Fetch Amenities
        const { data: amenities, error: amenitiesError } = await supabaseAdmin
            .from('amenities')
            .select('name, description, reservation_limits')
            .eq('community_id', communityId)
            .order('name');

        if (amenitiesError) {
            console.error(`[PublicInfo] Amenities Fetch Error:`, amenitiesError);
        }

        // 4. Fetch Documents
        const { data: documents, error: docsError } = await supabaseAdmin
            .from('community_documents')
            .select('id, name, url, type, created_at')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });

        if (docsError) {
            console.error(`[PublicInfo] Documents Fetch Error:`, docsError);
        }

        const leaders = Array.from(leadersMap.values());

        res.json({
            community,
            leaders,
            amenities: amenities || [],
            documents: documents || []
        });

    } catch (err) {
        console.error("Get Public Info Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.uploadDocument = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    // Handle potential duplicate header (e.g. "id, id")
    let communityId = req.headers['x-community-id'];
    if (communityId && communityId.includes(',')) {
        communityId = communityId.split(',')[0].trim();
    }

    const { name, base64File } = req.body; // base64File: "data:application/pdf;base64,..."

    if (!token) return res.status(401).json({ error: 'No token' });
    if (!communityId) return res.status(400).json({ error: 'Community ID missing' });
    if (!name || !base64File) return res.status(400).json({ error: 'Name and File required' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Check permission (Admin/President)
        // Check permission (Support both Legacy ID and Multi-Role)
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                roles(name),
                member_roles(
                    roles(name)
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', communityId)
            .maybeSingle();

        if (!member) {
            return res.status(403).json({ error: 'Unauthorized: Member not found' });
        }

        // 1. Legacy Role
        const legacyRole = member?.roles?.name;

        // 2. Multi-Roles
        const multiRoles = member?.member_roles?.map(mr => mr.roles?.name) || [];

        // Combine
        const allRoles = [legacyRole, ...multiRoles].filter(Boolean);
        const allowedRoles = ['super_admin', 'president', 'admin', 'secretary'];

        const hasPermission = allRoles.some(role => allowedRoles.includes(role));

        if (!member || !hasPermission) {
            console.error('[Upload] Unauthorized. Found roles:', allRoles);
            return res.status(403).json({ error: 'Unauthorized', foundRoles: allRoles });
        }

        // Prepare File
        const buffer = Buffer.from(base64File.split(',')[1], 'base64');
        const fileName = `doc_${communityId}_${Date.now()}.pdf`; // Simple naming
        const bucketName = 'community-documents';

        // Ensure bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets.find(b => b.name === bucketName)) {
            await supabaseAdmin.storage.createBucket(bucketName, { public: true });
        }

        // Upload to Storage
        const { error: uploadError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseAdmin
            .storage
            .from(bucketName)
            .getPublicUrl(fileName);

        // Insert into DB
        const { data: doc, error: dbError } = await supabaseAdmin
            .from('community_documents')
            .insert([{
                community_id: communityId,
                name: name,
                url: publicUrlData.publicUrl,
                type: 'guideline',
                created_by: user.id
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        res.json(doc);

    } catch (err) {
        console.error("Upload Document Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDocument = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { id } = req.params;

    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid token');

        // Get Document to check community ownership
        const { data: doc, error: fetchError } = await supabaseAdmin
            .from('community_documents')
            .select('community_id, url')
            .eq('id', id)
            .single();

        if (fetchError || !doc) return res.status(404).json({ error: 'Document not found' });

        // Check permission for THIS community
        const { data: member } = await supabaseAdmin
            .from('community_members')
            .select(`
                roles(name),
                member_roles(
                    roles(name)
                )
            `)
            .eq('profile_id', user.id)
            .eq('community_id', doc.community_id)
            .single();

        const legacyRole = member?.roles?.name;
        const multiRoles = member?.member_roles?.map(mr => mr.roles?.name) || [];
        const allRoles = [legacyRole, ...multiRoles].filter(Boolean);

        const allowedRoles = ['super_admin', 'president', 'admin', 'secretary'];

        const hasPermission = allRoles.some(role => allowedRoles.includes(role));

        if (!member || !hasPermission) {
            console.error('[Delete] Unauthorized. Found roles:', allRoles);
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete from Storage
        const bucketName = 'community-documents';
        // Extract filename from URL (simple split)
        const fileName = doc.url.split('/').pop();

        await supabaseAdmin.storage.from(bucketName).remove([fileName]);

        // Delete from DB
        const { error: deleteError } = await supabaseAdmin
            .from('community_documents')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({ message: 'Document deleted' });

    } catch (err) {
        console.error("Delete Document Error:", err);
        res.status(500).json({ error: err.message });
    }
};
