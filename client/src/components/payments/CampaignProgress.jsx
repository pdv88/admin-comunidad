import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';

const CampaignProgress = ({ campaign: propCampaign }) => {
    const { t } = useTranslation();
    const [fetchedCampaign, setFetchedCampaign] = useState(null);
    
    useEffect(() => {
        if (!propCampaign) {
            fetchCampaigns();
        }
    }, [propCampaign]);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    setFetchedCampaign(data[0]);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const campaign = propCampaign || fetchedCampaign;

    if (!campaign) return null;
    const percentage = Math.min(100, (campaign.current_amount / campaign.target_amount) * 100);

    return (
        <div className="glass-card p-6 shadow-sm mb-6 border border-white/20 dark:border-white/5 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800 dark:text-white">{campaign.name}</h3>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-500">
                    €{campaign.current_amount} / €{campaign.target_amount}
                </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">{percentage.toFixed(1)}% {t('payments.campaign.funded', 'Funded')}</p>
        </div>
    );
};

export default CampaignProgress;
