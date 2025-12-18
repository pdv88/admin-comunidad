require('dotenv').config();
const supabase = require('./src/config/supabaseClient');
const supabaseAdmin = require('./src/config/supabaseAdmin');

async function testFlow() {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    console.log(`1. Creating user ${testEmail}...`);
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true // Simulating confirmed email
    });

    if (createError) {
        console.error('Create Error:', createError);
        return;
    }
    console.log('User created:', user.user.id);

    console.log('2. Updating password via Admin (simulating reset flow)...');
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.user.id,
        { password: 'NewPassword456!' } // Changing it
    );

    if (updateError) {
        console.error('Update Error:', updateError);
        return;
    }
    console.log('Password updated.');

    console.log('3. Attempting login with NEW password via Client...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'NewPassword456!'
    });

    if (loginError) {
        console.error('Login Error:', loginError);
        // Important: Check if it's 400 or 401
    } else {
        console.log('Login Successful!');
        console.log('Token:', loginData.session ? 'Present' : 'Missing');
    }

    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(user.user.id);
    console.log('Cleanup done.');
}

testFlow();
