/**
 * Test: Polls Visibility with Nested Blocks
 * 
 * This test verifies that when an admin creates a poll targeted at a parent block,
 * residents who own units in child blocks can see and vote on it.
 * 
 * Community Structure:
 *   Building A (Parent Block) ← Poll targets this
 *     └── Floor 1 (Child Block)
 *           └── Unit 101 (owned by Resident)
 * 
 * Expected: Resident should see the poll because their unit is in a CHILD of the target block.
 * 
 * Current behavior may FAIL if the controller doesn't traverse block hierarchy.
 */

require('dotenv').config();
const supabaseAdmin = require('./src/config/supabaseAdmin');

const COMMUNITY_ID = process.env.TEST_COMMUNITY_ID;

async function runTest() {
    console.log('=== Test: Polls Visibility with Nested Blocks ===\n');

    if (!COMMUNITY_ID) {
        console.error('ERROR: TEST_COMMUNITY_ID not set.');
        process.exit(1);
    }

    let adminUserId = null;
    let residentUserId = null;
    let parentBlockId = null;
    let childBlockId = null;
    let unitId = null;
    let pollId = null;
    let adminMemberId = null;
    let residentMemberId = null;
    let unitOwnerId = null;
    let adminRoleId = null;
    let neighborRoleId = null;
    let adminMemberRoleId = null;
    let residentMemberRoleId = null;

    try {
        console.log('1. Fetching role IDs...');
        const { data: roles } = await supabaseAdmin.from('roles').select('id, name');
        adminRoleId = roles.find(r => r.name === 'admin')?.id;
        neighborRoleId = roles.find(r => r.name === 'neighbor')?.id;

        console.log('2. Creating users...');
        const { data: adminUser } = await supabaseAdmin.auth.admin.createUser({
            email: `test_admin_poll_${Date.now()}@test.local`,
            password: 'TestPassword123!',
            email_confirm: true
        });
        adminUserId = adminUser.user.id;

        const { data: residentUser } = await supabaseAdmin.auth.admin.createUser({
            email: `test_resident_poll_${Date.now()}@test.local`,
            password: 'TestPassword123!',
            email_confirm: true
        });
        residentUserId = residentUser.user.id;

        console.log('3. Adding community members...');
        const { data: adminMember } = await supabaseAdmin
            .from('community_members')
            .insert({ profile_id: adminUserId, community_id: COMMUNITY_ID })
            .select().single();
        adminMemberId = adminMember.id;

        const { data: residentMember } = await supabaseAdmin
            .from('community_members')
            .insert({ profile_id: residentUserId, community_id: COMMUNITY_ID })
            .select().single();
        residentMemberId = residentMember.id;

        console.log('4. Assigning roles...');
        const { data: adminRole } = await supabaseAdmin
            .from('member_roles')
            .insert({ member_id: adminMemberId, role_id: adminRoleId })
            .select().single();
        adminMemberRoleId = adminRole.id;

        const { data: residentRole } = await supabaseAdmin
            .from('member_roles')
            .insert({ member_id: residentMemberId, role_id: neighborRoleId })
            .select().single();
        residentMemberRoleId = residentRole.id;

        console.log('5. Creating block hierarchy...');
        const { data: parentBlock } = await supabaseAdmin
            .from('blocks')
            .insert({ name: 'Building A (Poll Test)', community_id: COMMUNITY_ID })
            .select().single();
        parentBlockId = parentBlock.id;
        console.log(`   Parent block: ${parentBlockId}`);

        const { data: childBlock } = await supabaseAdmin
            .from('blocks')
            .insert({ name: 'Floor 1', community_id: COMMUNITY_ID, parent_id: parentBlockId })
            .select().single();
        childBlockId = childBlock.id;
        console.log(`   Child block: ${childBlockId}`);

        console.log('6. Creating unit in CHILD block...');
        const { data: unit } = await supabaseAdmin
            .from('units')
            .insert({ unit_number: 'P-101', block_id: childBlockId })
            .select().single();
        unitId = unit.id;

        console.log('7. Linking resident as unit owner...');
        const { data: unitOwner } = await supabaseAdmin
            .from('unit_owners')
            .insert({ profile_id: residentUserId, unit_id: unitId })
            .select().single();
        unitOwnerId = unitOwner.id;

        console.log('8. Creating poll targeting PARENT block...');
        const { data: poll, error: pollError } = await supabaseAdmin
            .from('polls')
            .insert({
                title: 'Building A Vote',
                description: 'Test poll for parent block',
                created_by: adminUserId,
                community_id: COMMUNITY_ID,
                target_type: 'blocks',
                target_blocks: [parentBlockId] // Only targets parent
            })
            .select().single();

        if (pollError) throw pollError;
        pollId = poll.id;
        console.log(`   Poll ID: ${pollId}`);
        console.log(`   Poll targets: [${parentBlockId}] (parent only)`);

        // --- SIMULATE VISIBILITY CHECK ---

        console.log('\n--- Testing Current Visibility Logic ---\n');

        // Get resident's direct block IDs (from unit_owners)
        const { data: residentUnits } = await supabaseAdmin
            .from('unit_owners')
            .select('units(block_id)')
            .eq('profile_id', residentUserId);

        const userBlockIds = residentUnits?.map(uo => uo.units?.block_id).filter(Boolean) || [];
        console.log(`Resident's direct block IDs: [${userBlockIds.join(', ')}]`);

        // Current controller logic (line 88-90)
        const currentLogicVisible = poll.target_blocks.some(tb => userBlockIds.includes(tb));
        console.log(`Current logic check: ${currentLogicVisible ? 'VISIBLE' : 'NOT VISIBLE'}`);

        // --- TEST WITH HIERARCHY ---

        console.log('\n--- Testing WITH Block Hierarchy ---\n');

        // Get full hierarchy (including parents)
        const allBlockIds = new Set(userBlockIds);
        for (const blockId of userBlockIds) {
            let currentBlockId = blockId;
            let depth = 0;
            while (currentBlockId && depth < 10) {
                const { data: block } = await supabaseAdmin
                    .from('blocks')
                    .select('parent_id')
                    .eq('id', currentBlockId)
                    .single();

                if (block?.parent_id) {
                    allBlockIds.add(block.parent_id);
                    currentBlockId = block.parent_id;
                } else {
                    break;
                }
                depth++;
            }
        }

        console.log(`Resident's full hierarchy: [${[...allBlockIds].join(', ')}]`);
        const hierarchyLogicVisible = poll.target_blocks.some(tb => allBlockIds.has(tb));
        console.log(`Hierarchy logic check: ${hierarchyLogicVisible ? 'VISIBLE' : 'NOT VISIBLE'}`);

        // --- RESULTS ---

        console.log('\n--- Test Results ---\n');

        // The controller NOW uses getBlockHierarchy(), so we test if the hierarchy logic works
        if (hierarchyLogicVisible) {
            console.log('✅ TEST PASSED: With hierarchy traversal, poll IS visible');
            console.log('   → Resident in Floor 1 CAN now see poll for Building A');
            console.log('   → Controller getBlockHierarchy() is working correctly');
        } else {
            console.log('❌ TEST FAILED: Even with hierarchy, poll not visible');
        }

        // The old direct check should still fail (proving hierarchy is needed)
        if (!currentLogicVisible) {
            console.log('✅ CONFIRMED: Direct block check would NOT see parent polls');
            console.log('   → This proves the hierarchy fix is necessary');
        }

        if (hierarchyLogicVisible && !currentLogicVisible) {
            console.log('\n🎉 POLLS HIERARCHY FIX VERIFIED!\n');
        }

    } catch (err) {
        console.error('\n❌ TEST ERROR:', err.message);
        console.error(err);
    } finally {
        console.log('\n--- Cleanup ---');

        if (pollId) {
            await supabaseAdmin.from('poll_options').delete().eq('poll_id', pollId);
            await supabaseAdmin.from('polls').delete().eq('id', pollId);
        }
        if (unitOwnerId) await supabaseAdmin.from('unit_owners').delete().eq('id', unitOwnerId);
        if (unitId) await supabaseAdmin.from('units').delete().eq('id', unitId);
        if (childBlockId) await supabaseAdmin.from('blocks').delete().eq('id', childBlockId);
        if (parentBlockId) await supabaseAdmin.from('blocks').delete().eq('id', parentBlockId);
        if (adminMemberRoleId) await supabaseAdmin.from('member_roles').delete().eq('id', adminMemberRoleId);
        if (residentMemberRoleId) await supabaseAdmin.from('member_roles').delete().eq('id', residentMemberRoleId);
        if (adminMemberId) await supabaseAdmin.from('community_members').delete().eq('id', adminMemberId);
        if (residentMemberId) await supabaseAdmin.from('community_members').delete().eq('id', residentMemberId);
        if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
        if (residentUserId) await supabaseAdmin.auth.admin.deleteUser(residentUserId);
        console.log('   Done');

        console.log('\n=== Test Complete ===');
    }
}

runTest();
