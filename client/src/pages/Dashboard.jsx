import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import ActiveCampaignsWidget from '../components/payments/ActiveCampaignsWidget';
import ActivePollsWidget from '../components/voting/ActivePollsWidget';
import RecentNoticesWidget from '../components/notices/RecentNoticesWidget';
import RecentReportsWidget from '../components/reports/RecentReportsWidget';
import WelcomeWidget from '../components/dashboards/WelcomeWidget';
import BilledVsCollectedChart from '../components/dashboards/widgets/BilledVsCollectedChart';
import DashboardSkeleton from './DashboardSkeleton';
import { useState, useEffect } from 'react';

const Dashboard = () => {
    const { user, activeCommunity, hasAnyRole, getPrimaryRole } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading check or data pre-fetch
        // Extended to 2000ms to allow widgets to start fetching, ensuring their skeletons are ready if global skeleton unmounts
        const timer = setTimeout(() => setLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <DashboardSkeleton />;
    }

    // Get primary role for display (highest in hierarchy)
    const role = getPrimaryRole();



    // Common glass card style
    // Common glass card style
    const cardClass = "glass-card p-4 md:p-6 flex flex-col h-full";
    // For lists that need internal scrolling
    const scrollableCardClass = `${cardClass} overflow-hidden`;

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-full md:h-full gap-2">
                {/* 0. Notices Bar (Full Width) */}
                <div className="w-full shrink-0">
                    <RecentNoticesWidget />
                </div>

                {/* 1. Welcome Section (Auto Height) */}
                <div className="w-full shrink-0">
                    <WelcomeWidget role={role} />
                </div>

                {/* Financial Overview Chart (Financial roles) */}
                {hasAnyRole(['super_admin', 'admin', 'president', 'treasurer']) && (
                    <div className="w-full shrink-0 h-96">
                        <BilledVsCollectedChart className="h-full" />
                    </div>
                )}



                {/* 3. Action Center & Reports (Fills remaining space on desktop, stacks on mobile) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full md:flex-1 md:min-h-0">

                    {/* Polls */}
                    <div className="col-span-1 h-96 md:h-full md:min-h-0">
                        <ActivePollsWidget className={scrollableCardClass} />
                    </div>

                    {/* Campaigns */}
                    <div className="col-span-1 h-96 md:h-full md:min-h-0">
                        <ActiveCampaignsWidget className={scrollableCardClass} />
                    </div>

                    {/* Reports */}
                    <div className="col-span-1 h-96 md:h-full md:min-h-0">
                        <RecentReportsWidget className={scrollableCardClass} />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
