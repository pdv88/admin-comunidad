import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';

const WelcomeWidget = ({ role }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [feeStatus, setFeeStatus] = useState('loading');
    const [feeAmount, setFeeAmount] = useState(0);
    const MONTHLY_FEE = 50.00;

    const hasUnits = user?.profile?.unit_owners?.length > 0;
    const isResident = role === 'resident' || role === 'neighbor' || hasUnits;

    useEffect(() => {
        if (isResident) {
            fetchPaymentStatus();
        }
    }, [isResident]);

    const fetchPaymentStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments?type=own`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const payments = await res.json();
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const thisMonthPayments = payments.filter(p => {
                    const pDate = new Date(p.created_at);
                    return pDate.getMonth() === currentMonth && 
                           pDate.getFullYear() === currentYear &&
                           p.status === 'confirmed' &&
                           !p.campaign_id;
                });
                const total = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                setFeeAmount(total);
                setFeeStatus(total >= MONTHLY_FEE ? 'paid' : 'pending');
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            setFeeStatus('error');
        }
    };

    return (
        <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 h-full">
            {/* Left: Greeting */}
            <div className="flex-1">
                 <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 mb-2">
                    {t('dashboard.welcome', 'Welcome')}, <br className="md:hidden"/>
                    <span className="text-gray-800 dark:text-white text-3xl block md:inline md:ml-2">
                        {user?.profile?.full_name || user?.user_metadata?.full_name || user?.email}
                    </span>
                </h1>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-neutral-400 items-center">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                        {user?.profile?.roles?.name || t('common.user', 'User')}
                    </span>
                     {user?.profile?.unit_owners?.map((uo, idx) => (
                        <span key={idx} className="bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-neutral-700 text-xs">
                            {uo.units?.unit_number}
                        </span>
                    ))}
                </div>
            </div>

            {/* Right: Resident Quick Actions & Status */}
            {isResident && (
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    {/* Monthly Fee Status Pill */}
                    {feeStatus !== 'loading' && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                            feeStatus === 'paid' 
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50' 
                            : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800/50'
                        }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                feeStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                                {feeStatus === 'paid' ? '✓' : '!'}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                     feeStatus === 'paid' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'
                                }`}>
                                    {t('dashboard.monthly_fee')}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-gray-900 dark:text-white">€{feeAmount.toFixed(0)}</span>
                                    <span className="text-xs text-gray-500">/ {MONTHLY_FEE.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Separator (Desktop) */}
                    <div className="hidden md:block w-px h-12 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                    {/* Quick Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                         <Link to="/app/payments" className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 transition-colors">
                            <span className="text-xl">💳</span>
                            <span className="text-[10px] font-bold uppercase">{t('dashboard.pay')}</span>
                        </Link>
                         <Link to="/app/notices" className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 dark:text-violet-400 transition-colors">
                            <span className="text-xl">🔑</span>
                            <span className="text-[10px] font-bold uppercase">{t('dashboard.visit')}</span>
                        </Link>
                         <Link to="/app/reports" className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:text-orange-400 transition-colors">
                            <span className="text-xl">⚠️</span>
                            <span className="text-[10px] font-bold uppercase">{t('dashboard.report_btn')}</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WelcomeWidget;
