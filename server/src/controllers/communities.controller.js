const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.getMyCommunity = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const communityId = req.headers['x-community-id'];

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

        res.json(community);

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

        const { name, address, bank_details, base64Logo, currency } = req.body;

        // 3. Update Community
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (address !== undefined) updates.address = address;
        if (bank_details !== undefined) updates.bank_details = bank_details;
        if (currency !== undefined) updates.currency = currency;

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

        // 1. Create Community
        const { data: community, error: commError } = await supabaseAdmin
            .from('communities')
            .insert([{ name, address: address || '' }])
            .select()
            .single();

        if (commError) throw commError;

        // 2. Get Admin Role ID
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'admin')
            .single();

        if (roleError) throw new Error('Admin role not found');

        // 3. Add User as Admin Member
        const { error: memberError } = await supabaseAdmin
            .from('community_members')
            .insert([{
                community_id: community.id,
                profile_id: user.id,
                role_id: roleData.id
            }]);

        if (memberError) throw memberError;

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
        console.log(`[PublicInfo] Request for CommunityID: ${communityId}`);

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

        // 2. Fetch Leaders (Admin, President, Secretary, Vocal, Treasurer)
        // Use member_roles as the junction table
        const { data: rolesData, error: rolesError } = await supabaseAdmin
            .from('member_roles')
            .select(`
                roles!inner(name),
                community_members!inner(
                    profile:profile_id(full_name, email, phone),
                    community_id
                )
            `)
            .eq('community_members.community_id', communityId)
            .in('roles.name', ['admin', 'president', 'secretary', 'treasurer', 'vocal']);

        if (rolesError) {
            console.error(`[PublicInfo] Leaders Fetch Error:`, rolesError);
            throw rolesError;
        }

        // Format Leaders List
        // member_roles -> community_members -> profile
        const leaders = rolesData.map(r => ({
            role: r.roles.name,
            name: r.community_members.profile.full_name,
            email: r.community_members.profile.email,
            phone: r.community_members.profile.phone
        }));

        console.log(`[PublicInfo] Returned ${leaders.length} leaders for ${community.name}`);

        res.json({
            community,
            leaders
        });

    } catch (err) {
        console.error('Get Public Info Error:', err);
        res.status(500).json({ error: err.message });
    }
};
