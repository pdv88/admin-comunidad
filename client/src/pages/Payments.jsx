import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import CampaignProgress from '../components/payments/CampaignProgress';
import PaymentUpload from '../components/payments/PaymentUpload';
import PaymentList from '../components/payments/PaymentList';
import ModalPortal from '../components/ModalPortal';

const Payments = () => {
    const { t } = useTranslation();
    const { user, activeCommunity } = useAuth();
    const [myPayments, setMyPayments] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const role = activeCommunity?.roles?.name || 'resident';
    const isAdmin = ['admin', 'president', 'secretary'].includes(role);
    const hasUnit = activeCommunity?.unit_owners?.length > 0;
    
    // Allow upload if resident (has unit) OR if admin (can upload for others)
    const canUpload = hasUnit || isAdmin; 
    
    // Spec:
    // Residente: Registra, ve estatus.
    // Admin: Confirma, registra.
    // Presidente: Supervisa (ve reportes/lista).

    const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance' or 'campaigns'
    const [showUploadForm, setShowUploadForm] = useState(false);

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

    // Filter helpers
    const filterPayments = (payments) => {
        return payments.filter(p => {
             if (activeTab === 'maintenance') return !p.campaign_id;
             if (activeTab === 'campaigns') return p.campaign_id;
             return true;
        });
    };

    const filteredMyPayments = filterPayments(myPayments);
    const filteredAllPayments = filterPayments(allPayments);

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-4 md:space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {t('payments.title', 'Payments & Contributions')}
                    </h1>
                     {/* New Payment Button (Toggles Form) */}
                     {(canUpload || role === 'admin') && (
                        <button 
                            onClick={() => setShowUploadForm(true)}
                            className="glass-button"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            {t('payments.new_payment', 'New Payment')}
                        </button>
                    )}
                </div>

                {/* Upload Modal */}
                {showUploadForm && (
                     <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-lg">
                                <PaymentUpload 
                                    onSuccess={() => {
                                        fetchData();
                                        setShowUploadForm(false);
                                    }} 
                                    onCancel={() => setShowUploadForm(false)}
                                    isAdmin={isAdmin} 
                                />
                            </div>
                        </div>
                     </ModalPortal>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-neutral-700">
                    <nav className="-mb-px flex gap-6" aria-label="Tabs">
                        <button 
                            onClick={() => setActiveTab('maintenance')}
                            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'maintenance'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-neutral-400 dark:hover:text-neutral-300'
                            }`}
                        >
                            {t('payments.tabs.maintenance', 'Monthly Fees')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('campaigns')}
                            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'campaigns'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-neutral-400 dark:hover:text-neutral-300'
                            }`}
                        >
                            {t('payments.tabs.campaigns', 'Campaigns')}
                        </button>
                    </nav>
                </div>

                {/* Payment Lists */}
                <div className="space-y-8">
                     {/* 1. Community Payments (Admin View) */}
                     {isAdmin && (
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                                {activeTab === 'maintenance' 
                                    ? t('payments.list.all_maintenance', 'Community Maintenance Payments')
                                    : t('payments.list.all_campaigns', 'Community Campaign Contributions')
                                }
                            </h2>
                            <PaymentList 
                                payments={filteredAllPayments} 
                                isAdmin={true} 
                                onRefresh={fetchData} 
                                showResidentInfo={true}
                                loading={loading}
                            />
                        </div>
                    )}

                    {/* 2. My Payments (Personal History) - Only if they have a unit */}
                    {hasUnit && (
                        <div className="glass-card p-6">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                                {activeTab === 'maintenance' 
                                    ? t('payments.list.my_maintenance', 'My Monthly Fees')
                                    : t('payments.list.my_campaigns', 'My Campaign Contributions')
                                }
                            </h2>
                            <PaymentList 
                                payments={filteredMyPayments} 
                                isAdmin={false} // Even if admin, for THIS list we behave like user
                                onRefresh={fetchData} 
                                showResidentInfo={false}
                                loading={loading}
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Payments;
