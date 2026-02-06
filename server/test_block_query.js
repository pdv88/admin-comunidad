
const supabase = require('./src/config/supabaseClient');

async function testBlockQuery() {
    try {
        console.log("Testing multiple embeddings...");

        // Attempt 1: Explicit constraint name
        try {
            const { data, error } = await supabase
                .from('blocks')
                .select(`
                    id,
                    name,
                    parent_id,
                    parent:blocks!blocks_parent_id_fkey(name)
                `)
                .not('parent_id', 'is', null)
                .limit(2);
            if (!error) console.log("Attempt 1 (blocks_parent_id_fkey):", JSON.stringify(data, null, 2));
            else console.log("Attempt 1 Error:", error.message);
        } catch (e) { }

        // Attempt 2: Ambiguous parent
        try {
            const { data, error } = await supabase
                .from('blocks')
                .select(`
                    id,
                    name,
                    parent_id,
                    parent:blocks(name)
                `)
                .not('parent_id', 'is', null)
                .limit(2);
            if (!error) console.log("Attempt 2 (no alias):", JSON.stringify(data, null, 2));
            else console.log("Attempt 2 Error:", error.message);
        } catch (e) { }

    } catch (e) {
        console.error("Exception:", e);
    }
}

testBlockQuery();
