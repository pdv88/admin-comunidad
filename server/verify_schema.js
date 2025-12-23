const supabase = require('./src/config/supabaseAdmin');

async function checkSchema() {
    console.log("Checking 'payments' table...");
    try {
        // Try to select payment_date
        const { data: payments, error: paymentError } = await supabase
            .from('payments')
            .select('payment_date')
            .limit(1);

        if (paymentError) {
            console.error("❌ Error checking 'payments':", paymentError.message);
        } else {
            console.log("✅ 'payment_date' column exists in 'payments' table.");
        }
    } catch (e) {
        console.error("❌ Exception checking payments:", e);
    }

    console.log("\nChecking 'monthly_fees' table...");
    try {
        // Try to select payment_id
        const { data: fees, error: feesError } = await supabase
            .from('monthly_fees')
            .select('payment_id')
            .limit(1);

        if (feesError) {
            console.error("❌ Error checking 'monthly_fees':", feesError.message);
        } else {
            console.log("✅ 'payment_id' column exists in 'monthly_fees' table.");
        }
    } catch (e) {
        console.error("❌ Exception checking monthly_fees:", e);
    }
}

checkSchema();
