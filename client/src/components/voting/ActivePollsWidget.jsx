import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';

const ActivePollsWidget = (props) => {
    const { t } = useTranslation();
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPolls();
    }, []);

    const fetchPolls = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/polls`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const now = new Date();
                const active = data.filter(p => !p.ends_at || new Date(p.ends_at) > now);
                setPolls(active);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;

    // Helper to get vote count for an option
    const getVoteCount = (poll, optionId) => {
        if (!poll.results) return 0;
        const result = poll.results.find(r => r.option_id === optionId);
        return result ? result.vote_count : 0;
    };

    // Colors for the stacked bar
    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'
    ];

    return (
        <div className={props.className}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-blue-500">🗳️</span>
                    {t('voting.title', 'Active Polls')}
                </h2>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {polls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-neutral-500 py-8">
                        <span className="text-4xl mb-2 opacity-50">🗳️</span>
                        <p className="font-medium">{t('voting.no_active_polls', 'No active polls')}</p>
                        <p className="text-sm opacity-75">{t('voting.check_later', 'Check back later for new votes')}</p>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1">
                        {polls.map(poll => {
                            const totalVotes = poll.total_votes || 0;
                            
                            return (
                                <div key={poll.id} className="glass-card p-5 hover:shadow-md transition-shadow flex flex-col h-full border border-white/20 dark:border-white/5">
                                    <div className="flex justify-between items-start mb-2">
                                        <Link to="/app/voting" className="font-semibold text-gray-800 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {poll.title}
                                        </Link>
                                        {poll.user_voted && (
                                             <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full whitespace-nowrap dark:bg-green-900/30 dark:text-green-400">
                                                {t('common.voted', 'Voted')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4 line-clamp-2 flex-grow">{poll.description}</p>
                                    
                                    {/* Unified Progress Bar */}
                                    <div className="mb-4 space-y-3">
                                        <div className="flex h-3 w-full bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                            {totalVotes > 0 ? (
                                                poll.poll_options?.map((option, index) => {
                                                    const count = getVoteCount(poll, option.id);
                                                    const percentage = (count / totalVotes) * 100;
                                                    if (percentage === 0) return null;
                                                    return (
                                                        <div 
                                                            key={option.id}
                                                            style={{ width: `${percentage}%` }}
                                                            className={`h-full ${colors[index % colors.length]}`}
                                                            title={`${option.option_text}: ${count} votes (${Math.round(percentage)}%)`}
                                                        />
                                                    );
                                                })
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 dark:bg-neutral-600" />
                                            )}
                                        </div>
                                        
                                        {/* Legend */}
                                        {totalVotes > 0 && (
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {poll.poll_options?.map((option, index) => {
                                                    const count = getVoteCount(poll, option.id);
                                                    const percentage = (count / totalVotes) * 100;
                                                    return (
                                                        <div key={option.id} className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[index % colors.length]}`}></span>
                                                            <span className="text-gray-600 dark:text-neutral-400 truncate flex-1" title={option.option_text}>
                                                                {option.option_text}
                                                            </span>
                                                            <span className="font-medium text-gray-800 dark:text-neutral-300">
                                                                {Math.round(percentage)}%
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-xs text-gray-400 dark:text-neutral-500 pt-2 border-t border-gray-100 dark:border-neutral-700">
                                             <span>{totalVotes} {t('voting.votes', 'votes')}</span>
                                             <span>{t('voting.ends')} {poll.ends_at ? new Date(poll.ends_at).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivePollsWidget;
