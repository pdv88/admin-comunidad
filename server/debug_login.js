const supabase = require('./src/config/supabaseClient');
const supabaseAdmin = require('./src/config/supabaseAdmin');

async function testLogin() {
    const email = 'owner1@test.com';
    const password = 'password123';

    console.log("Checking Env:", {
        url: process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    console.log("0. Checking Roles...");
    const { data: roles } = await supabaseAdmin.from('roles').select('*');
    if (roles) {
        console.log("Found roles:", roles.map(r => r.name));
    }

    console.log("1. Attempting Auth Sign In...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Auth Error:", error);
        return;
    }
    console.log("Auth Success. User ID:", data.user.id);

    console.log("2. Fetching Profile with Admin Client...");
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*, roles(*)')
        .eq('id', data.user.id)
        .single();

    if (profileError) {
        console.error("Profile Fetch Error:", profileError);
    } else {
        console.log("Profile Fetched:", profile);
    }

    console.log("3. Fetching Profile WITHOUT roles...");
    const { data: profileSimple, error: profileErrorSimple } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (profileErrorSimple) {
        console.error("Simple Profile Fetch Error:", profileErrorSimple);
    } else {
        console.log("Simple Profile Fetched:", profileSimple);
    }
}

testLogin();
