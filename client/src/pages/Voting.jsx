import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

const Voting = () => {
    const { user } = useAuth();
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPolls();
    }, []);

    const fetchPolls = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/polls');
            const data = await res.json();
            setPolls(data);
        } catch (error) {
            console.error("Error fetching polls:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (pollId, optionId) => {
        try {
            const res = await fetch('http://localhost:5000/api/polls/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    poll_id: pollId,
                    option_id: optionId,
                    user_id: user?.id 
                })
            });
            if (res.ok) {
                alert("Vote recorded!");
                fetchPolls(); // Refresh to see results if we implemented logic for it
            }
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div>Loading polls...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Active Polls</h1>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create Poll</button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {polls.map(poll => (
                        <div key={poll.id} className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{poll.title}</h2>
                            <p className="text-gray-600 dark:text-neutral-400 mb-4">{poll.description}</p>
                            
                            <div className="space-y-3">
                                {poll.poll_options?.map(option => (
                                    <button 
                                        key={option.id}
                                        onClick={() => handleVote(poll.id, option.id)}
                                        className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        {option.option_text}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 text-xs text-gray-500 text-right">
                                Ends: {new Date(poll.ends_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Voting;
