const supabase = require('./src/config/supabaseAdmin');
const randomstring = require('randomstring');

async function testInvite() {
    const email = `test_invite_${randomstring.generate(5)}@example.com`;
    console.log(`Testing inviteUserByEmail for ${email}...`);

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);

    if (error) {
        console.error("inviteUserByEmail FAILED:", error);
    } else {
        console.log("inviteUserByEmail SUCCESS:", data);
    }
}

testInvite();
