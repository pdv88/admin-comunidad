require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAndFix() {
    console.log('=== Debugging Campaign Progress ===\n');

    // 1. Get all campaigns
    const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('id, name, current_amount, target_amount');

    if (campError) {
        console.error('Error fetching campaigns:', campError);
        return;
    }

    console.log(`Found ${campaigns.length} campaigns.\n`);

    for (const camp of campaigns) {
        console.log(`\n--- Campaign: ${camp.name} ---`);
        console.log(`  Goal: ${camp.target_amount}, Current Amount: ${camp.current_amount}`);

        // 2. Get all extraordinary fees for this campaign
        const { data: allFees, error: feeError } = await supabase
            .from('extraordinary_fees')
            .select('id, amount, status, campaign_id')
            .eq('campaign_id', camp.id);

        if (feeError) {
            console.error(`  Error fetching fees:`, feeError);
            continue;
        }

        console.log(`  Total fees: ${allFees?.length || 0}`);

        const paidFees = allFees?.filter(f => f.status === 'paid') || [];
        const pendingFees = allFees?.filter(f => f.status !== 'paid') || [];

        console.log(`  Paid: ${paidFees.length}, Pending: ${pendingFees.length}`);

        // 3. Calculate what the total should be
        const correctTotal = paidFees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
        console.log(`  Calculated total from paid fees: ${correctTotal}`);

        // 4. Fix if needed
        if (correctTotal !== camp.current_amount) {
            console.log(`  ⚠️  MISMATCH! Fixing: ${camp.current_amount} -> ${correctTotal}`);

            const { data: updateData, error: updateError } = await supabase
                .from('campaigns')
                .update({ current_amount: correctTotal })
                .eq('id', camp.id)
                .select();

            if (updateError) {
                console.error(`  Error updating:`, updateError);
            } else {
                console.log(`  ✅ Fixed! Update result:`, updateData);
            }
        } else {
            console.log(`  ✅ Amount is correct.`);
        }
    }

    console.log('\n=== Done ===');
}

debugAndFix();
