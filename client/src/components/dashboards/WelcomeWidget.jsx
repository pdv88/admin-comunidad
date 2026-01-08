import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';
import { getCurrencySymbol } from '../../utils/currencyUtils';

const WelcomeWidget = ({ role }) => {
    const { t } = useTranslation();
    const { user, activeCommunity, getPrimaryRole } = useAuth();
    const [feeStatus, setFeeStatus] = useState('loading');
    const [feeAmount, setFeeAmount] = useState(0);
    const MONTHLY_FEE = 50.00;

    const hasUnits = activeCommunity?.unit_owners?.length > 0;
    const displayRole = role || getPrimaryRole();
    const isResident = displayRole === 'resident' || displayRole === 'neighbor' || hasUnits;

    useEffect(() => {
        if (!isResident) return;
        
        const abortController = new AbortController();
        
        const fetchPaymentStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                // Fetch 'my statement' which includes all monthly fees (pending and paid)
                const res = await fetch(`${API_URL}/api/maintenance/my-statement`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'x-community-id': activeCommunity?.community_id },
                    signal: abortController.signal
                });
                
                if (res.ok) {
                    const fees = await res.json();
                    
                    // Calculate total UNPAID fees
                    const pendingFees = fees.filter(f => f.status === 'pending');
                    const totalUnpaid = pendingFees.reduce((sum, f) => sum + Number(f.amount), 0);
                    
                    setFeeAmount(totalUnpaid);
                    
                    // If 0 unpaid, status is 'paid' (Up to date), otherwise 'pending'
                    setFeeStatus(totalUnpaid === 0 ? 'paid' : 'pending');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching fees:', error);
                    setFeeStatus('error');
                }
            }
        };
        
        fetchPaymentStatus();
        
        return () => abortController.abort();
    }, [isResident, activeCommunity?.community_id]);

    return (
        <div className="glass-card p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 h-full">
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
                        {displayRole || t('common.user', 'User')}
                    </span>
                     {activeCommunity?.unit_owners?.map((uo, idx) => (
                        <span key={idx} className="bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-neutral-700 text-xs">
                            {uo.units?.unit_number}
                        </span>
                    ))}
                </div>
            </div>

            {/* Right: Resident Quick Actions & Status */}
            {isResident && (
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    {/* Monthly Fee Status Pill - Clickable */}
                    {feeStatus !== 'loading' ? (
                        <Link to="/app/maintenance" className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-md transition-all shadow-md hover:shadow-lg bg-white/40 dark:bg-white/5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg backdrop-blur-sm shadow-inner ${
                                feeStatus === 'paid' ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'
                            }`}>
                                {feeStatus === 'paid' ? '✓' : '!'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('dashboard.monthly_fee')}
                                </span>
                                <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${
                                     feeStatus === 'paid' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'
                                }`}>
                                    {feeStatus === 'paid' ? t('maintenance.statuses.paid', 'Paid') : t('maintenance.statuses.pending', 'Pending')}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    {feeStatus === 'paid' ? (
                                        <span className="font-bold text-gray-900 dark:text-white">{getCurrencySymbol(activeCommunity?.communities?.currency)}0.00</span>
                                    ) : (
                                        <span className="font-bold text-gray-900 dark:text-white">{getCurrencySymbol(activeCommunity?.communities?.currency)}{feeAmount.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse"></div>
                            <div className="flex flex-col gap-2">
                                <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                                <div className="h-4 w-12 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                            </div>
                        </div>
                    )}

                    {/* Separator (Desktop) */}
                    <div className="hidden md:block w-px h-12 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-2"></div>

                    {/* Quick Buttons */}
                     <div className="flex gap-3">
                         <Link to="/app/notices" className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl backdrop-blur-md bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 text-violet-700 dark:text-violet-400 hover:shadow-md transition-all w-16 shadow-sm">
                            <span className="text-xl drop-shadow-sm">🔑</span>
                            <span className="text-[10px] font-bold uppercase">{t('dashboard.visit')}</span>
                        </Link>
                         <Link to="/app/reports" className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl backdrop-blur-md bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 text-orange-700 dark:text-orange-400 hover:shadow-md transition-all w-16 shadow-sm">
                            <span className="text-xl drop-shadow-sm">⚠️</span>
                            <span className="text-[10px] font-bold uppercase">{t('dashboard.report_btn')}</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WelcomeWidget;
