require('dotenv').config({ path: '/Users/usr/Documents/00 Proyectos Personales/Habiio/admin-comunidad/server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuery() {
    // Scenario: User in Parent Block "Av. Club de Golf" checking visibility of child notices.
    const parentBlockId = "bc584e2e-410d-40e0-9a9a-f68833c3bd95"; // Av. Club de Golf
    const myBlockIds = [parentBlockId];
    console.log(`Testing visibility for User in Block: ${parentBlockId} (Av. Club de Golf)`);

    // Basic OR logic used in controller
    // .or(`target_type.eq.all,block_id.is.null,target_blocks.ov.{${myBlockIds.join(',')}},block_id.in.(${myBlockIds.join(',')})`)

    // We expect "scope bosque del morro" (Child) NOT to appear.
    // We expect "scope comunidad" (All) TO appear.
    // We expect "scope residencial jardines" (Sister/Child) NOT to appear.

    // Fix attempt: Restrict block_id.is.null to when target_type != 'blocks'
    // condition: target_type.eq.all, and(block_id.is.null,target_type.neq.blocks), target_blocks.ov..., block_id.in...

    const orCondition = `target_type.eq.all,and(block_id.is.null,target_type.neq.blocks),target_blocks.ov.{${myBlockIds.join(',')}},block_id.in.(${myBlockIds.join(',')})`;
    console.log("OR Condition:", orCondition);

    const { data, error } = await supabase
        .from('notices')
        .select('id, title, target_blocks, block_id, target_type')
        .or(orCondition);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Visible Notices:", JSON.stringify(data, null, 2));

        // Analyze
        const childNotice = data.find(n => n.title === 'scope bosque del morro');
        if (childNotice) {
            console.error("FAIL: User in Parent Block CAN SEE Child Block Notice!");
        } else {
            console.log("PASS: User in Parent Block CANNOT see Child Block Notice.");
        }
    }

    // Reverse Test: User in Child Block viewing Parent Notice?
    // There is no Parent Notice in the DB dump.
    // "scope comunidad" is ALL.

    // Let's Try User in "Priv Bosque del Morro" (Child)
    const childBlockId = "34fcba92-09e6-4a6f-859a-a83786738888";
    const myChildIds = [childBlockId];
    console.log(`\nTesting visibility for User in Block: ${childBlockId} (Priv Bosque del Morro)`);
    const orConditionChild = `target_type.eq.all,block_id.is.null,target_blocks.ov.{${myChildIds.join(',')}},block_id.in.(${myChildIds.join(',')})`;

    const { data: dataChild } = await supabase
        .from('notices')
        .select('id, title, target_blocks, block_id, target_type')
        .or(orConditionChild);

    console.log("Visible Notices for Child User:", JSON.stringify(dataChild, null, 2));
}

testQuery();
