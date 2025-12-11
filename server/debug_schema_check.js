const supabase = require('./src/config/supabaseClient');

async function checkSchema() {
    try {
        // Fetch one row to see columns
        const { data, error } = await supabase.from('units').select('*').limit(1);
        if (error) {
            console.error("Error:", error);
        } else {
            if (data.length > 0) {
                console.log("Columns in units table:", Object.keys(data[0]));
                console.log("Sample Data:", data[0]);
            } else {
                console.log("Table is empty, cannot infer columns from data.");
                // Fallback: try to insert a dummy to get error or just assume
            }
        }
    } catch (e) {
        console.error(e);
    }
}

checkSchema();
