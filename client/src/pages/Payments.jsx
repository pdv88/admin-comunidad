import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import CampaignProgress from '../components/payments/CampaignProgress';
import PaymentUpload from '../components/payments/PaymentUpload';
import PaymentList from '../components/payments/PaymentList';

const Payments = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [myPayments, setMyPayments] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const role = user?.profile?.roles?.name || 'resident';
    const isAdmin = role === 'admin' || role === 'president';
    // Relaxed rule: Allow president to upload too if needed, or simply debug.
    // Also include 'vice_president', 'secretary' etc just in case.
    const canUpload = ['resident', 'neighbor', 'president', 'vice_president', 'secretary', 'treasurer', 'vocal'].includes(role); 
    
    // Spec:
    // Residente: Registra, ve estatus.
    // Admin: Confirma, registra.
    // Presidente: Supervisa (ve reportes/lista).

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Always fetch 'my' payments
            const resMy = await fetch(`${API_URL}/api/payments?type=own`, { headers });
            if (resMy.ok) setMyPayments(await resMy.json());

            // If admin, fetch 'all' payments too
            if (isAdmin) {
                const resAll = await fetch(`${API_URL}/api/payments?type=all`, { headers });
                if (resAll.ok) setAllPayments(await resAll.json());
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                    {t('payments.title', 'Payments & Contributions')}
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left/Main Column */}
                    <div className={canUpload || isAdmin ? "lg:col-span-2 space-y-8" : "lg:col-span-3 space-y-8"}>
                        
                        {/* 1. Community Payments (Admin View) */}
                        {isAdmin && (
                            <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                                    {t('payments.list.all_title', 'Community Payments (By Block)')}
                                </h2>
                                <PaymentList 
                                    payments={allPayments} 
                                    isAdmin={true} 
                                    onRefresh={fetchData} 
                                    showResidentInfo={true}
                                />
                            </div>
                        )}

                        {/* 2. My Payments (Personal History) */}
                        <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                             <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                                {t('payments.list.my_title', 'My Payment History')}
                            </h2>
                            <PaymentList 
                                payments={myPayments} 
                                isAdmin={false} // Even if admin, for THIS list we behave like user
                                onRefresh={fetchData} 
                                showResidentInfo={false}
                            />
                        </div>
                    </div>

                    {/* Right Column: Upload/Action (Narrow) */}
                    {(canUpload || role === 'admin') && (
                        <div className="lg:col-span-1">
                            <PaymentUpload onSuccess={fetchData} isAdmin={isAdmin} />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Payments;
