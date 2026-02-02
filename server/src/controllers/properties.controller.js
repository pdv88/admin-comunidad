
const supabase = require('../config/supabaseClient');
const supabaseAdmin = require('../config/supabaseAdmin');

// Helper to get user and their role in the specific community
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

    // Get the community member record
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

    // Fetch roles from member_roles table
    const { data: memberRoles } = await supabaseAdmin
        .from('member_roles')
        .select('roles(name)')
        .eq('member_id', member.id);

    // Map roles to an array of role names for easier checking
    const roles = memberRoles?.map(mr => mr.roles?.name).filter(Boolean) || [];
    member.roles = roles.length > 0 ? { name: roles[0] } : null; // Keep backwards compatible for single role checks
    member.allRoles = roles; // New: array of all role names

    return { user, member, communityId };
};

exports.getAllBlocks = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        let communityId = req.headers['x-community-id'];

        if (communityId && communityId.includes(',')) {
            communityId = communityId.split(',')[0].trim();
        }

        if (!token) return res.status(401).json({ error: 'No token' });
        if (!communityId) return res.status(400).json({ error: 'Community ID missing' });

        // Basic verification
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // Fetch blocks for THIS community
        const { data, error } = await supabase
            .from('blocks')
            .select(`
        *,
        units(
            *,
            unit_owners(
                profiles(*)
            )
        )
            `)
            .eq('community_id', communityId)
            .order('name');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createBlock = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const allowedRoles = ['admin', 'president', 'super_admin'];
        const hasPermission = member.allRoles?.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const blockData = { ...req.body, community_id: communityId };

        // Check for duplicate block name
        const { data: existingBlock } = await supabaseAdmin
            .from('blocks')
            .select('id')
            .eq('community_id', communityId)
            .ilike('name', blockData.name)
            .maybeSingle();

        if (existingBlock) {
            return res.status(400).json({ error: 'A block with this name already exists in the community.' });
        }

        const { data, error } = await supabaseAdmin.from('blocks').insert([blockData]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Error creating block:", err);
        res.status(400).json({ error: err.message });
    }
};

exports.updateBlock = async (req, res) => {
    const { id } = req.params;
    const { representative_id } = req.body;

    try {
        const { member, communityId } = await getUserAndMember(req);
        const allowedRoles = ['admin', 'president', 'super_admin'];
        const hasPermission = member.allRoles?.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabaseAdmin
            .from('blocks')
            .update({ representative_id })
            .eq('id', id)
            .eq('community_id', communityId) // Safety check
            .select();

        if (error) throw error;

        // AUTO-ASSIGN VOCAL ROLE LOGIC
        if (representative_id) {
            // 1. Get the Vocal Role ID
            const { data: vocalRole, error: roleError } = await supabaseAdmin
                .from('roles')
                .select('id')
                .eq('name', 'vocal')
                .single();

            if (roleError) {
                console.error('Error finding vocal role:', roleError);
            }

            if (!roleError && vocalRole) {
                // 2. Get the member_id from community_members
                const { data: targetMember, error: targetError } = await supabaseAdmin
                    .from('community_members')
                    .select('id')
                    .eq('profile_id', representative_id)
                    .eq('community_id', communityId)
                    .single();

                if (targetError) {
                    console.error('Error finding target member:', targetError);
                }

                if (!targetError && targetMember) {
                    // 3. Check if user already has this vocal role for this block
                    const { data: existingRole } = await supabaseAdmin
                        .from('member_roles')
                        .select('id')
                        .eq('member_id', targetMember.id)
                        .eq('role_id', vocalRole.id)
                        .eq('block_id', id)
                        .maybeSingle();

                    // 4. If they don't already have this block's vocal role, add it
                    if (!existingRole) {
                        const { error: insertError } = await supabaseAdmin
                            .from('member_roles')
                            .insert({
                                member_id: targetMember.id,
                                role_id: vocalRole.id,
                                block_id: id
                            });

                        if (insertError) {
                            console.error('Error inserting vocal role:', insertError);
                        }
                    }
                }
            }
        }

        res.json(data[0]);
    } catch (err) {
        console.error("Error updating block:", err);
        res.status(400).json({ error: err.message });
    }
};

exports.createUnit = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);
        const allowedRoles = ['admin', 'president', 'super_admin'];
        const hasPermission = member.allRoles?.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Ensure the block belongs to this community
        const { block_id } = req.body;
        console.log(`[CreateUnit] CommunityID: ${communityId}, BlockID: ${block_id}`);

        if (block_id) {
            const { data: block } = await supabaseAdmin.from('blocks').select('community_id').eq('id', block_id).single();
            console.log(`[CreateUnit] Fetched Block:`, block);

            if (!block || block.community_id !== communityId) {
                console.error(`[CreateUnit] Mismatch! Block Comm: ${block?.community_id} vs Header Comm: ${communityId}`);
                return res.status(400).json({ error: 'Invalid block or community mismatch' });
            }
        }

        // Check for duplicate unit number in this block
        const { unit_number } = req.body;
        const { data: existingUnit } = await supabaseAdmin
            .from('units')
            .select('id')
            .eq('block_id', block_id)
            .ilike('unit_number', unit_number)
            .maybeSingle();

        if (existingUnit) {
            return res.status(400).json({ error: 'A unit with this number already exists in this block.' });
        }

        const { data, error } = await supabaseAdmin.from('units').insert([req.body]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.assignUnitToUser = async (req, res) => {
    const { userId, unitId } = req.body;
    try {
        const { member, communityId } = await getUserAndMember(req);
        const allowedRoles = ['admin', 'president', 'super_admin'];
        const hasPermission = member.allRoles?.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Verify unit belongs to community
        const { data: unit } = await supabaseAdmin.from('units').select('block_id, blocks(community_id)').eq('id', unitId).single();
        if (!unit || unit.blocks?.community_id !== communityId) {
            return res.status(400).json({ error: 'Unit not in this community' });
        }

        // Check if unit is already assigned
        const { data: existingOwner } = await supabaseAdmin
            .from('unit_owners')
            .select('*')
            .eq('unit_id', unitId)
            .single();

        if (existingOwner && existingOwner.profile_id !== userId) {
            return res.status(400).json({ error: 'This unit is already assigned to another user.' });
        }

        // I will switch to `unit_owners` insertion.
        const { data, error } = await supabaseAdmin
            .from('unit_owners')
            .upsert({ profile_id: userId, unit_id: unitId, is_primary: true }) // Assuming schema
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { member, communityId } = await getUserAndMember(req);

        // Get members of this community
        const { data: members, error: membersError } = await supabaseAdmin
            .from('community_members')
            .select('profile:profile_id(*)')
            .eq('community_id', communityId);

        if (membersError) throw membersError;

        // Get all profiles
        const profiles = members.map(m => m.profile).filter(Boolean);
        const profileIds = profiles.map(p => p.id);

        // Get unit_owners for these profiles
        const { data: unitOwners, error: ownersError } = await supabaseAdmin
            .from('unit_owners')
            .select(`
                profile_id,
                unit_id,
                units(id, unit_number, block_id)
            `)
            .in('profile_id', profileIds);

        if (ownersError) throw ownersError;

        // Create a map of profile_id -> unit info
        const unitMap = {};
        (unitOwners || []).forEach(uo => {
            // Only take first unit if user has multiple
            if (!unitMap[uo.profile_id] && uo.units) {
                unitMap[uo.profile_id] = {
                    unit_id: uo.units.id,
                    unit_number: uo.units.unit_number,
                    block_id: uo.units.block_id
                };
            }
        });

        // Combine profile with unit info
        const users = profiles.map(profile => ({
            ...profile,
            unit_id: unitMap[profile.id]?.unit_id || null,
            unit_number: unitMap[profile.id]?.unit_number || null,
            block_id: unitMap[profile.id]?.block_id || null
        }));

        res.json(users);
    } catch (err) {
        console.error('getUsers error:', err);
        res.status(500).json({ error: err.message });
    }
}

exports.deleteBlock = async (req, res) => {
    const { id } = req.params;
    try {
        const { member, communityId } = await getUserAndMember(req);
        const allowedRoles = ['admin', 'president', 'super_admin'];
        const hasPermission = member.allRoles?.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { error } = await supabaseAdmin
            .from('blocks')
            .delete()
            .eq('id', id)
            .eq('community_id', communityId); // Scope

        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteUnit = async (req, res) => {
    const { id } = req.params;
    try {
        const { member, communityId } = await getUserAndMember(req);
        const allowedRoles = ['admin', 'president', 'super_admin'];
        const hasPermission = member.allRoles?.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Verify ownership/community via block?
        // Delete directly with strict check might be complex.
        // Fetch first.
        const { data: unit } = await supabaseAdmin.from('units').select('block_id, blocks(community_id)').eq('id', id).single();
        if (!unit || unit.blocks?.community_id !== communityId) {
            return res.status(403).json({ error: 'Unauthorized or not found' });
        }

        const { error } = await supabaseAdmin.from('units').delete().eq('id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateUnit = async (req, res) => {
    const { id } = req.params;
    const { tenant_name, tenant_email, tenant_phone } = req.body;

    try {
        const { member, communityId } = await getUserAndMember(req);
        const allowedRoles = ['admin', 'president', 'super_admin'];
        const hasPermission = member.allRoles?.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Verify community
        const { data: unit } = await supabaseAdmin.from('units').select('block_id, blocks(community_id)').eq('id', id).single();
        if (!unit || unit.blocks?.community_id !== communityId) {
            return res.status(403).json({ error: 'Unauthorized or not found' });
        }

        const { data, error } = await supabaseAdmin
            .from('units')
            .update({
                tenant_name,
                tenant_email,
                tenant_phone,
                parking_slots: req.body.parking_slots,
                has_storage: req.body.has_storage,
                coefficient: req.body.coefficient
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
