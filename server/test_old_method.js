const supabase = require('./src/config/supabaseAdmin');
const randomstring = require('randomstring');

async function testOldMethod() {
    console.log("Fetching a community ID...");
    const { data: communities } = await supabase.from('communities').select('id').limit(1);
    if (!communities || communities.length === 0) {
        console.error("No communities found.");
        return;
    }
    const communityId = communities[0].id;
    const email = `test_old_${randomstring.generate(5)}@example.com`;

    console.log(`Testing inviteUserByEmail for ${email} with community_id: ${communityId}`);

    // Mimic the "old" working way
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
            full_name: 'Test Old Method',
            community_id: communityId,
            is_admin_registration: false
        },
        redirectTo: 'http://localhost:5173/update-password'
    });

    if (error) {
        console.error("inviteUserByEmail FAILED:", error);
    } else {
        console.log("inviteUserByEmail SUCCESS:", data);
    }
}

testOldMethod();
