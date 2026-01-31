// 0. Setup Supabase
console.log("Supabase URL:", process.env.SUPABASE_URL);
const supabaseAdmin = require('../src/config/supabaseAdmin');
const usersController = require('../src/controllers/users.controller');

// Mock Request/Response
const mockRes = () => {
    const res = {};
    res.statusCode = 200; // Default to 200
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

async function runTest() {
    console.log("Starting Refined Super Admin Deletion Test...");
    const timestamp = Date.now();
    const superEmail = `supertest_${timestamp}@test.com`;
    const sharedMemberEmail = `sharedtest_${timestamp}@test.com`;
    const password = 'password123';

    let superUserId;
    let sharedMemberId;
    let communityA_Id;
    let communityB_Id;

    try {
        // 1. Create Super Admin User
        console.log("Creating Super Admin:", superEmail);
        const { data: superUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: superEmail,
            email_confirm: true,
            password: password,
            user_metadata: { is_admin_registration: true, full_name: 'Super Tester' }
        });
        if (createError) throw createError;
        superUserId = superUser.user.id;

        // 2. Create Two Communities
        console.log("Creating Community A...");
        const { data: commA, error: commAError } = await supabaseAdmin
            .from('communities')
            .insert({ name: `Comm A ${timestamp}`, code: `A${timestamp}` })
            .select()
            .single();
        if (commAError) throw commAError;
        communityA_Id = commA.id;

        console.log("Creating Community B...");
        const { data: commB, error: commBError } = await supabaseAdmin
            .from('communities')
            .insert({ name: `Comm B ${timestamp}`, code: `B${timestamp}` })
            .select()
            .single();
        if (commBError) throw commBError;
        communityB_Id = commB.id;

        // 3. Link Super Admin to Community A
        const { data: adminRole } = await supabaseAdmin.from('roles').select('id').eq('name', 'super_admin').single();
        await supabaseAdmin.from('community_members').insert({
            community_id: communityA_Id,
            profile_id: superUserId,
            role_id: adminRole.id
        });

        // 4. Create Shared Member and link to BOTH
        console.log("Creating Shared Member:", sharedMemberEmail);
        const { data: memUser, error: memError } = await supabaseAdmin.auth.admin.createUser({
            email: sharedMemberEmail,
            email_confirm: true,
            password: password,
            user_metadata: { full_name: 'Shared Member' }
        });
        if (memError) throw memError;
        sharedMemberId = memUser.user.id;

        const { data: resRole } = await supabaseAdmin.from('roles').select('id').eq('name', 'neighbor').single();

        console.log("Linking Shared Member to Community A and B...");
        await supabaseAdmin.from('community_members').insert([
            { community_id: communityA_Id, profile_id: sharedMemberId, role_id: resRole.id },
            { community_id: communityB_Id, profile_id: sharedMemberId, role_id: resRole.id }
        ]);

        console.log("Setup Complete. Shared Member is in A and B. Super Admin owns A.");

        // 5. Execute Deletion for Super Admin (Deletes Community A)
        console.log("Deleting Super Admin (and thus Community A)...");
        const supabase = require('../src/config/supabaseClient');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: superEmail,
            password: password
        });
        if (signInError) throw signInError;
        const token = signInData.session.access_token;

        const req = { params: { id: superUserId }, headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        await usersController.deleteAccount(req, res);

        console.log("Controller Response:", res.statusCode, res.body);

        // 6. Verification Part 1
        console.log("Verifying Part 1 (Shared member should remain)...");
        const { data: checkCommA } = await supabaseAdmin.from('communities').select('id').eq('id', communityA_Id).single();
        const { data: checkMemberAuth } = await supabaseAdmin.auth.admin.getUserById(sharedMemberId);
        const { data: checkMemberA } = await supabaseAdmin.from('community_members').select('*').eq('profile_id', sharedMemberId).eq('community_id', communityA_Id).single();
        const { data: checkMemberB } = await supabaseAdmin.from('community_members').select('*').eq('profile_id', sharedMemberId).eq('community_id', communityB_Id).single();

        if (checkCommA) console.error("FAILED: Community A still exists!");
        else console.log("PASSED: Community A deleted.");

        if (checkMemberAuth && checkMemberAuth.user) console.log("PASSED: Shared Member still exists in Auth.");
        else console.error("FAILED: Shared Member deleted from Auth prematurely!");

        if (checkMemberA) console.error("FAILED: Membership in A still exists!");
        else console.log("PASSED: Membership in A removed.");

        if (checkMemberB) console.log("PASSED: Membership in B preserved.");
        else console.error("FAILED: Membership in B lost!");

        // 7. Verification Part 2 (Delete Community B and see if member is gone)
        console.log("Final Step: Manually deleting Community B to see if Shared Member is finally removed from Auth...");
        // Since we don't have a direct "delete community" that does this logic in the controller yet (it's inside deleteAccount)
        // We'll simulate it by deleting the last membership and then expecting the user to be gone if we were to clean up.
        // Actually, let's just create ANOTHER Super Admin who owns Community B and delete THEM.

        const superB_Email = `superB_${timestamp}@test.com`;
        const { data: superB } = await supabaseAdmin.auth.admin.createUser({
            email: superB_Email, email_confirm: true, password: password, user_metadata: { is_admin_registration: true }
        });
        await supabaseAdmin.from('community_members').insert({
            community_id: communityB_Id, profile_id: superB.user.id, role_id: adminRole.id
        });

        const { data: signInB } = await supabase.auth.signInWithPassword({ email: superB_Email, password: password });
        const reqB = { params: { id: superB.user.id }, headers: { authorization: `Bearer ${signInB.session.access_token}` } };
        const resB = mockRes();
        await usersController.deleteAccount(reqB, resB);

        console.log("Verifying Part 2 (Shared member should now be gone)...");
        const { data: checkMemberAuthFinal } = await supabaseAdmin.auth.admin.getUserById(sharedMemberId);
        if (checkMemberAuthFinal && checkMemberAuthFinal.user) console.error("FAILED: Shared Member still exists in Auth after last community deleted!");
        else console.log("PASSED: Shared Member finally deleted from Auth.");

    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        console.log("Test Finished.");
        process.exit(0);
    }
}

runTest();
