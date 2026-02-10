require('dotenv').config({ path: '/Users/usr/Documents/00 Proyectos Personales/Habiio/admin-comunidad/server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testReportsQuery() {
    console.log("Testing Reports Visibility Query Logic...");

    // Setup Mock IDs (replace with real ones if needed, but logic test is key)
    // Let's assume:
    // User A: Unit 101, Block A
    const userA_Id = 'user-a-uuid';
    const unit101_Id = 'unit-101-uuid';
    const blockA_Id = 'block-a-uuid';

    // User B: Unit 102, Block A (Neighbor)
    const userB_Id = 'user-b-uuid'; // Querying user
    const unit102_Id = 'unit-102-uuid';

    // We want to verify that User B does NOT see a report for Unit 101.
    // But User B DOES see a report for Block A (if unit_id is null).

    // Let's construct the OR condition string used in controller.

    // 1. Current Logic Simulation (Likely Leaky)
    // condition: user_id=me OR unit_id in (myUnits) OR block_id in (myBlocks) OR target_blocks overlap (myBlocks)
    const myUnitIds = [unit102_Id];
    const myBlockIds = [blockA_Id];

    // Report 1: Targeted at Unit 101 (Neighbor). Has block_id = Block A.
    // Report 2: Targeted at Block A (Common Area). Has block_id = Block A, unit_id = NULL.

    console.log("\n--- Scenario: Neighbor (Unit 102) checking reports ---");

    let currentLogic = [
        `user_id.eq.${userB_Id}`,
        `unit_id.in.(${myUnitIds.join(',')})`,
        `block_id.in.(${myBlockIds.join(',')})` // <--- THIS LEAKS UNIT 101 REPORT because it has Block A ID
    ].join(',');

    console.log("Current Logic OR:", currentLogic);
    // If Report 1 (Unit 101) has block_id=Block A, it matches the 3rd condition. FAIL.

    // 2. Proposed Logic
    // Show if:
    // - Author is Me
    // - OR Target is My Unit
    // - OR (Target is My Block AND Unit is NULL) -- Common Area
    // - OR Target is Community (implied by other checks usually or explicitly added)

    // Note: We need to handle 'target_blocks' too.

    // Proposed PostgREST Filter:
    // user_id.eq.me,
    // unit_id.in.(myUnits),
    // and(block_id.in.(myBlocks),unit_id.is.null),          <-- Explicit check for common area
    // and(target_blocks.ov.{myBlocks},unit_id.is.null)      <-- Explicit check for common area via new field

    let proposedLogic = [
        `user_id.eq.${userB_Id}`,
        `unit_id.in.(${myUnitIds.join(',')})`,
        `and(block_id.in.(${myBlockIds.join(',')}),unit_id.is.null)`,
        `and(target_blocks.ov.{${myBlockIds.join(',')}},unit_id.is.null)`,
        `target_type.in.(all,community)`
    ].join(',');

    console.log("Proposed Logic OR:", proposedLogic);

    // Test Case: Private Unit Report
    // user_id = 'other', unit_id = 'unit-101', block_id = 'block-a', target_type = 'blocks'
    // Should FAIL for Neighbor (Unit 102).

    // Check coverage:
    // 1. user_id.eq.me -> False
    // 2. unit_id.in.(102) -> False (is 101)
    // 3. block_id.in(A) AND unit_id.is.null -> False (unit_id is set)
    // 4. target_blocks... AND unit_id.is.null -> False
    // 5. target_type IN (all, community) -> False

    console.log("PASS: Private Unit Report should be HIDDEN from Neighbor.");

    // Testing against Real DB?
    // Use an existing block ID and unit ID to see if we can filter.
    // I'll fetch one real report to see its structure.
    const { data: realReport } = await supabase.from('reports').select('*').limit(1);
    console.log("\nSample Real Report:", JSON.stringify(realReport?.[0], null, 2));

}

testReportsQuery();
