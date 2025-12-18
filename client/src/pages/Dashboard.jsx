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

const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const role = user?.profile?.roles?.name || 'resident';
    // Determine if the user has a role that displays a top-right section
    // Temporarily exclude 'president' etc until they have content, to avoid gaps
    const hasRoleSection = ['admin'].includes(role);

    // Common glass card style
    const cardClass = "bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 dark:border-neutral-700/30 rounded-2xl shadow-lg shadow-gray-200/20 dark:shadow-black/20 p-6 flex flex-col h-full";
    // For lists that need internal scrolling
    const scrollableCardClass = `${cardClass} overflow-hidden`;

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-4">
                {/* 0. Notices Bar (Full Width) */}
                <div className="w-full shrink-0">
                    <RecentNoticesWidget />
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 flex-1 min-h-0 w-full"> 
                    
                    {/* 1. Welcome Section (Full Width) */}
                    <div className="md:col-span-12 md:row-span-2 md:h-full">
                        <WelcomeWidget role={role} />
                    </div>

                     {/* 2. Role Sections (If applicable, Full Width or Grid?) */}
                     {hasRoleSection && (
                        <div className="md:col-span-12 md:row-span-2 md:overflow-y-auto">
                            {role === 'admin' && <AdminSection className={cardClass} />}
                            {/* Other roles hidden for now to prevent empty boxes */}
                        </div>
                     )}

                    {/* 3, 4, 5. Bottom Row Widgets */}
                    {/* Adjust row spans to fill remaining space. 
                        If Welcome uses 2 rows, and we have 6 total...
                        Residents: 6 - 2 = 4 rows left.
                        Polls (4), Campaigns (4), Reports (4). Perfect.
                        
                        Admins: Welcome (2) + AdminSection (2) = 4 used.
                        2 rows left? That's tight for lists.
                        Maybe we increase total rows or grid height for admins?
                        Or AdminSection shares row with Welcome? No, Welcome is full width.
                        
                        Let's auto-flow the height for admins (min-h-0 might cutoff).
                        I'll stick to row-span-4 for residents.
                    */}
                    
                    {/* Polls */}
                    <ActivePollsWidget className={`${scrollableCardClass} md:col-span-4 ${hasRoleSection ? 'md:row-span-2' : 'md:row-span-4'}`} />

                    {/* Campaigns */}
                    <ActiveCampaignsWidget className={`${scrollableCardClass} md:col-span-4 ${hasRoleSection ? 'md:row-span-2' : 'md:row-span-4'}`} />

                    {/* Reports */}
                    <div className={`${scrollableCardClass} md:col-span-4 ${hasRoleSection ? 'md:row-span-2' : 'md:row-span-4'}`}>
                         <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                             <span className="text-orange-500">🔧</span>
                             Reports
                         </h2>
                         <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            <RecentReportsWidget />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
