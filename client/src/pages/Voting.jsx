import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import ModalPortal from '../components/ModalPortal';
import ConfirmationModal from '../components/ConfirmationModal';
import GlassLoader from '../components/GlassLoader';

const Voting = () => {
    const { user, activeCommunity, hasAnyRole, getPrimaryRole } = useAuth();
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

    const isAdmin = hasAnyRole(['super_admin', 'admin', 'president', 'secretary']);
    const canCreate = hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal']);
    const isVocal = hasAnyRole(['vocal']);

    useEffect(() => {
        fetchPolls();
        if (isAdmin || isVocal) fetchBlocks();
    }, [isAdmin, isVocal]);

    const vocalBlocks = activeCommunity?.roles
        ?.filter(r => r.name === 'vocal' && r.block_id)
        .map(r => r.block_id) || [];

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
        // Pre-fill for vocals
        const isRestrictedVocal = isVocal && !isAdmin;
        setPollForm({
            title: '',
            description: '',
            options: ['', ''],
            deadline: '',
            targetType: isRestrictedVocal ? 'blocks' : 'all',
            targetBlocks: isRestrictedVocal ? vocalBlocks : []
        });
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

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id) => setDeleteId(id);

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const communityId = localStorage.getItem('active_community_id');
            const res = await fetch(`${API_URL}/api/polls/${deleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Community-ID': communityId
                }
            });
            if (res.ok) {
                fetchPolls();
                setDeleteId(null);
            } else {
                console.error("Delete failed");
            }
        } catch (error) {
            console.error("Error deleting poll:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const [votingState, setVotingState] = useState({}); // { [pollId]: true/false }

    const handleVote = async (pollId, optionId) => {
        if (votingState[pollId]) return; // Prevent double clicks

        setVotingState(prev => ({ ...prev, [pollId]: true }));
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
        } finally {
            setVotingState(prev => ({ ...prev, [pollId]: false }));
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
        return <DashboardLayout><GlassLoader /></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('voting.title')}</h1>
                    {canCreate && (
                        <button
                            onClick={openCreateModal}
                            className="glass-button"
                        >
                            {t('voting.create_poll')}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex p-1 rounded-full items-center backdrop-blur-md bg-white/30 border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10 mb-6 w-fit">
                    <button
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'active'
                            ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                        onClick={() => setActiveTab('active')}
                    >
                        {t('voting.active_polls', 'Active Polls')}
                    </button>
                    <button
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'past'
                            ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
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
                            <div key={poll.id} className="glass-card p-6 flex flex-col relative group">
                                {(isAdmin || (isVocal && poll.created_by === user.id)) && (
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-neutral-800 p-1 rounded-lg">
                                        <button
                                            onClick={() => openEditModal(poll)}
                                            className="text-gray-400 hover:text-blue-600"
                                            title={t('common.edit')}
                                            aria-label={t('common.edit')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(poll.id)}
                                            className="text-gray-400 hover:text-red-600"
                                            title={t('common.delete')}
                                            aria-label={t('common.delete')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                )}
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2 pr-8">{poll.title}</h2>
                                <p className="text-gray-600 dark:text-neutral-400 mb-4 text-sm">{poll.description}</p>

                                <div className="space-y-3 flex-grow">
                                    {(() => {
                                        // Find the winner (option with most votes) for past polls
                                        const maxVotes = Math.max(...(poll.poll_options?.map(opt =>
                                            poll.results?.find(r => r.option_id === opt.id)?.vote_count || 0
                                        ) || [0]));
                                        const winnerIds = poll.poll_options?.filter(opt => {
                                            const votes = poll.results?.find(r => r.option_id === opt.id)?.vote_count || 0;
                                            return votes === maxVotes && maxVotes > 0;
                                        }).map(opt => opt.id) || [];

                                        return poll.poll_options?.map(option => {
                                            const voteCount = poll.results?.find(r => r.option_id === option.id)?.vote_count || 0;
                                            const percentage = poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;
                                            const isMyVote = poll.my_vote === option.id;
                                            const isTopOption = isExpired && winnerIds.includes(option.id);
                                            const isTie = winnerIds.length > 1;
                                            const isWinner = isTopOption && !isTie;

                                            return (
                                                <div key={option.id} className="relative">
                                                    {/* Visual Bar for results */}
                                                    {(hasVoted || isExpired || isAdmin || (isVocal && poll.created_by === user.id)) && (
                                                        <div className={`absolute inset-0 rounded-full overflow-hidden ${isWinner
                                                            ? 'bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20'
                                                            : isTopOption && isTie
                                                                ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
                                                                : isMyVote
                                                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                                                    : 'bg-gray-50 dark:bg-neutral-700/50'
                                                            }`}>
                                                            <div
                                                                className={`h-full transition-all duration-500 ${isWinner
                                                                    ? 'bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 dark:from-blue-800/40 dark:via-purple-800/40 dark:to-pink-800/40'
                                                                    : isTopOption && isTie
                                                                        ? 'bg-gradient-to-r from-amber-200 to-orange-200 dark:from-amber-800/40 dark:to-orange-800/40'
                                                                        : isMyVote
                                                                            ? 'bg-blue-200 dark:bg-blue-800/40'
                                                                            : 'bg-gray-200 dark:bg-neutral-600'
                                                                    }`}
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    )}

                                                    <div className="relative w-full rounded-full transition-all">
                                                        <button
                                                            disabled={isExpired || isMyVote || votingState[poll.id]}
                                                            onClick={() => handleVote(poll.id, option.id)}
                                                            className={`relative w-full text-left px-6 py-3 rounded-full border-2 transition-all flex justify-between items-center z-10 h-full
                                                                ${isExpired
                                                                    ? isMyVote
                                                                        ? 'border-blue-500 dark:border-blue-400 cursor-default'
                                                                        : 'border-transparent cursor-default'
                                                                    : isMyVote
                                                                        ? 'border-blue-500 dark:border-blue-400 bg-white/90 dark:bg-neutral-800/90 cursor-default'
                                                                        : 'border-transparent backdrop-blur-md bg-white/70 shadow-sm hover:bg-white/90 hover:shadow-md dark:bg-neutral-800/70 dark:hover:bg-neutral-800/90'
                                                                }
                                                                ${votingState[poll.id] === option.id ? 'cursor-wait opacity-70' : ''}
                                                            `}
                                                        >
                                                            <span className="font-medium text-gray-800 dark:text-white flex items-center gap-2">
                                                                {votingState[poll.id] === option.id && (
                                                                    <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                )}
                                                                {option.option_text}
                                                                {isWinner && (
                                                                    <span className="text-xs bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                        {t('voting.winner', 'Winner')}
                                                                    </span>
                                                                )}
                                                                {isTopOption && isTie && (
                                                                    <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                                        {t('voting.tie', 'Tie')}
                                                                    </span>
                                                                )}
                                                                {isMyVote && (
                                                                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                                                        {t('voting.your_vote', 'You')}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {(hasVoted || isExpired || isAdmin) && (
                                                                <span className="text-sm text-gray-500 dark:text-neutral-400 font-semibold">{percentage}% ({voteCount})</span>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
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

            {showPollModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="glass-card max-w-lg w-full p-6">
                            <h2 className="text-xl font-bold mb-4 dark:text-white">
                                {editingPoll ? t('voting.edit_poll', 'Edit Poll') : t('voting.create_poll')}
                            </h2>
                            <form onSubmit={handleSavePoll}>
                                <input
                                    className="glass-input mb-3"
                                    placeholder={t('voting.poll_title', 'Poll Title')}
                                    value={pollForm.title}
                                    onChange={e => setPollForm({ ...pollForm, title: e.target.value })}
                                    required
                                />
                                <textarea
                                    className="glass-input mb-3 min-h-[100px] rounded-2xl"
                                    placeholder={t('voting.poll_desc', 'Description')}
                                    value={pollForm.description}
                                    onChange={e => setPollForm({ ...pollForm, description: e.target.value })}
                                />

                                {!editingPoll && (
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium mb-1 dark:text-neutral-300">{t('voting.options', 'Options')}</label>
                                        {pollForm.options.map((opt, idx) => (
                                            <input
                                                key={idx}
                                                className="glass-input mb-2"
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
                                        className="glass-input"
                                        value={pollForm.deadline}
                                        onChange={e => setPollForm({ ...pollForm, deadline: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1 dark:text-neutral-300">{t('voting.target_audience', 'Target Audience')}</label>
                                    <div className="flex gap-4 mb-2">
                                        <label className={`flex items-center gap-2 dark:text-white ${(isVocal && !isAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <input
                                                type="radio"
                                                name="targetType"
                                                value="all"
                                                checked={pollForm.targetType === 'all'}
                                                onChange={e => setPollForm({ ...pollForm, targetType: e.target.value })}
                                                disabled={isVocal && !isAdmin}
                                            />
                                            {t('payments.target_all', 'All Community')}
                                        </label>
                                        <label className="flex items-center gap-2 dark:text-white">
                                            <input
                                                type="radio"
                                                name="targetType"
                                                value="blocks"
                                                checked={pollForm.targetType === 'blocks'}
                                                onChange={e => setPollForm({ ...pollForm, targetType: e.target.value })}
                                            />
                                            {t('payments.target_blocks', 'Specific Blocks')}
                                        </label>
                                    </div>
                                    {pollForm.targetType === 'blocks' && (
                                        <div className="max-h-32 overflow-y-auto border rounded p-2 dark:border-neutral-700">
                                            {blocks
                                                .filter(b => (!isVocal || isAdmin) || vocalBlocks.includes(b.id))
                                                .map(b => (
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

                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowPollModal(false)} className="glass-button-secondary">{t('common.cancel')}</button>
                                    <button type="submit" className="glass-button">
                                        {editingPoll ? t('common.save') : t('voting.create_poll')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {deleteId && (
                <ConfirmationModal
                    isOpen={!!deleteId}
                    onClose={() => setDeleteId(null)}
                    onConfirm={confirmDelete}
                    title={t('voting.delete_confirm_title', 'Delete Poll?')}
                    message={t('voting.confirm_delete', 'Are you sure you want to delete this poll? This action cannot be undone.')}
                    confirmText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    isDangerous={true}
                    isLoading={isDeleting}
                />
            )}
        </DashboardLayout>
    );
};

export default Voting;
