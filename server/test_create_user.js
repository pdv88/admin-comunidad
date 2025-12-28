const supabase = require('./src/config/supabaseAdmin');
const randomstring = require('randomstring');

async function testCreate() {
    const email = `test_create_${randomstring.generate(5)}@example.com`;
    console.log(`Testing createUser for ${email}...`);

    // Explicitly using the same params as my controller
    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
            full_name: 'Test Create User',
            is_admin_registration: false,
            // community_id might be needed if I didn't verify it in my SQL?
            // The SQL I gave handles missing metadata safely.
        }
    });

    if (error) {
        console.error("createUser FAILED:", error);
    } else {
        console.log("createUser SUCCESS. ID:", data.user.id);

        // Cleanup because we don't want junk users
        await supabase.auth.admin.deleteUser(data.user.id);
    }
}

testCreate();
