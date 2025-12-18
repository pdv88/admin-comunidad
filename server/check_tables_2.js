require('dotenv').config();
const supabaseAdmin = require('./src/config/supabaseAdmin');

async function check() {
    try {
        const { data: c } = await supabaseAdmin.from('campaigns').select('*').limit(1);
        const { data: p } = await supabaseAdmin.from('payments').select('*').limit(1);
        const { data: b } = await supabaseAdmin.from('blocks').select('*').limit(1);
        if (c?.length) console.log('Campaigns:', Object.keys(c[0]));
        else console.log('Campaigns empty');
        if (p?.length) console.log('Payments:', Object.keys(p[0]));
        else console.log('Payments empty');
        if (b?.length) console.log('Blocks:', Object.keys(b[0]));
        else console.log('Blocks empty');
    } catch (e) { console.error(e); }
}
check();
