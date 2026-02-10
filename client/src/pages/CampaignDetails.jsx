import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import GlassLoader from '../components/GlassLoader';
import PaymentList from '../components/payments/PaymentList';
import CampaignProgress from '../components/payments/CampaignProgress';
import PaymentUpload from '../components/payments/PaymentUpload';
import ModalPortal from '../components/ModalPortal';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrencySymbol } from '../utils/currencyUtils';

const CampaignDetails = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const { user, activeCommunity, hasAnyRole } = useAuth();
    const navigate = useNavigate();
    const isAdmin = hasAnyRole(['super_admin', 'admin', 'president', 'treasurer']);

    const [campaign, setCampaign] = useState(null);
    const [payments, setPayments] = useState([]);
    const [linkedFees, setLinkedFees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);

    // Delete Fee State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [feeToDelete, setFeeToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Bulk Actions State
    const [selectedFees, setSelectedFees] = useState(new Set());
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState(null); // 'delete' or 'pay'
    const [actionLoading, setActionLoading] = useState(false);


    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch Campaign Details
            const campRes = await fetch(`${API_URL}/api/payments/campaigns/${id}`, { headers });
            if (!campRes.ok) throw new Error('Campaign not found');
            const campData = await campRes.json();
            setCampaign(campData);

            // Fetch Contributions (Payments for this campaign)
            // We use the 'all' type to see everyone's contributions if admin
            // However, getPayments logic for non-admins usually filters to 'own'. 
            // If we want transparency (everyone sees who contributed), we need backend support or Admin only.
            // Requirement says "for the admins to be able to click... and confirm them".
            // So we assume this view is primarily for Admins to view ALL contributions.
            // If a resident views this, they might only see their own or we assume transparency (usually campaigns are public).
            // But `getPayments` enforces strict ownership for non-admins unless we change it.
            // Let's stick to current backend logic: Admin sees all, User sees own.

            const payRes = await fetch(`${API_URL}/api/payments?campaign_id=${id}`, { headers });
            if (payRes.ok) {
                const payData = await payRes.json();
                setPayments(payData);
            }

            // Fetch Linked Fees if Mandatory
            if (campData.is_mandatory) {
                const feeRes = await fetch(`${API_URL}/api/maintenance/status?campaign_id=${id}`, { headers });
                if (feeRes.ok) {
                    const feeData = await feeRes.json();
                    setLinkedFees(feeData.data || []);
                }
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayClick = (fee) => {
        setSelectedFeeForPayment(fee);
        setPaymentModalOpen(true);
    };

    const handleDeleteClick = (fee) => {
        setFeeToDelete(fee);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!feeToDelete) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/maintenance/${feeToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete fee');
            }

            // Successfully deleted
            fetchData(); // Refresh list
            setDeleteModalOpen(false);
            setFeeToDelete(null);

        } catch (error) {
            console.error(error);
            // Optionally show error toast if implemented, or just log for now
        } finally {
            setDeleting(false);
        }
    };

    // Bulk action handlers
    const handleSelectFee = (feeId) => {
        setSelectedFees(prev => {
            const newSet = new Set(prev);
            if (newSet.has(feeId)) {
                newSet.delete(feeId);
            } else {
                newSet.add(feeId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const selectableFees = linkedFees.filter(fee => fee.status === 'pending' && !fee.payment_id);
        if (selectedFees.size === selectableFees.length) {
            setSelectedFees(new Set());
        } else {
            setSelectedFees(new Set(selectableFees.map(fee => fee.id)));
        }
    };

    const handleBulkAction = (action) => {
        setBulkAction(action);
        setBulkModalOpen(true);
    };

    const handleConfirmBulkAction = async () => {
        if (!bulkAction || selectedFees.size === 0) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const feeIds = Array.from(selectedFees);
            const endpoint = bulkAction === 'delete'
                ? `${API_URL}/api/maintenance/bulk`
                : `${API_URL}/api/maintenance/bulk/pay`;

            const res = await fetch(endpoint, {
                method: bulkAction === 'delete' ? 'DELETE' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ feeIds, type: 'extraordinary' })
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedFees(new Set());
                fetchData();
                setBulkModalOpen(false);
                setBulkAction(null);
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Bulk action failed');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }

    if (!campaign) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-gray-500">
                    {t('campaigns.not_found', 'Extraordinary fee not found.')}
                    <button onClick={() => navigate('/app/campaigns')} className="block mt-4 text-blue-500 hover:underline mx-auto">
                        {t('common.back', 'Go Back')}
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header / Back */}
                <button
                    onClick={() => {
                        if (isAdmin) {
                            navigate('/app/maintenance?tab=extraordinary');
                        } else {
                            navigate('/app/my-balance?tab=extraordinary');
                        }
                    }}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    {t('campaigns.back_to_list', 'Back to Extraordinary Fees')}
                </button>

                {/* Campaign Info Card */}
                <div className="glass-card p-6 md:p-8 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{campaign.name}</h1>
                            <span className={`inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium ${campaign.is_active ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500' : 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-500'}`}>
                                {campaign.is_active ? t('campaigns.active', 'Active') : t('campaigns.closed', 'Closed')}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('campaigns.deadline_label', 'Deadline')}</p>
                            <p className="font-semibold text-gray-800 dark:text-white">{campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : t('common.ongoing', 'Ongoing')}</p>
                        </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-4xl">
                        {campaign.description || t('campaigns.no_desc', 'No description provided.')}
                    </p>

                    <CampaignProgress campaign={campaign} />

                    {/* Voluntary Contribution Button */}
                    {campaign.is_active && !campaign.is_mandatory && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => {
                                    setSelectedFeeForPayment(null);
                                    setPaymentModalOpen(true);
                                }}
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {t('campaigns.contribute', 'Make a Contribution')}
                            </button>
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p className="text-xs text-gray-500 uppercase">{t('campaigns.stats.goal', 'Goal')}</p>
                            <p className="text-xl font-bold dark:text-white">{getCurrencySymbol(activeCommunity?.communities?.currency)}{campaign.target_amount}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p className="text-xs text-gray-500 uppercase">{t('campaigns.stats.raised', 'Raised')}</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{getCurrencySymbol(activeCommunity?.communities?.currency)}{campaign.current_amount}</p>
                        </div>
                    </div>
                </div>

                {/* Contributions List - Only for Voluntary Campaigns (Non-Mandatory) */}
                {!campaign.is_mandatory && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white px-1">
                            {t('campaigns.contributions_title', 'Contributions History')}
                        </h2>

                        <PaymentList
                            payments={payments}
                            isAdmin={isAdmin}
                            onRefresh={fetchData}
                            showResidentInfo={isAdmin}
                            currencyCode={activeCommunity?.communities?.currency}
                        />
                    </div>
                )}

                {/* Linked Fees for Mandatory Campaigns */}
                {campaign.is_mandatory && isAdmin && (
                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {t('campaigns.fees_status_title', 'Extraordinary Fees Status')}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                {t('common.paid', 'Paid')}: {linkedFees.filter(f => f.status === 'paid').length}
                                <span className="w-3 h-3 rounded-full bg-blue-500 ml-2"></span>
                                {t('common.pending', 'Pending')}: {linkedFees.filter(f => f.status === 'pending').length}
                            </div>
                        </div>

                        <div className="glass-card overflow-hidden">
                            {/* Bulk Action Bar */}
                            {selectedFees.size > 0 && (
                                <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-indigo-100 dark:border-indigo-500/30 flex items-center justify-between gap-4 flex-wrap">
                                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                        {t('maintenance.selected_count', { count: selectedFees.size })}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleBulkAction('pay')}
                                            disabled={actionLoading}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {t('maintenance.bulk_mark_paid', 'Mark as Paid')}
                                        </button>
                                        <button
                                            onClick={() => handleBulkAction('delete')}
                                            disabled={actionLoading}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            {t('maintenance.bulk_delete', 'Delete Selected')}
                                        </button>
                                        <button
                                            onClick={() => setSelectedFees(new Set())}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                                        >
                                            {t('maintenance.clear_selection', 'Clear')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="glass-table">
                                    <thead>
                                        <tr>
                                            <th className="w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={linkedFees.filter(f => f.status === 'pending' && !f.payment_id).length > 0 && selectedFees.size === linkedFees.filter(f => f.status === 'pending' && !f.payment_id).length}
                                                    onChange={handleSelectAll}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-neutral-700"
                                                />
                                            </th>
                                            <th>{t('user_management.table.block', 'Block')}</th>
                                            <th>{t('user_management.table.unit', 'Unit')}</th>
                                            <th>{t('user_management.table.name', 'Owner')}</th>
                                            <th>{t('payments.table.amount', 'Amount')}</th>
                                            <th>{t('payments.table.status', 'Status')}</th>
                                            <th className="text-end">{t('common.actions', 'Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {linkedFees.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-8 text-gray-500">
                                                    {t('campaigns.no_fees_generated', 'No fees generated for this extraordinary fee.')}
                                                </td>
                                            </tr>
                                        ) : (
                                            linkedFees.map((fee) => (
                                                <tr key={fee.id} className={selectedFees.has(fee.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFees.has(fee.id)}
                                                            onChange={() => handleSelectFee(fee.id)}
                                                            disabled={fee.status === 'paid' || !!fee.payment_id}
                                                            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-neutral-700"
                                                        />
                                                    </td>
                                                    <td className="text-gray-800 dark:text-neutral-200">{fee.block_name}</td>
                                                    <td className="text-gray-800 dark:text-neutral-200">{fee.unit_number}</td>
                                                    <td className="text-gray-800 dark:text-neutral-200">{fee.owner_name}</td>
                                                    <td className="text-gray-800 dark:text-neutral-200">
                                                        {getCurrencySymbol(activeCommunity?.communities?.currency)}{fee.amount}
                                                    </td>
                                                    <td>
                                                        <span className={`inline-flex items-center gap-x-1.5 py-1 px-2.5 rounded-full text-xs font-medium ${fee.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500' : 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500'}`}>
                                                            {fee.status === 'paid' ? t('payments.status.confirmed', 'Paid') : t('payments.status.pending', 'Pending')}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {fee.status === 'pending' && !fee.payment_id && (
                                                            <button
                                                                onClick={() => handlePayClick(fee)}
                                                                className="mr-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-md border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30 dark:hover:bg-emerald-500/30 transition-colors"
                                                                title={t('maintenance.record_payment', 'Record Payment')}
                                                            >
                                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                {t('maintenance.register', 'Register')}
                                                            </button>
                                                        )}
                                                        {fee.status === 'pending' && isAdmin && (
                                                            <button
                                                                onClick={() => handleDeleteClick(fee)}
                                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                                title={t('common.delete', 'Delete')}
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Payment Upload Modal */}
            {
                paymentModalOpen && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-lg">
                                <PaymentUpload
                                    onSuccess={() => {
                                        setPaymentModalOpen(false);
                                        fetchData();
                                    }}
                                    onCancel={() => setPaymentModalOpen(false)}
                                    initialType="campaign"
                                    initialFeeId={selectedFeeForPayment?.id}
                                    initialAmount={selectedFeeForPayment?.amount}
                                    initialUnitId={selectedFeeForPayment?.unit_id}
                                    initialCampaignId={campaign?.id}
                                    isAdmin={isAdmin}
                                />
                            </div>
                        </div>
                    </ModalPortal>
                )
            }

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('maintenance.delete_fee_title', 'Delete Fee')}
                message={t('maintenance.delete_fee_confirm', 'Are you sure you want to delete this fee? This action cannot be undone.')}
                confirmText={t('common.delete', 'Delete')}
                isDangerous={true}
                isLoading={deleting}
            />

            {/* Bulk Action Confirmation Modal */}
            <ConfirmationModal
                isOpen={bulkModalOpen}
                onClose={() => { setBulkModalOpen(false); setBulkAction(null); }}
                onConfirm={handleConfirmBulkAction}
                title={bulkAction === 'delete'
                    ? t('maintenance.bulk_delete_title', 'Delete Selected Fees')
                    : t('maintenance.bulk_paid_title', 'Mark Fees as Paid')}
                message={bulkAction === 'delete'
                    ? t('maintenance.bulk_delete_confirm', 'Are you sure you want to delete {{count}} fee(s)? This action cannot be undone.').replace('{{count}}', selectedFees.size)
                    : t('maintenance.bulk_paid_confirm', 'Mark {{count}} fee(s) as paid?').replace('{{count}}', selectedFees.size)}
                confirmText={bulkAction === 'delete'
                    ? t('common.delete', 'Delete')
                    : t('maintenance.confirm_paid', 'Mark as Paid')}
                isDangerous={bulkAction === 'delete'}
                isLoading={actionLoading}
            />

        </DashboardLayout >
    );
};

export default CampaignDetails;
