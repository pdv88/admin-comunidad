import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import AdminSection from '../components/dashboards/AdminSection';
import PresidentSection from '../components/dashboards/PresidentSection';
import VocalSection from '../components/dashboards/VocalSection';
import ResidentSection from '../components/dashboards/ResidentSection';
import ActiveCampaignsWidget from '../components/payments/ActiveCampaignsWidget';

const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const role = user?.profile?.roles?.name || 'resident';

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-6 space-y-8"> 
                {/* 1. Global: Active Campaigns */}
                <div>
                     <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                        {t('payments.active_campaigns', 'Active Campaigns')}
                    </h2>
                    <ActiveCampaignsWidget />
                </div>

                {/* 2. Role Specific Sections */}
                {role === 'admin' && <AdminSection />}
                {role === 'president' && <PresidentSection />}
                {(role === 'vocal' || role === 'secretary' || role === 'treasurer') && <VocalSection />}

                {/* 3. Base Resident Section (Everyone gets this) */}
                <hr className="border-gray-200 dark:border-neutral-700" />
                <ResidentSection />
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
