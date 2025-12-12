import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

const Voting = () => {
    const { user } = useAuth();
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'past'
    const [showPollModal, setShowPollModal] = useState(false);
    const [editingPoll, setEditingPoll] = useState(null);
    const [deleteId, setDeleteId] = useState(null); // ID of poll to delete
    const [blocks, setBlocks] = useState([]);
    const { t } = useTranslation();

    // Poll Form State
    const [pollForm, setPollForm] = useState({
        title: '',
        description: '',
        options: ['', ''],
        deadline: '',
        targetType: 'all',
        targetBlocks: []
    });

    const role = user?.profile?.roles?.name || 'resident';
    const isAdmin = ['admin', 'president', 'secretary'].includes(role);

    useEffect(() => {
        fetchPolls();
        if (isAdmin) fetchBlocks();
    }, [isAdmin]);

    const fetchPolls = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/polls`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPolls(data);
        } catch (error) {
            console.error("Error fetching polls:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBlocks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/properties/blocks`);
            setBlocks(await res.json());
        } catch (error) { console.error(error); }
    };

    const openCreateModal = () => {
        setEditingPoll(null);
        setPollForm({ title: '', description: '', options: ['', ''], deadline: '', targetType: 'all', targetBlocks: [] });
        setShowPollModal(true);
    };

    const openEditModal = (poll) => {
        setEditingPoll(poll);
        setPollForm({
            title: poll.title,
            description: poll.description || '',
            options: [], // Options editing disabled for now
            deadline: poll.ends_at ? poll.ends_at.split('T')[0] : '',
            targetType: poll.target_type || 'all',
            targetBlocks: poll.target_blocks || []
        });
        setShowPollModal(true);
    };

    const handleSavePoll = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingPoll ? `${API_URL}/api/polls/${editingPoll.id}` : `${API_URL}/api/polls`;
            const method = editingPoll ? 'PUT' : 'POST';

            const body = {
                ...pollForm,
                options: !editingPoll ? pollForm.options.filter(o => o.trim() !== '') : undefined // Only send options on create
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowPollModal(false);
                setEditingPoll(null);
                fetchPolls();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteClick = (id) => setDeleteId(id);

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/polls/${deleteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPolls();
                setDeleteId(null);
            }
        } catch (error) {
            console.error("Error deleting poll:", error);
        }
    };

    const handleVote = async (pollId, optionId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/polls/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    poll_id: pollId,
                    option_id: optionId,
                    user_id: user?.id 
                })
            });
            if (res.ok) {
                // Optimistic update or refresh
                fetchPolls();
            }
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    const handleOptionChange = (idx, value) => {
        const updated = [...pollForm.options];
        updated[idx] = value;
        setPollForm({ ...pollForm, options: updated });
    };

    const addOption = () => setPollForm({ ...pollForm, options: [...pollForm.options, ''] });

    // Filter Polls
    const now = new Date();
    const filteredPolls = polls.filter(p => {
        const endDate = p.ends_at ? new Date(p.ends_at) : null;
        if (activeTab === 'active') {
            return !endDate || endDate > now;
        } else {
            return endDate && endDate <= now;
        }
    });

    if (loading) {
        return <DashboardLayout><div className="p-6">{t('common.loading')}</div></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('voting.title')}</h1>
                    {isAdmin && (
                        <button 
                            onClick={openCreateModal}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            {t('voting.create_poll')}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-neutral-700 mb-6">
                    <button 
                        className={`px-4 py-2 font-medium ${activeTab === 'active' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('active')}
                    >
                        {t('voting.active_polls', 'Active Polls')}
                    </button>
                    <button 
                        className={`px-4 py-2 font-medium ${activeTab === 'past' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('past')}
                    >
                        {t('voting.past_polls', 'Past Polls')}
                    </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPolls.length === 0 && <p className="text-gray-500">{t('voting.no_polls', 'No polls found.')}</p>}
                    {filteredPolls.map(poll => {
                        const hasVoted = poll.user_voted;
                        const isExpired = activeTab === 'past';
                        
                        return (
                            <div key={poll.id} className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6 flex flex-col relative group">
                                {isAdmin && (
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-neutral-800 p-1 rounded-lg">
                                        <button 
                                            onClick={() => openEditModal(poll)}
                                            className="text-gray-400 hover:text-blue-600"
                                            title={t('common.edit')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(poll.id)}
                                            className="text-gray-400 hover:text-red-600"
                                            title={t('common.delete')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                )}
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2 pr-8">{poll.title}</h2>
                                <p className="text-gray-600 dark:text-neutral-400 mb-4 text-sm">{poll.description}</p>
                                
                                <div className="space-y-3 flex-grow">
                                    {poll.poll_options?.map(option => {
                                        const voteCount = poll.results?.find(r => r.option_id === option.id)?.vote_count || 0;
                                        const percentage = poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;
                                        const isMyVote = poll.my_vote === option.id;

                                        return (
                                            <div key={option.id} className="relative">
                                                {/* Visual Bar for results */}
                                                {(hasVoted || isExpired || isAdmin) && (
                                                    <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg overflow-hidden">
                                                        <div className="h-full bg-blue-100 dark:bg-blue-800/40" style={{ width: `${percentage}%` }}></div>
                                                    </div>
                                                )}
                                                
                                                <button 
                                                    disabled={hasVoted || isExpired}
                                                    onClick={() => handleVote(poll.id, option.id)}
                                                    className={`relative w-full text-left px-4 py-3 rounded-lg border transition-colors flex justify-between items-center z-10
                                                        ${hasVoted || isExpired ? 'border-transparent cursor-default' : 'border-gray-200 hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-700'}
                                                        ${isMyVote ? 'ring-2 ring-blue-500' : ''}
                                                    `}
                                                >
                                                    <span className="font-medium text-gray-800 dark:text-white">
                                                        {option.option_text} {isMyVote && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">{t('voting.your_vote', 'You')}</span>}
                                                    </span>
                                                    {(hasVoted || isExpired || isAdmin) && (
                                                        <span className="text-sm text-gray-500 dark:text-neutral-400 font-semibold">{percentage}% ({voteCount})</span>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700 flex justify-between text-xs text-gray-500">
                                    <span>{t('voting.total_votes', 'Total Votes')}: {poll.total_votes}</span>
                                    {poll.ends_at && <span>{t('voting.ends')} {new Date(poll.ends_at).toLocaleDateString()}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Poll Modal (Create/Edit) */}
            {showPollModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">
                            {editingPoll ? t('voting.edit_poll', 'Edit Poll') : t('voting.create_poll')}
                        </h2>
                        <form onSubmit={handleSavePoll}>
                            <input 
                                className="w-full mb-3 p-2 rounded border dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                placeholder={t('voting.poll_title', 'Poll Title')}
                                value={pollForm.title}
                                onChange={e => setPollForm({...pollForm, title: e.target.value})}
                                required
                            />
                            <textarea 
                                className="w-full mb-3 p-2 rounded border dark:bg-neutral-900 dark:border-neutral-700 dark:text-white min-h-[100px]"
                                placeholder={t('voting.poll_desc', 'Description')}
                                value={pollForm.description}
                                onChange={e => setPollForm({...pollForm, description: e.target.value})}
                            />
                            
                            {!editingPoll && (
                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-1 dark:text-neutral-300">{t('voting.options', 'Options')}</label>
                                    {pollForm.options.map((opt, idx) => (
                                        <input 
                                            key={idx}
                                            className="w-full mb-2 p-2 rounded border dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={e => handleOptionChange(idx, e.target.value)}
                                            required
                                        />
                                    ))}
                                    <button type="button" onClick={addOption} className="text-sm text-blue-600 hover:text-blue-500">+ {t('voting.add_option', 'Add Option')}</button>
                                </div>
                            )}

                            {editingPoll && <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">{t('voting.edit_warning', 'Options cannot be edited to preserve vote integrity.')}</p>}

                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1 dark:text-neutral-300">{t('voting.deadline', 'Deadline')}</label>
                                <input 
                                    type="date"
                                    className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                    value={pollForm.deadline}
                                    onChange={e => setPollForm({...pollForm, deadline: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1 dark:text-neutral-300">{t('voting.target_audience', 'Target Audience')}</label>
                                <div className="flex gap-4 mb-2">
                                    <label className="flex items-center gap-2 dark:text-white">
                                        <input 
                                            type="radio" 
                                            name="targetType" 
                                            value="all"
                                            checked={pollForm.targetType === 'all'}
                                            onChange={e => setPollForm({...pollForm, targetType: e.target.value})}
                                        />
                                        {t('payments.target_all', 'All Community')}
                                    </label>
                                    <label className="flex items-center gap-2 dark:text-white">
                                        <input 
                                            type="radio" 
                                            name="targetType" 
                                            value="blocks"
                                            checked={pollForm.targetType === 'blocks'}
                                            onChange={e => setPollForm({...pollForm, targetType: e.target.value})}
                                        />
                                        {t('payments.target_blocks', 'Specific Blocks')}
                                    </label>
                                </div>
                                {pollForm.targetType === 'blocks' && (
                                    <div className="max-h-32 overflow-y-auto border rounded p-2 dark:border-neutral-700">
                                        {blocks.map(b => (
                                            <label key={b.id} className="flex items-center gap-2 mb-1 dark:text-neutral-300">
                                                <input 
                                                    type="checkbox"
                                                    checked={pollForm.targetBlocks.includes(b.id)}
                                                    onChange={e => {
                                                        const id = b.id;
                                                        setPollForm(prev => ({
                                                            ...prev,
                                                            targetBlocks: e.target.checked 
                                                                ? [...prev.targetBlocks, id]
                                                                : prev.targetBlocks.filter(bid => bid !== id)
                                                        }));
                                                    }}
                                                />
                                                {b.name}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowPollModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400">{t('common.cancel')}</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    {editingPoll ? t('common.save') : t('voting.create_poll')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-xl max-w-sm w-full p-6 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <svg className="h-6 w-6 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-2">{t('voting.delete_confirm_title', 'Delete Poll?')}</h3>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">
                            {t('voting.confirm_delete', 'Are you sure you want to delete this poll? This action cannot be undone.')}
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-neutral-700 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-600"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Voting;
