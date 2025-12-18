require('dotenv').config();
const supabaseAdmin = require('./src/config/supabaseAdmin');

async function check() {
    try {
        const { data: notices, error: nError } = await supabaseAdmin.from('notices').select('*').limit(1);
        if (nError) console.error('Notices Error:', nError.message);
        else if (notices && notices.length > 0) console.log('Notices keys:', Object.keys(notices[0]));
        else console.log('Notices table found but empty or no access.');

        const { data: reports, error: rError } = await supabaseAdmin.from('reports').select('*').limit(1);
        if (rError) console.error('Reports Error:', rError.message);
        else if (reports && reports.length > 0) console.log('Reports keys:', Object.keys(reports[0]));
        else console.log('Reports table found but empty or no access.');

    } catch (e) {
        console.error(e);
    }
}
check();
