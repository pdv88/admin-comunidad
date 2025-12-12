const supabaseAdmin = require('./src/config/supabaseAdmin');

async function createUsers() {
    const users = [
        { email: 'owner1@test.com', password: 'password123', full_name: 'Test Owner 1', resident_type: 'owner' },
        { email: 'owner2@test.com', password: 'password123', full_name: 'Test Owner 2', resident_type: 'owner' },
        { email: 'landlord@test.com', password: 'password123', full_name: 'Test Landlord', resident_type: 'owner' }
    ];

    console.log("Creating users...");

    for (const u of users) {
        // 1. Create User in Auth
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name }
        });

        if (error) {
            console.error(`Error creating ${u.email}:`, error.message);
            continue;
        }

        console.log(`Created Auth User: ${u.email} (${data.user.id})`);

        // 2. Create Profile (if not created by trigger)
        // We check if profile exists first
        const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('id', data.user.id).single();

        if (!profile) {
            const { error: profileError } = await supabaseAdmin.from('profiles').insert({
                id: data.user.id,
                email: u.email,
                full_name: u.full_name,
                // Assign a default role ID for 'neighbor' (using ID from your previous logs)
                role_id: 'd47cc55f-a0d0-4ccd-86fa-7907a072d86e'
            });
            if (profileError) {
                console.error(`Error creating profile for ${u.email}:`, profileError.message);
            } else {
                console.log(`Created Profile for: ${u.email}`);
            }
        } else {
            console.log(`Profile already exists for: ${u.email}`);
        }
    }
    console.log("Done!");
}

createUsers();
