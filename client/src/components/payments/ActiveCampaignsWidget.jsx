import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';
import CampaignProgress from './CampaignProgress';

const ActiveCampaignsWidget = (props) => {
    const { t } = useTranslation();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter only active campaigns
                const active = data.filter(c => c.is_active);
                setCampaigns(active);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className={props.className}>
             <div className="flex items-center justify-between mb-4">
                 <div className="h-6 w-32 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
            </div>
             <div className="space-y-6">
                {[1, 2, 3].map(i => (
                     <div key={i} className="space-y-2">
                        <div className="flex justify-between">
                            <div className="h-4 w-1/3 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                            <div className="h-4 w-16 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-neutral-800 rounded-full animate-pulse"></div>
                     </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className={props.className}>
             <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-emerald-500">📢</span>
                    {t('payments.campaigns.active_campaigns', 'Campaigns')}
                </h2>
            </div>
             <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {campaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-neutral-500 py-8">
                        <span className="text-4xl mb-2 opacity-50">📢</span>
                        <p className="font-medium">{t('payments.campaigns.no_active_campaigns', 'No active campaigns')}</p>
                        <p className="text-sm opacity-75">{t('payments.campaigns.check_later', 'New campaigns will appear here')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {campaigns.map(campaign => (
                             <CampaignProgress key={campaign.id} campaign={campaign} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActiveCampaignsWidget;
