/**
 * Test: Reports Visibility with Private/Public Toggle
 * 
 * This test verifies:
 *   1. Private reports are only visible to admins
 *   2. Public reports are visible to block residents
 *   3. Residents can always see their own reports (regardless of visibility)
 * 
 * Community Structure:
 *   Building A (Parent Block)
 *     └── Floor 1 (Child Block)
 *           └── Unit 101 (owned by Resident)
 */

require('dotenv').config();
const supabaseAdmin = require('./src/config/supabaseAdmin');

const COMMUNITY_ID = process.env.TEST_COMMUNITY_ID;

async function runTest() {
    console.log('=== Test: Reports Visibility with Private/Public Toggle ===\n');

    if (!COMMUNITY_ID) {
        console.error('ERROR: TEST_COMMUNITY_ID not set. Please set it in your .env file.');
        process.exit(1);
    }

    // Tracking variables for cleanup
    let adminUserId = null;
    let residentUserId = null;
    let parentBlockId = null;
    let childBlockId = null;
    let unitId = null;
    let publicReportId = null;
    let privateReportId = null;
    let residentOwnReportId = null;
    let adminMemberId = null;
    let residentMemberId = null;
    let unitOwnerId = null;
    let adminRoleId = null;
    let neighborRoleId = null;
    let adminMemberRoleId = null;
    let residentMemberRoleId = null;

    try {
        // --- SETUP ---

        console.log('1. Fetching role IDs...');
        const { data: roles } = await supabaseAdmin.from('roles').select('id, name');
        adminRoleId = roles.find(r => r.name === 'admin')?.id;
        neighborRoleId = roles.find(r => r.name === 'neighbor')?.id;

        if (!adminRoleId || !neighborRoleId) {
            throw new Error('Required roles (admin, neighbor) not found');
        }

        console.log('2. Creating users...');
        const { data: adminUser } = await supabaseAdmin.auth.admin.createUser({
            email: `test_admin_${Date.now()}@test.local`,
            password: 'TestPassword123!',
            email_confirm: true
        });
        adminUserId = adminUser.user.id;

        const { data: residentUser } = await supabaseAdmin.auth.admin.createUser({
            email: `test_resident_${Date.now()}@test.local`,
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
        const { data: buildingA } = await supabaseAdmin
            .from('blocks')
            .insert({ name: 'Building A (Visibility Test)', community_id: COMMUNITY_ID })
            .select().single();
        parentBlockId = buildingA.id;

        const { data: floor1 } = await supabaseAdmin
            .from('blocks')
            .insert({ name: 'Floor 1', community_id: COMMUNITY_ID, parent_id: parentBlockId })
            .select().single();
        childBlockId = floor1.id;

        console.log('6. Creating unit...');
        const { data: unit } = await supabaseAdmin
            .from('units')
            .insert({ unit_number: 'T-101', block_id: childBlockId })
            .select().single();
        unitId = unit.id;

        console.log('7. Linking resident as unit owner...');
        const { data: unitOwner } = await supabaseAdmin
            .from('unit_owners')
            .insert({ profile_id: residentUserId, unit_id: unitId })
            .select().single();
        unitOwnerId = unitOwner.id;

        // --- CREATE REPORTS ---

        console.log('8. Creating PUBLIC report by admin...');
        const { data: publicReport, error: publicError } = await supabaseAdmin
            .from('reports')
            .insert({
                user_id: adminUserId,
                community_id: COMMUNITY_ID,
                block_id: parentBlockId,
                title: 'Public Building A Issue',
                description: 'This is a public report',
                category: 'maintenance',
                status: 'pending',
                visibility: 'public'
            })
            .select().single();

        if (publicError) {
            console.error('   Error creating public report:', publicError.message);
            console.log('   → Make sure you have run the migration to add the visibility column!');
            throw publicError;
        }
        publicReportId = publicReport.id;
        console.log(`   Public report: ${publicReportId}`);

        console.log('9. Creating PRIVATE report by admin...');
        const { data: privateReport, error: privateError } = await supabaseAdmin
            .from('reports')
            .insert({
                user_id: adminUserId,
                community_id: COMMUNITY_ID,
                block_id: parentBlockId,
                title: 'Private Internal Issue',
                description: 'This is a private admin-only report',
                category: 'maintenance',
                status: 'pending',
                visibility: 'private'
            })
            .select().single();

        if (privateError) throw privateError;
        privateReportId = privateReport.id;
        console.log(`   Private report: ${privateReportId}`);

        console.log('10. Creating report by RESIDENT (their own)...');
        const { data: residentReport, error: residentReportError } = await supabaseAdmin
            .from('reports')
            .insert({
                user_id: residentUserId,
                community_id: COMMUNITY_ID,
                block_id: childBlockId,
                title: 'My Own Issue',
                description: 'Resident created this',
                category: 'maintenance',
                status: 'pending',
                visibility: 'public'
            })
            .select().single();

        if (residentReportError) throw residentReportError;
        residentOwnReportId = residentReport.id;
        console.log(`   Resident's own report: ${residentOwnReportId}`);

        // --- SIMULATE VISIBILITY CHECKS ---

        console.log('\n--- Testing Visibility ---\n');

        // Get resident's block hierarchy
        const { data: residentUnits } = await supabaseAdmin
            .from('unit_owners')
            .select('unit_id, units(block_id)')
            .eq('profile_id', residentUserId);

        const residentDirectBlockIds = residentUnits?.map(uo => uo.units?.block_id).filter(Boolean) || [];

        // Get parent blocks too
        const allBlockIds = new Set(residentDirectBlockIds);
        for (const blockId of residentDirectBlockIds) {
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

        console.log(`Resident's block hierarchy: ${[...allBlockIds].join(', ')}`);

        // Build resident visibility query (simulating the controller logic)
        // User sees: own reports (any visibility) + public reports in their blocks
        let orConditions = [`user_id.eq.${residentUserId}`];
        if (allBlockIds.size > 0) {
            orConditions.push(`and(block_id.in.(${[...allBlockIds].join(',')}),visibility.eq.public)`);
        }

        const { data: residentVisibleReports } = await supabaseAdmin
            .from('reports')
            .select('id, title, visibility')
            .eq('community_id', COMMUNITY_ID)
            .or(orConditions.join(','));

        console.log(`Reports visible to resident: ${residentVisibleReports.length}`);
        residentVisibleReports.forEach(r => console.log(`   - ${r.title} (${r.visibility})`));

        // --- ASSERTIONS ---

        console.log('\n--- Test Results ---\n');

        const canSeePublic = residentVisibleReports.some(r => r.id === publicReportId);
        const canSeePrivate = residentVisibleReports.some(r => r.id === privateReportId);
        const canSeeOwn = residentVisibleReports.some(r => r.id === residentOwnReportId);

        let allPassed = true;

        // Test 1: Can see public report
        if (canSeePublic) {
            console.log('✅ TEST 1 PASSED: Resident can see PUBLIC block report');
        } else {
            console.log('❌ TEST 1 FAILED: Resident cannot see PUBLIC block report');
            allPassed = false;
        }

        // Test 2: Cannot see private report
        if (!canSeePrivate) {
            console.log('✅ TEST 2 PASSED: Resident CANNOT see PRIVATE report');
        } else {
            console.log('❌ TEST 2 FAILED: Resident CAN see PRIVATE report (security issue!)');
            allPassed = false;
        }

        // Test 3: Can see their own report
        if (canSeeOwn) {
            console.log('✅ TEST 3 PASSED: Resident can see their OWN report');
        } else {
            console.log('❌ TEST 3 FAILED: Resident cannot see their own report');
            allPassed = false;
        }

        if (allPassed) {
            console.log('\n🎉 ALL TESTS PASSED!\n');
        } else {
            console.log('\n⚠️  SOME TESTS FAILED\n');
        }

    } catch (err) {
        console.error('\n❌ TEST ERROR:', err.message);
        console.error(err);
    } finally {
        // --- CLEANUP ---
        console.log('\n--- Cleanup ---');

        if (publicReportId) await supabaseAdmin.from('reports').delete().eq('id', publicReportId);
        if (privateReportId) await supabaseAdmin.from('reports').delete().eq('id', privateReportId);
        if (residentOwnReportId) await supabaseAdmin.from('reports').delete().eq('id', residentOwnReportId);
        console.log('   Deleted reports');

        if (unitOwnerId) await supabaseAdmin.from('unit_owners').delete().eq('id', unitOwnerId);
        if (unitId) await supabaseAdmin.from('units').delete().eq('id', unitId);
        if (childBlockId) await supabaseAdmin.from('blocks').delete().eq('id', childBlockId);
        if (parentBlockId) await supabaseAdmin.from('blocks').delete().eq('id', parentBlockId);
        console.log('   Deleted blocks and units');

        if (adminMemberRoleId) await supabaseAdmin.from('member_roles').delete().eq('id', adminMemberRoleId);
        if (residentMemberRoleId) await supabaseAdmin.from('member_roles').delete().eq('id', residentMemberRoleId);
        if (adminMemberId) await supabaseAdmin.from('community_members').delete().eq('id', adminMemberId);
        if (residentMemberId) await supabaseAdmin.from('community_members').delete().eq('id', residentMemberId);
        console.log('   Deleted members');

        if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
        if (residentUserId) await supabaseAdmin.auth.admin.deleteUser(residentUserId);
        console.log('   Deleted users');

        console.log('\n=== Test Complete ===');
    }
}

runTest();
