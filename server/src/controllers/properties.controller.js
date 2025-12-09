const supabase = require('../config/supabaseClient');

exports.getAllBlocks = async (req, res) => {
    try {
        // Fetch blocks with representative details
        const { data, error } = await supabase
            .from('blocks')
            .select(`
                *,
                units(*),
                representative:representative_id (
                    id,
                    email,
                    raw_user_meta_data
                )
            `);

        // Note: The structure of representative data depends on how Supabase joins auth.users. 
        // Direct join to auth.users from client lib usually returns limited info or requires specific setup.
        // It is often easier to join 'profiles' if we had representative_id link to profiles.
        // However, let's assume representative_id links to auth.users. 
        // Supabase JS client doesn't always auto-join auth schema tables easily.
        // For simplicity, we might just get the ID and fetch profile separately or join on profiles if we changed the FK.
        // Let's assume for now we just return the ID, and frontend handles display or we update FK to profiles.

        if (error) throw error;

        // Fetch profiles for the representative IDs manually if needed, or query view. 
        // To make it robust: Let's assume we link to public.profiles instead of auth.users for the UI convenience?
        // But the schema set to auth.users. Let's try to fetch profiles matches.

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createBlock = async (req, res) => {
    try {
        const { data, error } = await supabase.from('blocks').insert([req.body]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateBlock = async (req, res) => {
    const { id } = req.params;
    const { representative_id } = req.body;

    try {
        const { data, error } = await supabase
            .from('blocks')
            .update({ representative_id })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.createUnit = async (req, res) => {
    try {
        const { data, error } = await supabase.from('units').insert([req.body]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.assignUnitToUser = async (req, res) => {
    const { userId, unitId } = req.body;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ unit_id: unitId })
            .eq('id', userId)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        // Helper endpoint to list users for assignment
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
