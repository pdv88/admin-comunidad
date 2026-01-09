import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';
import ModalPortal from '../components/ModalPortal';
import GlassSelect from '../components/GlassSelect';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';

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
        block_id: '' 
    });

    // Delete State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [noticeToDelete, setNoticeToDelete] = useState(null);

    const canCreate = hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal']);
    const isAdminOrPres = hasAnyRole(['super_admin', 'admin', 'president', 'secretary']);
    const isVocal = hasAnyRole(['vocal']);

    // Extract blocks owned by Vocal from activeCommunity.roles
    const vocalBlockIds = activeCommunity?.roles
        ?.filter(r => r.name === 'vocal' && r.block_id)
        .map(r => r.block_id) || [];

    useEffect(() => {
        if (!canCreate) return; // Redirect logic usually handled by router or layout, but good to check
        fetchNotices();
        if (isAdminOrPres || isVocal) fetchBlocks();
        
        // Init form for Vocal
        if (isVocal && vocalBlockIds.length > 0) {
             setNewNotice(prev => ({ ...prev, block_id: vocalBlockIds[0] }));
        }
    }, [canCreate, isVocal, isAdminOrPres]);

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
        try {
            const token = localStorage.getItem('token');
            const payload = { ...newNotice };
            if (payload.block_id === '') payload.block_id = null; // Ensure generic is null

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
                setNewNotice({ title: '', content: '', priority: 'normal', block_id: isVocal && vocalBlockIds.length > 0 ? vocalBlockIds[0] : '' });
                fetchNotices();
                setToast({ message: t('notices.create_success', 'Notice posted successfully'), type: 'success' });
            } else {
                 const d = await res.json();
                 setToast({ message: d.error || t('common.error', 'Error creating notice'), type: 'error' });
            }
        } catch (error) {
            console.error('Error creating notice:', error);
            setToast({ message: t('common.error', 'Error creating notice'), type: 'error' });
        }
    };

    const handleDeleteClick = (id) => {
        setNoticeToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!noticeToDelete) return;
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
        }
    };

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'urgent': return 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-200';
            case 'high': return 'bg-orange-500/10 border-orange-500/20 text-orange-800 dark:text-orange-200';
            default: return 'glass-card border-white/40 dark:border-neutral-700/50'; 
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }
    
    if (!canCreate) {
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
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('notices.title')}</h1>
                        <p className="text-gray-500 text-sm dark:text-neutral-400">{t('notices.subtitle', 'Manage community announcements')}</p>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="glass-button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        {t('notices.post_notice')}
                    </button>
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {loading ? (
                         <div className="animate-pulse space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-neutral-800 rounded-xl"></div>)}
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
                                            {notice.block_id ? (
                                                <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded dark:bg-neutral-700 dark:text-neutral-300">
                                                    {t('notices.block_notice', 'Block Notice')}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded dark:bg-purple-900/30 dark:text-purple-300">
                                                    {t('notices.global_notice', 'Global')}
                                                </span>
                                            )}
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
                {showModal && (
                    <ModalPortal>
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="glass-card w-full max-w-lg p-6 animate-fade-in">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('notices.post_notice')}</h2>
                            <form onSubmit={handleCreateNotice} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('notices.form.title', 'Title')}</label>
                                    <input
                                        type="text"
                                        value={newNotice.title}
                                        onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                                        className="glass-input"
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('notices.form.priority', 'Priority')}</label>
                                        <GlassSelect
                                            value={newNotice.priority}
                                            onChange={(e) => setNewNotice({...newNotice, priority: e.target.value})}
                                            options={[
                                                { value: 'normal', label: t('notices.priority.normal', 'Normal') },
                                                { value: 'high', label: t('notices.priority.high', 'High') },
                                                { value: 'urgent', label: t('notices.priority.urgent', 'Urgent') }
                                            ]}
                                            placeholder={t('notices.form.select_priority', 'Select Priority')}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('notices.form.target', 'Target Audience')}</label>
                                        <GlassSelect
                                            value={newNotice.block_id}
                                            onChange={(e) => setNewNotice({...newNotice, block_id: e.target.value})}
                                            disabled={isVocal && vocalBlockIds.length === 1}
                                            options={[
                                                ...(isAdminOrPres ? [{ value: '', label: t('notices.target.global', 'All Community') }] : []),
                                                ...(blocks
                                                    .filter(block => isAdminOrPres || vocalBlockIds.includes(block.id))
                                                    .map(block => ({ value: block.id, label: block.name })))
                                            ]}
                                            placeholder={t('notices.form.select_target', 'Select Target')}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('notices.form.content', 'Content')}</label>
                                    <textarea
                                        value={newNotice.content}
                                        onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}
                                        className="glass-input rounded-2xl"
                                        rows="4"
                                        required
                                    ></textarea>
                                </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="glass-button-secondary flex-1"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            className="glass-button flex-1"
                                        >
                                            {t('notices.post_notice')}
                                        </button>
                                    </div>
                            </form>
                        </div>
                    </div>
                    </ModalPortal>
                )}

                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDelete}
                    title={t('common.delete')}
                    message={t('common.confirm_delete_notice', 'Are you sure you want to delete this notice?')}
                    confirmText={t('common.delete')}
                    cancelText={t('common.cancel')}
                />
            </div>
        </DashboardLayout>
    );
};

export default Notices;
