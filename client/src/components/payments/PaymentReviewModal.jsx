import React, { useState, useEffect } from 'react';
import ModalPortal from '../ModalPortal';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';

const PaymentReviewModal = ({ isOpen, onClose, paymentId, onConfirm, onReject }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [payment, setPayment] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && paymentId) {
            fetchPayment();
        } else {
            setPayment(null);
        }
    }, [isOpen, paymentId]);

    const fetchPayment = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setPayment(await res.json());
            } else {
                setError("Failed to load payment details");
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (status) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/${paymentId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                if (status === 'confirmed') onConfirm();
                else onReject();
                onClose();
            } else {
                alert("Failed to update status");
            }
        } catch (err) {
            alert("Network error");
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                        {t('payments.review.title', 'Review Payment')}
                    </h3>

                    {loading ? (
                        <div className="text-center py-8 text-gray-500">{t('common.loading', 'Loading details...')}</div>
                    ) : error ? (
                        <div className="text-red-500 text-center py-4">{error}</div>
                    ) : payment && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-500 dark:text-gray-400">{t('payments.user', 'User')}</span>
                                    <span className="font-medium dark:text-white">{payment.profile?.full_name || 'Unknown'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 dark:text-gray-400">{t('payments.amount', 'Amount')}</span>
                                    <span className="font-bold text-lg text-green-600 dark:text-green-400">{payment.amount}€</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 dark:text-gray-400">{t('payments.date', 'Date')}</span>
                                    <span className="font-medium dark:text-white">{new Date(payment.payment_date).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 dark:text-gray-400">{t('payments.unit', 'Unit')}</span>
                                    <span className="font-medium dark:text-white">
                                        {payment.units ? `${payment.units.blocks?.name} - ${payment.units.unit_number}` : '-'}
                                    </span>
                                </div>
                            </div>

                            {payment.notes && (
                                <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg text-sm italic text-gray-600 dark:text-gray-300">
                                    "{payment.notes}"
                                </div>
                            )}

                            {payment.proof_url ? (
                                <div className="mt-4">
                                    <p className="text-sm font-medium mb-2 dark:text-gray-300">{t('payments.proof', 'Payment Proof')}</p>
                                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
                                        <img src={payment.proof_url} alt="Proof" className="w-full h-auto max-h-64 object-contain bg-gray-100 dark:bg-black" />
                                        <a 
                                            href={payment.proof_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700"
                                            title="Open full size"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                    {t('payments.no_proof', 'No proof image uploaded.')}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t dark:border-neutral-800 mt-4">
                                <button
                                    onClick={() => handleAction('rejected')}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                    {t('common.reject', 'Reject')}
                                </button>
                                <button
                                    onClick={() => handleAction('confirmed')}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {t('common.confirm', 'Confirm Payment')}
                                </button>
                            </div>
                        </div>
                    )}
                     <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        </ModalPortal>
    );
};

export default PaymentReviewModal;
