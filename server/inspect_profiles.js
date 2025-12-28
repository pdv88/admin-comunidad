const supabase = require('./src/config/supabaseClient');

async function inspectProfiles() {
    console.log("Inspecting public.profiles...");
    // We can't query information_schema easily with js client for constraints usually without rpc
    // But we can try to insert a dummy row and see what fails, or just list columns if we had pg client.
    // Supabase JS client doesn't expose schema info directly.

    // Instead, I'll try to fetch one profile to see keys.
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) console.error(error);
    else {
        if (data.length > 0) {
            console.log("Profile keys:", Object.keys(data[0]));
        } else {
            console.log("No profiles found to inspect keys.");
        }
    }
}

inspectProfiles();
