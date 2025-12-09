const supabase = require('../config/supabaseClient');

exports.getAll = async (req, res) => {
    try {
        // Fetch polls with their options
        const { data, error } = await supabase
            .from('polls')
            .select(`
                *,
                poll_options (
                    id,
                    option_text
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { title, description, options, created_by } = req.body;

    try {
        // 1. Create Poll
        const { data: poll, error: pollError } = await supabase
            .from('polls')
            .insert([{ title, description, created_by }])
            .select()
            .single();

        if (pollError) throw pollError;

        // 2. Create Options
        const optionsData = options.map(opt => ({
            poll_id: poll.id,
            option_text: opt
        }));

        const { error: optionsError } = await supabase
            .from('poll_options')
            .insert(optionsData);

        if (optionsError) throw optionsError;

        res.status(201).json(poll);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.vote = async (req, res) => {
    const { poll_id, option_id, user_id } = req.body;

    try {
        const { data, error } = await supabase
            .from('poll_votes')
            .insert([{ poll_id, option_id, user_id }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
