import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';
import CampaignProgress from './CampaignProgress';

const ActiveCampaignsWidget = () => {
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
        <div className="space-y-6">
            {campaigns.map(campaign => (
                <CampaignProgress key={campaign.id} campaign={campaign} />
            ))}
        </div>
    );
};

export default ActiveCampaignsWidget;
