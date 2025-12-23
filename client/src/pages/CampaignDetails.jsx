import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import GlassLoader from '../components/GlassLoader';
import PaymentList from '../components/payments/PaymentList';
import CampaignProgress from '../components/payments/CampaignProgress';

const CampaignDetails = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const { user, activeCommunity } = useAuth();
    const navigate = useNavigate();
    const role = activeCommunity?.roles?.name;
    const isAdmin = role === 'admin' || role === 'president';

    const [campaign, setCampaign] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);


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

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
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
                    {t('campaigns.not_found', 'Campaign not found.')}
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
                    onClick={() => navigate('/app/campaigns')}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    {t('campaigns.back_to_list', 'Back to Campaigns')}
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
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p className="text-xs text-gray-500 uppercase">{t('campaigns.stats.goal', 'Goal')}</p>
                            <p className="text-xl font-bold dark:text-white">€{campaign.target_amount}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                            <p className="text-xs text-gray-500 uppercase">{t('campaigns.stats.raised', 'Raised')}</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">€{campaign.current_amount}</p>
                        </div>
                    </div>
                </div>

                {/* Contributions List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white px-1">
                        {t('campaigns.contributions_title', 'Contributions History')}
                    </h2>
                    
                    <PaymentList 
                        payments={payments} 
                        isAdmin={isAdmin} 
                        onRefresh={fetchData}
                        showResidentInfo={isAdmin} // Admins see who paid
                    />
                </div>

            </div>
        </DashboardLayout>
    );
};

export default CampaignDetails;
