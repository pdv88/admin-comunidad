require('dotenv').config();
const supabaseAdmin = require('./src/config/supabaseAdmin');

async function check() {
    try {
        const { data: notices, error: nError } = await supabaseAdmin.from('notices').select('*').limit(1);
        if (nError) console.error('Notices Error:', nError.message);
        else if (notices && notices.length > 0) console.log('Notices keys:', Object.keys(notices[0]));
        else console.log('Notices table found but empty or no access.');

        // Reports check removed for brevity


        const { data: payments, error: pError } = await supabaseAdmin.from('payments').select('*').limit(1);
        if (pError) console.error('Payments Error:', pError.message);
        else if (payments && payments.length > 0) {
            console.log('Payments keys:', Object.keys(payments[0]));
            // Test Join
            const { data: joinTest, error: jError } = await supabaseAdmin
                .from('payments')
                .select('*, profile:profiles(full_name)')
                .limit(1);
            if (jError) console.error('Join Test Error:', jError);
            else console.log('Join Test Success:', !!joinTest);
        }
        else console.log('Payments table found but empty.');

    } catch (e) {
        console.error(e);
    }
}
check();
