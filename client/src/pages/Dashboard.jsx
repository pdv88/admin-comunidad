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
                {/* Welcome Section */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        {t('dashboard.welcome', 'Welcome')}, {user?.profile?.full_name || user?.user_metadata?.full_name || user?.email}!
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-neutral-400">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="font-medium">{t('dashboard.role', 'Role')}:</span> 
                            <span className="capitalize">{user?.profile?.roles?.name || t('common.user', 'User')}</span>
                        </div>
                        {user?.profile?.unit_owners && user.profile.unit_owners.length > 0 && (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                <span className="font-medium">{t('dashboard.unit', 'Units')}:</span>
                                <span>
                                    {user.profile.unit_owners.map(uo => 
                                        `${uo.units?.unit_number}${uo.units?.blocks ? ` (${uo.units.blocks.name})` : ''}`
                                    ).join(', ')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

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
