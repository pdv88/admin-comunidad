
const supabase = require('./src/config/supabaseAdmin');

async function checkTables() {
    // Try to select from extraordinary_fees
    const { data, error } = await supabase.from('extraordinary_fees').select('count', { count: 'exact', head: true });
    if (error) {
        console.log("Error querying extraordinary_fees:", error.message);
    } else {
        console.log("extraordinary_fees exists. Count:", data);
    }

    // Try monthly_fees
    const { data: mData, error: mError } = await supabase.from('monthly_fees').select('count', { count: 'exact', head: true });
    if (mError) {
        console.log("Error querying monthly_fees:", mError.message);
    } else {
        console.log("monthly_fees exists. Count:", mData);
    }
}

checkTables();
