
const supabase = require('./src/config/supabaseAdmin');

async function checkTables() {
    // Check campaigns structure
    const { data: cData, error: cError } = await supabase.from('campaigns').select('*').limit(1);
    if (cError) {
        console.log("Error querying campaigns:", cError.message);
    } else {
        console.log("campaigns table columns:", cData.length > 0 ? Object.keys(cData[0]) : "Table empty, cannot infer columns");
    }
}

checkTables();
