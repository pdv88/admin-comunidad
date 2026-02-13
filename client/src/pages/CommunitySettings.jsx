import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '../utils/currencyUtils';

import DashboardLayout from '../components/DashboardLayout';
import GlassLoader from '../components/GlassLoader';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';

const CommunitySettings = () => {
    const { t } = useTranslation();
    const { user, activeCommunity, deleteCommunity, refreshActiveCommunity, hasAnyRole } = useAuth();

    // Only super_admin and president can edit community settings
    const canEdit = hasAnyRole(['super_admin', 'president', 'admin', 'secretary']); // Should match backend allowed roles
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [community, setCommunity] = useState({
        name: '',
        address: '',
        bank_details: [],
        logo_url: '',
        currency: DEFAULT_CURRENCY,
        country: 'MX',
        documents: []
    });
    const [documentFile, setDocumentFile] = useState(null);
    const [docName, setDocName] = useState('');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (activeCommunity?.community_id) {
            fetchCommunity();
        }
    }, [activeCommunity]);

    const fetchCommunity = async () => {
        try {
            const res = await fetch(`${API_URL}/api/communities/my`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-community-id': activeCommunity.community_id
                }
            });
            if (res.ok) {
                const data = await res.json();
                setCommunity({
                    ...data,
                    bank_details: Array.isArray(data.bank_details) ? data.bank_details : [],
                    logo_url: data.logo_url || '',
                    currency: data.currency || DEFAULT_CURRENCY,
                    country: data.country || 'MX',
                    documents: data.documents || []
                });
                if (data.logo_url) {
                    setLogoPreview(data.logo_url);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Resize Image Logic (Max 300px width)
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions
                const MAX_WIDTH = 300;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/png');
                setLogoPreview(dataUrl);
                // We'll send this dataUrl (base64) to backend
                setLogoFile(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = { ...community };
            if (logoFile) {
                payload.base64Logo = logoFile;
            }

            const res = await fetch(`${API_URL}/api/communities/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });
            // ... (rest remains same)

            if (res.ok) {
                setToast({ message: t('community_settings.success'), type: 'success' });
                const updatedCommunity = await res.json();
                setCommunity(prev => ({
                    ...prev,
                    ...updatedCommunity,
                    bank_details: Array.isArray(updatedCommunity.bank_details) ? updatedCommunity.bank_details : [],
                    logo_url: updatedCommunity.logo_url || ''
                }));
                if (updatedCommunity.logo_url) {
                    setLogoPreview(updatedCommunity.logo_url);
                }
                setLogoFile(null); // Clear the file after successful upload
                // Refresh the context so other components see the updated currency
                await refreshActiveCommunity();
            } else {
                const errorData = await res.json();
                setToast({ message: t('community_settings.error') + ': ' + (errorData.message || 'Unknown error'), type: 'error' });
            }
        } catch (error) {
            setToast({ message: t('community_settings.error_prefix') + error.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const addBankAccount = () => {
        setCommunity(prev => ({
            ...prev,
            bank_details: [...prev.bank_details, {
                bank_name: '',
                account_number: '',
                account_holder: '',
                secondary_number: '',
                secondary_type: 'clabe' // Default to CLABE for Mexico
            }]
        }));
    };

    const removeBankAccount = (index) => {
        setCommunity(prev => {
            const newBanks = [...prev.bank_details];
            newBanks.splice(index, 1);
            return { ...prev, bank_details: newBanks };
        });
    };

    const updateBankAccount = (index, field, value) => {
        setCommunity(prev => {
            const newBanks = [...prev.bank_details];
            newBanks[index] = { ...newBanks[index], [field]: value };
            return { ...prev, bank_details: newBanks };
        });
    };

    const handleUploadDocument = async (e) => {
        e.preventDefault();
        if (!documentFile || !docName) return;

        setUploadingDoc(true);
        try {
            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(documentFile);
            reader.onload = async () => {
                const base64File = reader.result;

                const res = await fetch(`${API_URL}/api/communities/documents`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'x-community-id': activeCommunity.community_id
                    },
                    body: JSON.stringify({ name: docName, base64File })
                });

                if (res.ok) {
                    const newDoc = await res.json();
                    setCommunity(prev => ({
                        ...prev,
                        documents: [newDoc, ...prev.documents]
                    }));
                    setDocumentFile(null);
                    setDocName('');
                    setToast({ message: t('community_settings.doc_upload_success', 'Document uploaded successfully'), type: 'success' });
                } else {
                    const error = await res.json();
                    setToast({ message: error.error || 'Upload failed', type: 'error' });
                }
                setUploadingDoc(false);
            };
        } catch (error) {
            console.error(error);
            setUploadingDoc(false);
            setToast({ message: 'Upload error', type: 'error' });
        }
    };

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm(t('community_settings.confirm_delete_doc', 'Delete this document?'))) return;

        try {
            const res = await fetch(`${API_URL}/api/communities/documents/${docId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (res.ok) {
                setCommunity(prev => ({
                    ...prev,
                    documents: prev.documents.filter(d => d.id !== docId)
                }));
                setToast({ message: t('community_settings.doc_delete_success', 'Document deleted'), type: 'success' });
            } else {
                setToast({ message: 'Delete failed', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: 'Delete error', type: 'error' });
        }
    };

    const handleDeleteCommunity = async () => {
        setLoading(true);
        try {
            await deleteCommunity(community.id);
            // Context handles redirection, but just in case:
            setShowDeleteModal(false);
        } catch (err) {
            setLoading(false);
            setShowDeleteModal(false);
            setToast({ message: t('community_settings.delete_error', 'Failed to delete community: ') + err.message, type: 'error' });
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('community_settings.title')}</h1>
                </div>

                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, message: '' })}
                />

                <div className="glass-card p-6 rounded-xl">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Basic Info - Logo left, inputs right on desktop; logo top on mobile */}
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Logo Upload - Left column on desktop, top on mobile */}
                            <div className="md:w-48 shrink-0 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition-colors">
                                <label className="cursor-pointer flex flex-col items-center space-y-2 w-full">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('community_settings.logo', 'Community Logo')}</span>
                                    {logoPreview || community.logo_url ? (
                                        <div className="relative group">
                                            <img
                                                src={logoPreview || community.logo_url}
                                                alt="Logo Preview"
                                                className="h-20 object-contain rounded-lg shadow-sm"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs">{t('common.change')}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoChange}
                                    />
                                    <span className="text-xs text-gray-500">{t('community_settings.logo_hint', 'Click to upload (max 300px)')}</span>
                                </label>
                            </div>

                            {/* Inputs - Right column on desktop */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('community_settings.name')}
                                    </label>
                                    <input
                                        type="text"
                                        className="glass-input w-full"
                                        value={community.name}
                                        onChange={(e) => setCommunity({ ...community, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('community_settings.address')}
                                    </label>
                                    <input
                                        type="text"
                                        className="glass-input w-full"
                                        value={community.address}
                                        onChange={(e) => setCommunity({ ...community, address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('community_settings.currency', 'Currency')}
                                    </label>
                                    <select
                                        className="glass-input w-full"
                                        value={community.currency}
                                        onChange={(e) => setCommunity({ ...community, currency: e.target.value })}
                                        disabled={!canEdit}
                                    >
                                        {SUPPORTED_CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('community_settings.country', 'Country')}
                                    </label>
                                    <select
                                        className="glass-input w-full"
                                        value={community.country || 'MX'}
                                        onChange={(e) => setCommunity({ ...community, country: e.target.value })}
                                        disabled={!canEdit}
                                    >
                                        <option value="MX">México 🇲🇽</option>
                                        <option value="ES">España 🇪🇸</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {community.country === 'ES'
                                            ? t('community_settings.country_hint_es', 'Enables coefficient-based fees.')
                                            : t('community_settings.country_hint_mx', 'Enables fixed fees per unit.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold dark:text-white">{t('community_settings.bank_accounts')}</h2>
                                <button
                                    type="button"
                                    onClick={addBankAccount}
                                    className="glass-button-secondary py-2 px-4 text-xs"
                                >
                                    {t('community_settings.add_account')}
                                </button>
                            </div>

                            {community.bank_details.length === 0 && (
                                <p className="text-sm text-gray-500 italic">{t('community_settings.no_accounts')}</p>
                            )}

                            <div className="space-y-4">
                                {community.bank_details.map((bank, index) => (
                                    <div key={index} className="glass-card bg-white/20 dark:bg-neutral-800/80 p-4 rounded-xl shadow-lg relative group border border-white/20 transition-all hover:bg-white/30 dark:hover:bg-neutral-800">
                                        <button
                                            type="button"
                                            onClick={() => removeBankAccount(index)}
                                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title={t('common.delete')}
                                            aria-label={t('common.delete')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">{t('community_settings.bank_name')}</label>
                                                <input
                                                    type="text"
                                                    className="glass-input w-full text-sm"
                                                    placeholder={t('community_settings.placeholders.bank_name')}
                                                    value={bank.bank_name}
                                                    onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">{t('community_settings.account_holder')}</label>
                                                <input
                                                    type="text"
                                                    className="glass-input w-full text-sm"
                                                    placeholder={t('community_settings.placeholders.account_holder')}
                                                    value={bank.account_holder}
                                                    onChange={(e) => updateBankAccount(index, 'account_holder', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">{t('community_settings.account_number')}</label>
                                                <input
                                                    type="text"
                                                    className="glass-input w-full text-sm font-mono"
                                                    placeholder={t('community_settings.placeholders.account_number')}
                                                    value={bank.account_number}
                                                    onChange={(e) => updateBankAccount(index, 'account_number', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    {t('community_settings.secondary_number', 'CLABE / IBAN / Routing')}
                                                    <span className="text-gray-400 ml-1">({t('common.optional', 'optional')})</span>
                                                </label>
                                                <div className="flex gap-2">
                                                    <select
                                                        className="glass-input text-sm w-24 shrink-0"
                                                        value={bank.secondary_type || 'clabe'}
                                                        onChange={(e) => updateBankAccount(index, 'secondary_type', e.target.value)}
                                                    >
                                                        <option value="clabe">CLABE</option>
                                                        <option value="iban">IBAN</option>
                                                        <option value="routing">Routing</option>
                                                        <option value="swift">SWIFT</option>
                                                        <option value="bic">BIC</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        className="glass-input w-full text-sm font-mono"
                                                        placeholder={bank.secondary_type === 'clabe' ? '18 digits' :
                                                            bank.secondary_type === 'iban' ? 'e.g. ES91 2100 0418...' :
                                                                bank.secondary_type === 'routing' ? '9 digits' :
                                                                    bank.secondary_type === 'swift' ? 'e.g. BSCHESMMXXX' :
                                                                        '8-11 characters'}
                                                        value={bank.secondary_number || ''}
                                                        onChange={(e) => updateBankAccount(index, 'secondary_number', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* Documents Section */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h2 className="text-lg font-semibold dark:text-white mb-4">{t('community_settings.documents', 'Community Documents')}</h2>

                            {/* Upload Form */}
                            {canEdit && (
                                <div className="glass-card bg-white/20 dark:bg-neutral-800/80 p-6 border-white/20 shadow-lg mb-6">
                                    <h3 className="text-sm font-medium mb-3 dark:text-gray-200">{t('community_settings.upload_new_doc', 'Upload New Document')}</h3>
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <input
                                                type="text"
                                                className="glass-input w-full"
                                                placeholder={t('community_settings.doc_name_placeholder', 'Document Name (e.g. Pool Rules)')}
                                                value={docName}
                                                onChange={(e) => setDocName(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="block w-full">
                                                <span className="sr-only">Choose file</span>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={(e) => setDocumentFile(e.target.files[0])}
                                                    className="block w-full text-sm text-gray-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-sm file:font-semibold
                                                    file:bg-blue-50 file:text-blue-700
                                                    hover:file:bg-blue-100
                                                    dark:file:bg-blue-900/40 dark:file:text-blue-300
                                                    "
                                                />
                                            </label>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!documentFile || !docName || uploadingDoc}
                                            onClick={handleUploadDocument}
                                            className="glass-button-secondary whitespace-nowrap"
                                        >
                                            {uploadingDoc ? t('common.uploading', 'Uploading...') : t('common.upload', 'Upload PDF')}
                                        </button>
                                    </div>
                                    {documentFile && <p className="text-xs text-gray-500 mt-2">{documentFile.name}</p>}
                                </div>
                            )}

                            {/* Documents List */}
                            <div className="space-y-2">
                                {community.documents && community.documents.length > 0 ? (
                                    community.documents.map((doc) => (
                                        <div key={doc.id} className="flex justify-between items-center bg-white/40 dark:bg-neutral-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-100/50 dark:bg-red-900/30 rounded-lg text-red-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                </div>
                                                <div>
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 hover:underline">
                                                        {doc.name}
                                                    </a>
                                                    <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic">{t('community_settings.no_documents', 'No documents uploaded yet.')}</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                            {canEdit ? (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="glass-button"
                                >
                                    {saving ? t('community_settings.saving') : t('community_settings.save')}
                                </button>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    {t('community_settings.view_only', 'You can view but not edit community settings.')}
                                </p>
                            )}
                        </div>
                    </form>
                </div>


                {/* Delete Community Button (Super Admin Only) */}
                {hasAnyRole(['super_admin']) && (
                    <div className="flex justify-end mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            disabled={!community?.id}
                            className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {t('community_settings.delete_community', 'Delete Community')}
                        </button>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteCommunity}
                title={t('community_settings.delete_community_title', 'Delete Community?')}
                message={t('community_settings.delete_warning_modal', 'This action cannot be undone. This will permanently delete the community, all members, units, and associated data.')}
                confirmText={t('common.delete', 'Delete')}
                isDangerous={true}
                inputConfirmation="DELETE"
            />
        </DashboardLayout>
    );
};

export default CommunitySettings;
