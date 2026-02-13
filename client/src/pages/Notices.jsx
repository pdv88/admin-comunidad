import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';
import FormModal from '../components/FormModal';
import ModalPortal from '../components/ModalPortal';
import GlassSelect from '../components/GlassSelect';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';
import HierarchicalBlockSelector from '../components/HierarchicalBlockSelector';

const Notices = () => {
    const { user, activeCommunity, hasAnyRole } = useAuth();
    const { t } = useTranslation();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [blocks, setBlocks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Create Form State
    const [newNotice, setNewNotice] = useState({
        title: '',
        content: '',
        priority: 'normal',
        target_type: 'all', // 'all' or 'blocks'
        target_blocks: [] // array of block IDs
    });

    // Helper to resolve full paths for preview
    const getBlockName = (id) => {
        const block = blocks.find(b => b.id === id);
        return block ? block.name : id;
    };

    const getBlockPath = (id) => {
        const path = [];
        let currentId = id;
        const visited = new Set(); // Prevent circularity just in case

        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const block = blocks.find(b => b.id === currentId);
            if (!block) break;
            path.unshift(block.name);
            currentId = block.parent_id;
        }

        return path.length > 0 ? path.join(' / ') : id;
    };

    const handleToggleBlock = (blockId) => {
        setNewNotice(prev => {
            const currentSelected = prev.target_blocks || [];
            if (currentSelected.includes(blockId)) {
                return { ...prev, target_blocks: currentSelected.filter(id => id !== blockId) };
            } else {
                return { ...prev, target_blocks: [...currentSelected, blockId] };
            }
        });
    };

    // Delete State
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [noticeToDelete, setNoticeToDelete] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Neighbors can VIEW notices but not create them
    const canView = hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal', 'neighbor']);
    const canCreate = hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal']);
    const isAdminOrPres = hasAnyRole(['super_admin', 'admin', 'president', 'secretary']);
    const isVocal = hasAnyRole(['vocal']);

    // Extract blocks owned by Vocal from activeCommunity.roles
    const vocalBlockIds = activeCommunity?.roles
        ?.filter(r => r.name === 'vocal' && r.block_id)
        .map(r => r.block_id) || [];

    useEffect(() => {
        if (!canView) return; // Redirect logic usually handled by router or layout, but good to check
        fetchNotices();
        fetchBlocks();
    }, [canView]);

    // Init form for Vocal once blocks are loaded
    useEffect(() => {
        if (isVocal && vocalBlockIds.length > 0 && newNotice.target_blocks.length === 0) {
            setNewNotice(prev => ({
                ...prev,
                target_type: 'blocks',
                target_blocks: [vocalBlockIds[0]]
            }));
        }
    }, [isVocal, vocalBlockIds.length, blocks.length]);

    const fetchNotices = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/notices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotices(data);
            }
        } catch (error) {
            console.error("Error fetching notices:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBlocks = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch blocks from the correct endpoint provided by properties module
            const res = await fetch(`${API_URL}/api/properties/blocks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setBlocks(data || []);
            } else {
                console.error("Failed to fetch blocks", res.status);
            }
        } catch (error) {
            console.error("Error fetching blocks:", error);
        }
    };

    const handleCreateNotice = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...newNotice };
            // Ensure proper format for backend
            if (payload.target_type === 'all') {
                payload.target_blocks = [];
            }

            const res = await fetch(`${API_URL}/api/notices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                setNewNotice({
                    title: '',
                    content: '',
                    priority: 'normal',
                    target_type: isVocal ? 'blocks' : 'all',
                    target_blocks: isVocal && vocalBlockIds.length > 0 ? [vocalBlockIds[0]] : []
                });
                fetchNotices();
                setToast({ message: t('notices.create_success', 'Notice posted successfully'), type: 'success' });
            } else {
                const d = await res.json();
                setToast({ message: d.error || t('common.error', 'Error creating notice'), type: 'error' });
            }
        } catch (error) {
            console.error('Error creating notice:', error);
            setToast({ message: t('common.error', 'Error creating notice'), type: 'error' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (id) => {
        setNoticeToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!noticeToDelete) return;
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/notices/${noticeToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchNotices();
                setShowDeleteModal(false);
                setNoticeToDelete(null);
                setToast({ message: t('notices.delete_success', 'Notice deleted'), type: 'success' });
            } else {
                setToast({ message: t('common.error', 'Error deleting notice'), type: 'error' });
            }
        } catch (error) {
            console.error('Error deleting notice:', error);
            setToast({ message: t('common.error', 'Error deleting notice'), type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-200';
            case 'high': return 'bg-orange-500/10 border-orange-500/20 text-orange-800 dark:text-orange-200';
            default: return 'glass-card border-white/40 dark:border-neutral-700/50';
        }
    };

    const renderNoticeTargets = (notice) => {
        if (notice.target_type === 'all' || (!notice.target_type && !notice.block_id)) {
            return (
                <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded dark:bg-purple-900/30 dark:text-purple-300">
                    {t('notices.global_notice', 'Global')}
                </span>
            );
        }

        const targetIds = notice.target_blocks || (notice.block_id ? [notice.block_id] : []);
        if (targetIds.length === 0) return null;

        // Filter: only show blocks whose parents are NOT in the target list
        // This avoids clutter when a whole building is selected
        const rootTargets = targetIds.filter(id => {
            const block = blocks.find(b => b.id === id);
            return !block || !block.parent_id || !targetIds.includes(block.parent_id);
        });

        const maxToShow = 2;
        const displayed = rootTargets.slice(0, maxToShow);
        const extra = rootTargets.length - maxToShow;

        return (
            <div className="flex flex-wrap gap-1">
                {displayed.map(id => (
                    <span key={id} className="text-[10px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded dark:bg-neutral-700 dark:text-neutral-300">
                        {getBlockPath(id)}
                    </span>
                ))}
                {extra > 0 && (
                    <span className="text-[10px] font-semibold bg-gray-100/50 text-gray-500 px-2 py-0.5 rounded dark:bg-black/20 dark:text-neutral-400">
                        +{extra}
                    </span>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }

    if (!canView) {
        return (
            <DashboardLayout>
                <div className="p-6 text-center text-gray-500">
                    {t('common.unauthorized', 'Unauthorized access')}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
            <div className="max-w-5xl mx-auto space-y-4 md:space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('notices.title')}</h1>
                        <p className="text-gray-500 text-sm dark:text-neutral-400">{t('notices.subtitle', 'Manage community announcements')}</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="glass-button"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            {t('notices.post_notice')}
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-neutral-800 rounded-xl"></div>)}
                        </div>
                    ) : notices.length === 0 ? (
                        <div className="glass-card text-center py-12">
                            <p className="text-gray-500 dark:text-neutral-400">{t('notices.no_notices')}</p>
                        </div>
                    ) : (
                        notices.map(notice => (
                            <div key={notice.id} className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300 ${getPriorityColor(notice.priority)}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20`}>
                                                {notice.priority}
                                            </span>
                                            {renderNoticeTargets(notice)}
                                            <span className="text-xs text-gray-500 dark:text-neutral-400">
                                                {new Date(notice.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{notice.title}</h2>
                                        <p className="text-gray-700 dark:text-neutral-300 text-sm whitespace-pre-wrap">{notice.content}</p>
                                    </div>

                                    {/* Delete Button (If creator or Admin) */}
                                    {(isAdminOrPres || notice.created_by === user.id) && (
                                        <button
                                            onClick={() => handleDeleteClick(notice.id)}
                                            className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                                            title={t('common.delete')}
                                            aria-label={t('common.delete')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create Modal */}
                <FormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleCreateNotice}
                    title={t('notices.post_notice')}
                    submitText={t('notices.post_notice')}
                    isLoading={isCreating}
                >
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('notices.form.title', 'Title')}</label>
                            <input
                                type="text"
                                value={newNotice.title}
                                onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                                className="glass-input w-full"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('notices.form.priority', 'Priority')}</label>
                            <GlassSelect
                                value={newNotice.priority}
                                onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
                                options={[
                                    { value: 'normal', label: t('notices.priority.normal', 'Normal') },
                                    { value: 'high', label: t('notices.priority.high', 'High') },
                                    { value: 'urgent', label: t('notices.priority.urgent', 'Urgent') }
                                ]}
                                placeholder={t('notices.form.select_priority', 'Select Priority')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('notices.form.content', 'Content')}</label>
                            <textarea
                                value={newNotice.content}
                                onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                                className="glass-input w-full rounded-xl"
                                rows="4"
                                required
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">{t('notices.form.target', 'Target Audience')}</label>

                            <div className="flex gap-4 mb-3">
                                <label className={`flex items-center gap-2 cursor-pointer ${(isVocal && !isAdminOrPres) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="radio"
                                        name="targetType"
                                        value="all"
                                        checked={newNotice.target_type === 'all'}
                                        onChange={() => setNewNotice({ ...newNotice, target_type: 'all' })}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                        disabled={isVocal && !isAdminOrPres}
                                    />
                                    <span className="text-sm dark:text-gray-300">{t('notices.target.global', 'All Community')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="targetType"
                                        value="blocks"
                                        checked={newNotice.target_type === 'blocks'}
                                        onChange={() => setNewNotice({ ...newNotice, target_type: 'blocks' })}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm dark:text-gray-300">{t('notices.target.specific_blocks', 'Specific Blocks')}</span>
                                </label>
                            </div>

                            {newNotice.target_type === 'blocks' && (
                                <div className="space-y-3">
                                    <HierarchicalBlockSelector
                                        blocks={blocks.filter(block => (isAdminOrPres || vocalBlockIds.includes(block.id)))}
                                        selectedBlocks={newNotice.target_blocks || []}
                                        onToggleBlock={handleToggleBlock}
                                    />

                                    {newNotice.target_blocks?.length > 0 && (
                                        <div className="mt-3 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 backdrop-blur-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                                    {t('campaigns.selection_summary', 'Selection Summary')}
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewNotice({ ...newNotice, target_blocks: [] })}
                                                    className="text-[10px] text-gray-500 hover:text-red-500 transition-colors"
                                                >
                                                    {t('common.clear_selection', 'Clear All')}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                                {newNotice.target_blocks
                                                    .filter(id => {
                                                        // Filter out children if parent is selected to keep it clean
                                                        const block = blocks.find(b => b.id === id);
                                                        if (!block) return true;
                                                        return !block.parent_id || !newNotice.target_blocks.includes(block.parent_id);
                                                    })
                                                    .map(id => (
                                                        <span key={id} className="px-2 py-0.5 bg-white/60 dark:bg-neutral-800/60 text-[10px] rounded-full border border-indigo-100/50 dark:border-indigo-900/50 flex items-center gap-1 group whitespace-nowrap">
                                                            {getBlockName(id)}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleBlock(id)}
                                                                className="hover:text-red-500 font-bold ml-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                            </div>
                                            <div className="mt-2 text-[10px] text-gray-500 italic">
                                                {newNotice.target_blocks.length} {t('campaigns.total_entities', 'total entities targeted')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </FormModal>

                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDelete}
                    title={t('common.delete')}
                    message={t('common.confirm_delete_notice', 'Are you sure you want to delete this notice?')}
                    confirmText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    isDangerous={true}
                    isLoading={isDeleting}
                />
            </div>
        </DashboardLayout>
    );
};

export default Notices;
