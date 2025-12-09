const supabase = require('../config/supabaseClient');

const createController = (table) => ({
    getAll: async (req, res) => {
        try {
            const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    create: async (req, res) => {
        try {
            // Basic implementation - relies on RLS for permission checking
            const { data, error } = await supabase.from(table).insert([req.body]).select();
            if (error) throw error;
            res.status(201).json(data[0]);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            const { data, error } = await supabase.from(table).select('*').eq('id', req.params.id).single();
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(404).json({ error: err.message });
        }
    }
});

module.exports = createController;
