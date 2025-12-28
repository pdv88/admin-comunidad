require('dotenv').config();
const supabase = require('./src/config/supabaseAdmin');

console.log("--- CONFIG CHECK ---");
console.log("CLIENT_URL from env:", process.env.CLIENT_URL);
console.log("Fallback used in code:", process.env.CLIENT_URL || 'http://localhost:5173');

async function testLinkGeneration() {
    console.log("\n--- LINK GENERATION CHECK ---");
    const email = `test_redirect_${Math.floor(Math.random() * 1000)}@example.com`;
    // We don't actually need to create the user to verify the URL logic, 
    // but generateLink requires an existing user usually, or we can use admin.generateLink type invite?
    // Let's create a dummy user first to be safe, matching controller logic.

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { full_name: 'Redirect Tester' }
    });

    if (createError) {
        console.error("User creation failed:", createError);
        return;
    }

    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
            redirectTo: (process.env.CLIENT_URL || 'http://localhost:5173') + '/update-password'
        }
    });

    if (error) {
        console.error("Link generation failed:", error);
    } else {
        console.log("Generated Link:", data.properties.action_link);
        // Clean up
        await supabase.auth.admin.deleteUser(userData.user.id);
    }
}

testLinkGeneration();
