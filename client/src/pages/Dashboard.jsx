import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import AdminSection from '../components/dashboards/AdminSection';
import PresidentSection from '../components/dashboards/PresidentSection';
import VocalSection from '../components/dashboards/VocalSection';
import ResidentSection from '../components/dashboards/ResidentSection';
import ActiveCampaignsWidget from '../components/payments/ActiveCampaignsWidget';
import ActivePollsWidget from '../components/voting/ActivePollsWidget';
import RecentNoticesWidget from '../components/notices/RecentNoticesWidget';
import RecentReportsWidget from '../components/reports/RecentReportsWidget';
import WelcomeWidget from '../components/dashboards/WelcomeWidget';
import DashboardSkeleton from './DashboardSkeleton';
import { useState, useEffect } from 'react';

const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading check or data pre-fetch
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <DashboardSkeleton />;
    }
    const role = user?.profile?.roles?.name || 'resident';
    // Determine if the user has a role that displays a top-right section
    // Temporarily exclude 'president' etc until they have content, to avoid gaps
    const hasRoleSection = ['admin'].includes(role);

    // Common glass card style
    // Common glass card style
    const cardClass = "glass-card p-6 flex flex-col h-full";
    // For lists that need internal scrolling
    const scrollableCardClass = `${cardClass} overflow-hidden`;

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-4">
                {/* 0. Notices Bar (Full Width) */}
                <div className="w-full shrink-0">
                    <RecentNoticesWidget />
                </div>

                {/* 1. Welcome Section (Auto Height) */}
                <div className="w-full shrink-0">
                    <WelcomeWidget role={role} />
                </div>

                 {/* 2. Role Sections (Auto Height) */}
                 {hasRoleSection && (
                    <div className="w-full shrink-0">
                        {role === 'admin' && <AdminSection className={cardClass} />}
                        {/* Other roles hidden for now */}
                    </div>
                 )}

                {/* 3. Action Center & Reports (Fills remaining space) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 w-full"> 
                    
                    {/* Polls */}
                    <div className="col-span-1 h-full min-h-0">
                       <ActivePollsWidget className={scrollableCardClass} />
                    </div>

                    {/* Campaigns */}
                    <div className="col-span-1 h-full min-h-0">
                        <ActiveCampaignsWidget className={scrollableCardClass} />
                    </div>

                    {/* Reports */}
                    <div className="col-span-1 h-full min-h-0">
                        <RecentReportsWidget className={scrollableCardClass} />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
