import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import ImageUploader from './ImageUploader';
import GlassLoader from './GlassLoader';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';
import { exportReportToPDF } from '../utils/pdfExport';

const ReportDetailsPanel = ({ report, onUpdate }) => {
    const { t } = useTranslation();
    const { user, activeCommunity, hasAnyRole } = useAuth();
    const [activeTab, setActiveTab] = useState('details'); // details, notes, images
    const [notes, setNotes] = useState([]);
    const [images, setImages] = useState([]); // Array of { id, url, ... }
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [loadingImages, setLoadingImages] = useState(false);
    const [expandedImage, setExpandedImage] = useState(null);
    
    // Edit Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        title: report.title,
        description: report.description,
        category: report.category
    });
    const [savingEdit, setSavingEdit] = useState(false);

    // Report Images State
    const [uploading, setUploading] = useState(false);

    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // New Note State
    const [newNote, setNewNote] = useState('');
    const [sendingNote, setSendingNote] = useState(false);

    const notesContainerRef = useRef(null);

    // Permissions (using hasAnyRole helper)
    const canEdit = hasAnyRole(['super_admin', 'admin', 'president', 'maintenance']) || 
                   (hasAnyRole(['vocal']) && activeCommunity?.blocks?.some(b => b.id === report.block_id && b.representative_id === user.id)) ||
                   (report.user_id === user.id && report.status === 'pending');

    // Toast State
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // PDF Export handler
    const handleExportPDF = async () => {
        try {
            // Fetch notes and images if not already loaded
            let notesData = notes;
            let imagesData = images;
            
            if (notesData.length === 0) {
                const token = localStorage.getItem('token');
                const notesRes = await fetch(`${API_URL}/api/reports/${report.id}/notes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (notesRes.ok) notesData = await notesRes.json();
            }
            
            if (imagesData.length === 0) {
                const token = localStorage.getItem('token');
                const imagesRes = await fetch(`${API_URL}/api/reports/${report.id}/images`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (imagesRes.ok) imagesData = await imagesRes.json();
            }
            
            // Try to get logo and brand from nested communities object or direct property
            const logoUrl = activeCommunity?.communities?.logo_url || activeCommunity?.logo_url;
            const brandColor = activeCommunity?.communities?.brand_color || activeCommunity?.brand_color || '#3B82F6';

            await exportReportToPDF(report, notesData, imagesData, t, logoUrl, brandColor);
            setToast({ message: t('reports.pdf_exported', 'PDF downloaded successfully'), type: 'success' });
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setToast({ message: t('common.error_occurred', 'Error occurred'), type: 'error' });
        }
    };

    useEffect(() => {
        if (activeTab === 'notes') fetchNotes();
        if (activeTab === 'images') fetchImages();
    }, [activeTab]);

    useEffect(() => {
        // Auto scroll to bottom of notes container only
        if (activeTab === 'notes' && notesContainerRef.current) {
            const { scrollHeight, clientHeight } = notesContainerRef.current;
            notesContainerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    }, [notes, activeTab]);

    const fetchNotes = async () => {
        setLoadingNotes(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${report.id}/notes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setNotes(await res.json());
        } catch (err) {
            console.error(err);
            setToast({ message: t('common.error_occurred'), type: 'error' });
        } finally {
            setLoadingNotes(false);
        }
    };

    const fetchImages = async () => {
        setLoadingImages(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${report.id}/images`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setImages(await res.json());
        } catch (err) {
            console.error(err);
            setToast({ message: t('common.error_occurred'), type: 'error' });
        } finally {
            setLoadingImages(false);
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSavingEdit(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${report.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-community-id': activeCommunity.community_id
                },
                body: JSON.stringify(editForm)
            });
            
            if (res.ok) {
                onUpdate(); // refresh parent
                setIsEditing(false);
                setToast({ message: t('reports.update_success', 'Report updated successfully'), type: 'success' });
            } else {
                setToast({ message: t('common.error_occurred'), type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: t('common.error_occurred'), type: 'error' });
        } finally {
            setSavingEdit(false);
        }
    };

    const handleSendNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setSendingNote(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${report.id}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: newNote })
            });
            if (res.ok) {
                setNewNote('');
                fetchNotes();
            } else {
                setToast({ message: t('common.error_occurred'), type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: t('common.error_occurred'), type: 'error' });
        } finally {
            setSendingNote(false);
        }
    };

    const handleImageUpload = async (base64Img) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${report.id}/images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: base64Img })
            });

            if (res.ok) {
                fetchImages();
                setToast({ message: t('common.upload_success', 'Image uploaded successfully'), type: 'success' });
            } else {
                setToast({ message: t('common.upload_error', 'Error uploading image'), type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: t('common.upload_error', 'Error uploading image'), type: 'error' });
        }
    };

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, imageId: null });

    const handleDeleteImage = (imageId) => {
        setConfirmModal({ isOpen: true, imageId });
    };

    const confirmDeleteImage = async () => {
        if (!confirmModal.imageId) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${report.id}/images/${confirmModal.imageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchImages();
                setToast({ message: t('common.delete_success', 'Image deleted successfully'), type: 'success' });
            } else {
                 setToast({ message: t('common.error_occurred'), type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: t('common.error_occurred'), type: 'error' });
        } finally {
            setConfirmModal({ isOpen: false, imageId: null });
        }
    };

    return (
        <div className="glass-panel">
             {/* Toast Container - absolute within this panel or relative */}
             {toast.message && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast({ message: '', type: '' })} 
                />
            )}
            
            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, imageId: null })}
                onConfirm={confirmDeleteImage}
                title={t('common.delete', 'Delete')}
                message={t('common.confirm_delete_image', 'Are you sure you want to delete this image?')}
                isDangerous={true}
            />

            {/* Body - Flex layout for Sidebar (Tabs) + Content */}
            <div className="flex flex-col md:flex-row h-[500px]">
                {/* Tabs / Sidebar */}
                <div className="w-full md:w-56 bg-white/5 dark:bg-neutral-900/50 border-r border-white/10 dark:border-white/5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible shrink-0 backdrop-blur-sm p-2 gap-2">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 md:flex-none p-3 text-left font-medium transition-all rounded-xl border ${activeTab === 'details' ? 'bg-white/40 dark:bg-neutral-800/40 text-blue-600 border-white/40 shadow-lg backdrop-blur-md' : 'text-gray-600 dark:text-neutral-400 border-transparent hover:bg-white/10 dark:hover:bg-neutral-800/20'}`}
                    >
                        {t('reports.modal.details', 'Details')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('notes')}
                        className={`flex-1 md:flex-none p-3 text-left font-medium transition-all rounded-xl border ${activeTab === 'notes' ? 'bg-white/40 dark:bg-neutral-800/40 text-blue-600 border-white/40 shadow-lg backdrop-blur-md' : 'text-gray-600 dark:text-neutral-400 border-transparent hover:bg-white/10 dark:hover:bg-neutral-800/20'}`}
                    >
                        {t('reports.modal.notes', 'Notes & Activity')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('images')}
                        className={`flex-1 md:flex-none p-3 text-left font-medium transition-all rounded-xl border ${activeTab === 'images' ? 'bg-white/40 dark:bg-neutral-800/40 text-blue-600 border-white/40 shadow-lg backdrop-blur-md' : 'text-gray-600 dark:text-neutral-400 border-transparent hover:bg-white/10 dark:hover:bg-neutral-800/20'}`}
                    >
                        {t('reports.modal.images', 'Images')}
                    </button>
                    
                    {/* Divider */}
                    <div className="hidden md:block border-t border-white/10 dark:border-white/5 my-2"></div>
                    
                    {/* Export PDF Button */}
                    <button 
                        onClick={handleExportPDF}
                        className="flex-1 md:flex-none p-3 text-left font-medium transition-all rounded-xl border text-gray-600 dark:text-neutral-400 border-transparent hover:bg-white/10 dark:hover:bg-neutral-800/20 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('reports.export_pdf', 'Download PDF')}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent relative">
                    
                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-neutral-400 mb-1">
                                        {t('reports.modal.report_id', 'Report ID')}: <span className="font-mono text-xs">{report.id.slice(0, 8)}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-neutral-400">
                                        {t('reports.modal.created_at', 'Created')}: {new Date(report.created_at).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-neutral-400">
                                        {t('reports.modal.status', 'Status')}: <span className="font-semibold uppercase">{t(`reports.status.${report.status}`, report.status)}</span>
                                    </div>
                                </div>
                                {canEdit && !isEditing && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        {t('common.edit', 'Edit')}
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <form onSubmit={handleSaveEdit} className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('reports.form.issue_title', 'Title')}</label>
                                        <input 
                                            type="text" 
                                            className="glass-input"
                                            value={editForm.title} 
                                            onChange={e => setEditForm({...editForm, title: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('reports.form.category', 'Category')}</label>
                                        <select 
                                            className="glass-input"
                                            value={editForm.category}
                                            onChange={e => setEditForm({...editForm, category: e.target.value})}
                                        >
                                            <option value="maintenance">{t('reports.categories.maintenance')}</option>
                                            <option value="security">{t('reports.categories.security')}</option>
                                            <option value="cleanliness">{t('reports.categories.cleanliness')}</option>
                                            <option value="other">{t('reports.categories.other')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('reports.form.desc', 'Description')}</label>
                                        <textarea 
                                            className="glass-input rounded-3xl"
                                            rows="5"
                                            value={editForm.description}
                                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                                        ></textarea>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setIsEditing(false)} className="glass-button-secondary">{t('common.cancel')}</button>
                                        <button type="submit" disabled={savingEdit} className="glass-button">
                                            {savingEdit ? 'Saving...' : t('common.save')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="bg-white/30 dark:bg-neutral-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/10 shadow-sm">
                                    <h3 className="font-bold text-xl mb-3 text-gray-800 dark:text-white">{report.title}</h3>
                                    <p className="whitespace-pre-wrap text-gray-700 dark:text-neutral-200 leading-relaxed">{report.description}</p>
                                    <div className="mt-6 pt-4 border-t border-white/20 dark:border-white/10 flex gap-4 text-sm text-gray-600 dark:text-neutral-400">
                                       <span>{t('reports.form.category')}: <span className="font-medium text-gray-800 dark:text-neutral-200 capitalize">{t(`reports.categories.${report.category}`, report.category)}</span></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NOTES TAB */}
                    {activeTab === 'notes' && (
                        <div className="flex flex-col h-full">
                            <div ref={notesContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                                {loadingNotes && <div className="text-center py-4"><div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full text-blue-500"></div></div>}
                                {!loadingNotes && notes.length === 0 && (
                                    <p className="text-center text-gray-500 dark:text-neutral-500 italic py-10">{t('reports.modal.no_notes', 'No notes yet.')}</p>
                                )}
                                {notes.map(note => (
                                    <div key={note.id} className={`flex flex-col ${note.user_id === user.id ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${note.user_id === user.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 rounded-tr-none' : 'bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1 px-1">
                                            {note.profiles?.full_name || 'Unknown'} • {new Date(note.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleSendNote} className="relative">
                                <input 
                                    type="text" 
                                    placeholder={t('reports.modal.type_note', 'Type a note...')}
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    disabled={sendingNote}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newNote.trim() || sendingNote}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                                    aria-label={t('reports.modal.send_note', 'Send note')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* IMAGES TAB */}
                    {activeTab === 'images' && (
                        <div className="space-y-6">
                            <div className="flex justify-end mb-4 items-center gap-3">
                                {((report.image_url ? 1 : 0) + images.length) >= 5 && (
                                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                                        {t('reports.modal.max_images', 'Max 5 images reached')}
                                    </span>
                                )}
                                <ImageUploader 
                                    onImageSelected={handleImageUpload} 
                                    disabled={((report.image_url ? 1 : 0) + images.length) >= 5}
                                />
                            </div>
                            
                            {loadingImages ? (
                                <GlassLoader />
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {/* Original Primary Image from Report */}
                                    {report.image_url && (
                                        <div 
                                            className="relative aspect-square group rounded-xl overflow-hidden shadow-sm cursor-zoom-in"
                                            onClick={() => setExpandedImage(report.image_url)}
                                        >
                                             <img src={report.image_url} alt="Primary" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                             <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs p-1 text-center backdrop-blur-sm">
                                                 {t('reports.modal.primary', 'Primary')}
                                             </div>
                                        </div>
                                    )}
                                    
                                    {images.length === 0 && !report.image_url && (
                                        <div className="col-span-full py-12 text-center text-gray-400 dark:text-neutral-500 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-xl">
                                            {t('reports.modal.no_images', 'No images uploaded yet.')}
                                        </div>
                                    )}

                                    {images.map(img => (
                                        <div key={img.id} className="relative aspect-square group rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-neutral-900 cursor-zoom-in">
                                            <img 
                                                src={img.url} 
                                                alt="Uploaded" 
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                onClick={() => setExpandedImage(img.url)}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"></div>
                                            
                                            {/* Delete Button */}
                                            {(img.uploaded_by === user.id || ['admin', 'president'].includes(role)) && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteImage(img.id);
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-sm"
                                                    title={t('common.delete')}
                                                    aria-label={t('common.delete')}
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

             {/* Lightbox / Expanded Image */}
             {expandedImage && createPortal(
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setExpandedImage(null)}
                >
                    <button 
                        onClick={() => setExpandedImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                        aria-label={t('common.close', 'Close')}
                    >
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <img 
                        src={expandedImage} 
                        alt="Expanded" 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={e => e.stopPropagation()} 
                    />
                </div>,
                document.body
            )}
        </div>
    );
};

export default ReportDetailsPanel;
