const supabase = require('./src/config/supabaseClient');

async function checkSchema() {
    try {
        // Fetch roles
        const { data, error } = await supabase.from('roles').select('*');
        if (error) {
            console.error("Error:", error);
        } else {
            if (data.length > 0) {
                console.log("Roles:", data);
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
