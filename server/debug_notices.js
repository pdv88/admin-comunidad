require('dotenv').config({ path: '/Users/usr/Documents/00 Proyectos Personales/Habiio/admin-comunidad/server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectData() {
    console.log("Fetching blocks...");
    const { data: blocks, error: blocksError } = await supabase
        .from('blocks')
        .select('id, name, parent_id');

    if (blocksError) { console.error(blocksError); return; }
    console.log("Blocks:", JSON.stringify(blocks, null, 2));

    console.log("\nFetching notices with target_blocks...");
    const { data: notices, error: noticesError } = await supabase
        .from('notices')
        .select('id, title, target_blocks, target_type, block_id')
        .not('target_blocks', 'is', null);

    if (noticesError) { console.error(noticesError); return; }
    console.log("Notices:", JSON.stringify(notices, null, 2));
}

inspectData();
