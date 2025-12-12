const supabaseAdmin = require('./src/config/supabaseAdmin');

async function deleteUsers() {
    const targetEmails = ['owner1@test.com', 'owner2@test.com', 'landlord@test.com'];

    console.log("Fetching users to delete...");
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error);
        return;
    }

    const usersToDelete = users.filter(u => targetEmails.includes(u.email));

    if (usersToDelete.length === 0) {
        console.log("No test users found to delete.");
        return;
    }

    for (const u of usersToDelete) {
        console.log(`Deleting user: ${u.email} (${u.id})...`);

        // 1. Delete from Profiles first (to avoid FK constraints if cascade isn't set, though it should be)
        const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', u.id);
        if (profileError) console.log(`Warning: Could not delete profile for ${u.email} (might already be gone)`);

        // 2. Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(u.id);
        if (authError) {
            console.error(`Error deleting auth user ${u.email}:`, authError.message);
        } else {
            console.log(`Successfully deleted ${u.email}`);
        }
    }
    console.log("Deletion complete.");
}

deleteUsers();
