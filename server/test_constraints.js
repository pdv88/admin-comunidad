const supabase = require('./src/config/supabaseAdmin');

async function checkConstraints() {
    console.log("Checking nullable columns on public.profiles...");

    // Get one profile
    const { data: profiles, error: getError } = await supabase.from('profiles').select('id').limit(1);

    if (getError || !profiles.length) {
        console.log("No profiles found to test.");
        return;
    }

    const id = profiles[0].id;
    console.log(`Testing constraints on profile ${id}`);

    // Test unit_number
    // We try to set it to null. If it fails, it's NOT NULL.
    // Use a transaction? No js client support for manual txn easily.
    // Just try update and revert if needed (or if it succeeds, it's nullable).

    try {
        const { error } = await supabase.from('profiles').update({ unit_number: null }).eq('id', id);
        if (error) console.log("unit_number CHECK: FAILED (Likely NOT NULL):", error.message);
        else console.log("unit_number CHECK: Success (Nullable)");
    } catch (e) { console.log(e); }

    try {
        const { error } = await supabase.from('profiles').update({ phone: null }).eq('id', id);
        if (error) console.log("phone CHECK: FAILED (Likely NOT NULL):", error.message);
        else console.log("phone CHECK: Success (Nullable)");
    } catch (e) { console.log(e); }

    try {
        const { error } = await supabase.from('profiles').update({ unit_id: null }).eq('id', id);
        if (error) console.log("unit_id CHECK: FAILED (Likely NOT NULL):", error.message);
        else console.log("unit_id CHECK: Success (Nullable)");
    } catch (e) { console.log(e); }

}

checkConstraints();
