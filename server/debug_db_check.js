const dotenv = require('dotenv');
dotenv.config();
const supabaseAdmin = require('./src/config/supabaseAdmin');

async function debug() {
    console.log('--- DB Debug: Campaigns & Payments ---');
    try {
        // 1. Fetch Campaigns
        const { data: campaigns, error: cError } = await supabaseAdmin
            .from('campaigns')
            .select('*');

        if (cError) {
            console.error('Error fetching campaigns:', cError);
            return;
        }

        console.log(`Found ${campaigns.length} campaigns.`);

        for (const c of campaigns) {
            console.log(`\nCampaign: ${c.name} (ID: ${c.id})`);
            console.log(`- Target: ${c.target_amount}`);
            console.log(`- Current (DB): ${c.current_amount}`);
            console.log(`- Is Active: ${c.is_active}`);

            // 2. Fetch payments for this campaign
            const { data: payments, error: pError } = await supabaseAdmin
                .from('payments')
                .select('*')
                .eq('campaign_id', c.id);

            if (pError) console.error('Error fetching payments:', pError);
            else {
                const confirmedTotal = payments
                    .filter(p => p.status === 'confirmed')
                    .reduce((sum, p) => sum + Number(p.amount), 0);

                console.log(`- Payments Found: ${payments.length}`);
                console.log(`- Calculated Total (Confirmed): ${confirmedTotal}`);

                if (Number(c.current_amount) !== confirmedTotal) {
                    console.log('*** MISMATCH DETECTED ***');
                }
            }
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

debug();
