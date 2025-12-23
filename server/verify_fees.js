const supabase = require('./src/config/supabaseAdmin');

async function checkFees() {
    console.log("Checking 'monthly_fees' table for 'payment_id'...");
    const { data: fees, error: feesError } = await supabase
        .from('monthly_fees')
        .select('payment_id')
        .limit(1);

    if (feesError) {
        console.error("❌ Error checking 'monthly_fees':", feesError.message);
    } else {
        console.log("✅ 'payment_id' column exists in 'monthly_fees' table.");
    }
}

checkFees();
