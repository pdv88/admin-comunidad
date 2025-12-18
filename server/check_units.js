require('dotenv').config();
const supabaseAdmin = require('./src/config/supabaseAdmin');

async function check() {
    try {
        const { data, error } = await supabaseAdmin.from('units').select('*').limit(1);
        console.log('Units Error:', error);
        console.log('Units Data:', data);
        if (data && data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        } else {
            // If empty, try to insert dummy to get schema error or assumes
            console.log('Units table empty, cannot infer keys from data.');
        }
    } catch (e) {
        console.error(e);
    }
}
check();
