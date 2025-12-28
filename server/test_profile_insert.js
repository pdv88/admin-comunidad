const supabase = require('./src/config/supabaseAdmin');
const crypto = require('crypto');

async function testInsert() {
    const id = crypto.randomUUID();
    console.log(`Testing profile insert for fake ID: ${id}`);

    // Attempt insert with MINIMAL fields matching what the trigger tries to do
    const { data, error } = await supabase.from('profiles').insert({
        id: id,
        email: 'test_manual_insert@example.com',
        full_name: 'Test Manual Insert'
    });

    if (error) {
        console.error("Profile Insert FAILED:", error);
        console.error("This confirms that the 'profiles' table has required fields (like unit_number?) that are missing.");
    } else {
        console.log("Profile Insert SUCCESS.");
        // Cleanup
        await supabase.from('profiles').delete().eq('id', id);
    }
}

testInsert();
