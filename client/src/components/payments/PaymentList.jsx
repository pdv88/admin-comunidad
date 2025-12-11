import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';
import ConfirmationModal from '../ConfirmationModal';

const PaymentList = ({ payments, isAdmin, onRefresh, showResidentInfo = false }) => {
    const { t } = useTranslation();
    const [processingId, setProcessingId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

    const handleStatusUpdate = async (id, status) => {
        setProcessingId(id);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status })
            });
            if (res.ok && onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    const confirmDelete = (id) => {
        setDeleteModal({ isOpen: true, id });
    };

    const executeDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;
        
        setDeleteModal({ isOpen: false, id: null });
        setProcessingId(id);
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }

            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            alert(error.message); // Fallback alert for error is okay, or could use a toast
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'confirmed': return <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500">{t('payments.status.confirmed', 'Confirmed')}</span>;
            case 'rejected': return <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-500">{t('payments.status.rejected', 'Rejected')}</span>;
            default: return <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500">{t('payments.status.pending', 'Pending')}</span>;
        }
    };

    return (
        <>
            <ConfirmationModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={executeDelete}
                title={t('common.delete_payment', 'Delete Payment')}
                message={t('common.confirm_delete', 'Are you sure you want to delete this payment?')}
                confirmText={t('common.delete', 'Delete')}
                isDangerous={true}
            />

            <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                        {/* Title is now handled by parent or generic fallback */}
                        {showResidentInfo ? t('payments.list.title_community', 'Community Payments') : t('payments.list.title', 'Payment History')}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                        <thead className="bg-gray-50 dark:bg-neutral-700">
                            <tr>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('payments.table.date', 'Date')}</th>
                                {showResidentInfo && (
                                    <>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('payments.table.user', 'User')}</th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('payments.table.unit', 'Unit/Block')}</th>
                                    </>
                                )}
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('payments.table.amount', 'Amount')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('payments.table.status', 'Status')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('payments.table.proof', 'Receipt')}</th>
                                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('payments.table.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={showResidentInfo ? 8 : 6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-neutral-400">
                                        {t('payments.list.empty', 'No payments found.')}
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                            {new Date(payment.created_at).toLocaleDateString()}
                                        </td>
                                        {showResidentInfo && (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                                    {payment.profiles?.full_name || payment.profiles?.email || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                                    {payment.profiles?.units 
                                                        ? `${payment.profiles.units.block} - ${payment.profiles.units.number}`
                                                        : '-'
                                                    }
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                            €{payment.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {getStatusBadge(payment.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {payment.proof_url ? (
                                                <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    {t('common.view', 'View')}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                            {isAdmin ? (
                                                payment.status === 'pending' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleStatusUpdate(payment.id, 'confirmed')}
                                                            disabled={processingId === payment.id}
                                                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                        >
                                                            {t('common.approve', 'Approve')}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(payment.id, 'rejected')}
                                                            disabled={processingId === payment.id}
                                                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                        >
                                                            {t('common.reject', 'Reject')}
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                /* User Actions: Delete if pending */
                                                payment.status === 'pending' && (
                                                    <button 
                                                        onClick={() => confirmDelete(payment.id)}
                                                        disabled={processingId === payment.id}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    >
                                                        {t('common.delete', 'Delete')}
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default PaymentList;
