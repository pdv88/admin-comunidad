import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalPortal from '../ModalPortal';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

const FeeDetailsModal = ({ isOpen, onClose, fee, onUpdate }) => {
    const { t, i18n } = useTranslation();
    const { activeCommunity } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isOpen || !fee) return null;

    const formatPeriod = (period) => {
        const date = new Date(period + 'T12:00:00');
        const month = date.toLocaleDateString(i18n.language, { month: 'long', timeZone: 'UTC' });
        const year = date.toLocaleDateString(i18n.language, { year: 'numeric', timeZone: 'UTC' });
        return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    };

    const canRevert = fee.status === 'paid' && !fee.payment_id;

    const handleRevert = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/maintenance/${fee.id}/revert`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });

            const data = await res.json();

            if (res.ok) {
                onUpdate?.({ message: t('maintenance.reverted_success', 'Fee reverted to pending'), type: 'success' });
                onClose();
            } else {
                onUpdate?.({ message: data.error || 'Error reverting fee', type: 'error' });
            }
        } catch (error) {
            console.error('Revert error:', error);
            onUpdate?.({ message: 'Network error', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="glass-card max-w-lg w-full overflow-hidden transform transition-all animate-in zoom-in-95">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                {t('maintenance.fee_details', 'Fee Details')}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t('maintenance.status', 'Status')}:
                            </span>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusStyle(fee.status)}`}>
                                {t(`maintenance.statuses.${fee.status}`, fee.status)}
                            </span>
                        </div>

                        {/* Fee Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                                    {t('maintenance.period', 'Period')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {formatPeriod(fee.period)}
                                </span>
                            </div>
                            <div>
                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                                    {t('maintenance.amount', 'Amount')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {fee.amount}
                                </span>
                            </div>
                            <div>
                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                                    {t('maintenance.block', 'Block')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {fee.block_name || fee.units?.blocks?.name || '-'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                                    {t('maintenance.unit', 'Unit')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {fee.unit_number || fee.units?.unit_number}
                                </span>
                            </div>
                            {/* Calculation Details - Show only if available */}
                            {fee.total_budget && (
                                <div>
                                    <span className="block text-sm text-gray-500 dark:text-gray-400">
                                        {t('maintenance.budget_used', 'Budget Used')}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {activeCommunity?.currency} {fee.total_budget}
                                    </span>
                                </div>
                            )}
                            {fee.coefficient && (
                                <div>
                                    <span className="block text-sm text-gray-500 dark:text-gray-400">
                                        {t('maintenance.coefficient_applied', 'Coefficient Applied')}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {fee.coefficient}%
                                    </span>
                                </div>
                            )}
                            <div className="col-span-2">
                                <span className="block text-sm text-gray-500 dark:text-gray-400">
                                    {t('maintenance.owner', 'Owner')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {fee.owner_name || '-'}
                                </span>
                            </div>
                        </div>

                        {/* Payment Info (if exists) */}
                        {fee.payment_id && (
                            <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">
                                        {t('maintenance.has_payment_upload', 'This fee has a payment upload')}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                                    {t('maintenance.use_review', 'Use the Review button to manage the payment.')}
                                </p>
                            </div>
                        )}

                        {/* Manually marked notice (only for bulk-paid, smaller inline) */}
                        {canRevert && (
                            <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30">
                                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>{t('maintenance.marked_manually', 'Marked as paid manually')}</span>
                                </div>
                                <button
                                    onClick={handleRevert}
                                    disabled={loading}
                                    className="flex-shrink-0 py-1.5 px-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-500/50 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                    )}
                                    {t('maintenance.mark_pending', 'Mark Pending')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 flex justify-end bg-gray-50/50 dark:bg-white/5">
                        <button
                            onClick={onClose}
                            className="glass-button-secondary"
                        >
                            {t('common.close', 'Close')}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default FeeDetailsModal;
