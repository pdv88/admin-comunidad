const supabaseAdmin = require('./src/config/supabaseAdmin');

async function restoreProfiles() {
    const targetEmails = ['owner1@test.com', 'owner2@test.com', 'landlord@test.com'];
    // Hardcoded role ID for 'neighbor' (from previous logs)
    const neighborRoleId = 'd47cc55f-a0d0-4ccd-86fa-7907a072d86e';

    console.log("Fetching auth users to restore profiles...");
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error);
        return;
    }

    const usersToRestore = users.filter(u => targetEmails.includes(u.email));

    if (usersToRestore.length === 0) {
        console.log("No auth users found. Have you deleted them from Auth as well?");
        return;
    }

    for (const u of usersToRestore) {
        // Check if profile exists
        const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('id', u.id).single();

        if (!profile) {
            console.log(`Restoring profile for ${u.email}...`);
            const { error: insertError } = await supabaseAdmin.from('profiles').insert({
                id: u.id,
                email: u.email,
                full_name: u.user_metadata?.full_name || 'Restored User',
                role_id: neighborRoleId,
                // Removed resident_type per previous fix
            });

            if (insertError) {
                console.error(`Failed to restore ${u.email}:`, insertError.message);
            } else {
                console.log(`Success! restored profile for ${u.email}`);
            }
        } else {
            console.log(`Profile already exists for ${u.email}, skipping.`);
        }
    }
    console.log("Restore complete.");
}

restoreProfiles();
