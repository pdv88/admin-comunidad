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
        <div className="w-full mb-4">
            <div className="flex justify-between text-xs mb-1">
                 <span className="font-semibold text-blue-600 dark:text-blue-400">{percentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 shadow-md shadow-blue-500/20" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default CampaignProgress;
