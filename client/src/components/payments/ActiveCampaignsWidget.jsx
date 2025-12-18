import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';
import CampaignProgress from './CampaignProgress';

const ActiveCampaignsWidget = (props) => {
    const { t } = useTranslation();
    const [campaigns, setCampaigns] = useState([]);
    
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
        }
    };

    if (campaigns.length === 0) return null;

    return (
        <div className={props.className}>
             <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-emerald-500">📢</span>
                    {t('payments.active_campaigns', 'Campaigns')}
                </h2>
            </div>
             <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                <div className="space-y-6">
                    {campaigns.map(campaign => (
                         <CampaignProgress key={campaign.id} campaign={campaign} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActiveCampaignsWidget;
