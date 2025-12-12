import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';

const MonthlyPaymentWidget = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState('loading'); // loading, paid, pending
    const [currentAmount, setCurrentAmount] = useState(0);
    
    // Configurable standard monthly fee
    const MONTHLY_FEE = 50.00; 

    useEffect(() => {
        fetchPaymentStatus();
    }, []);

    const fetchPaymentStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch 'own' payments
            const res = await fetch(`${API_URL}/api/payments?type=own`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const payments = await res.json();
                
                // Filter for current month and confirmed status
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const thisMonthPayments = payments.filter(p => {
                    const pDate = new Date(p.created_at);
                    return pDate.getMonth() === currentMonth && 
                           pDate.getFullYear() === currentYear &&
                           p.status === 'confirmed' &&
                           !p.campaign_id; // Exclude special campaign contributions
                });

                const total = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                setCurrentAmount(total);
                
                if (total >= MONTHLY_FEE) {
                    setStatus('paid');
                } else {
                    setStatus('pending');
                }
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            setStatus('error');
        }
    };

    if (status === 'loading') return null;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                {t('dashboard.monthly_fee', 'Monthly Fee')}
            </h2>

            <div className="flex items-center justify-between">
                <div>
                     <p className="text-sm text-gray-500 dark:text-neutral-400 mb-1">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-800 dark:text-white">
                            €{currentAmount.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">
                            / €{MONTHLY_FEE.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                    ${status === 'paid' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}
                >
                    {status === 'paid' ? '✓' : '⏳'}
                </div>
            </div>

            <div className="mt-4">
                {status === 'paid' ? (
                     <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/10 p-3 rounded-lg">
                        <span>✨</span>
                        {t('dashboard.payment_complete', 'You are up to date!')}
                    </div>
                ) : (
                    <Link 
                        to="/app/payments" 
                        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                        {t('common.pay_now', 'Pay Now')}
                    </Link>
                )}
            </div>
        </div>
    );
};

export default MonthlyPaymentWidget;
