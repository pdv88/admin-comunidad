import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import ActiveCampaignsWidget from '../payments/ActiveCampaignsWidget';
import BilledVsCollectedChart from './widgets/BilledVsCollectedChart';

const AdminDashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard.admin.title', 'Admin Overview')}</h2>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.revenue', 'Revenue')}</h3>
                    <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-500">€12,450</p>
                    <span className="text-xs text-gray-500">{t('dashboard.admin.monthly', 'This month')}</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.expenses', 'Expenses')}</h3>
                    <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-500">€4,200</p>
                    <span className="text-xs text-gray-500">{t('dashboard.admin.monthly', 'This month')}</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.delinquency', 'Delinquency')}</h3>
                    <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-500">5.2%</p>
                    <span className="text-xs text-gray-500">{t('dashboard.admin.active_cases', '3 active cases')}</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.tickets', 'Open Tickets')}</h3>
                    <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-500">8</p>
                    <span className="text-xs text-gray-500">{t('dashboard.admin.urgent', '2 urgent')}</span>
                </div>
            </div>

            {/* Financial Overview Graph */}
            <div className="w-full">
                <BilledVsCollectedChart className="h-96" />
            </div>

            {/* Quick Actions / Sections */}
            {/* Active Campaigns */}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 mt-8">
                {t('payments.active_campaigns', 'Active Campaigns')}
            </h2>
            <div className="mb-8">
                <ActiveCampaignsWidget />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.admin.pending_actions', 'Pending Actions')}</h3>
                    <ul className="space-y-3">
                        <li className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                            <span className="text-sm text-gray-800 dark:text-white">Review new resident registration</span>
                            <Link to="/app/users" className="text-sm text-blue-600 hover:underline">{t('common.review', 'Review')}</Link>
                        </li>
                        <li className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                            <span className="text-sm text-gray-800 dark:text-white">Approve amenities booking</span>
                            <button className="text-sm text-blue-600 hover:underline">{t('common.review', 'Review')}</button>
                        </li>
                    </ul>
                </div>
                
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.admin.recent_activity', 'Recent Activity')}</h3>
                    <ul className="space-y-4">
                        <li className="text-sm text-gray-600 dark:text-neutral-400">
                            <span className="font-bold text-gray-800 dark:text-white">Maintenance</span> completed in Block A.
                        </li>
                        <li className="text-sm text-gray-600 dark:text-neutral-400">
                            <span className="font-bold text-gray-800 dark:text-white">Notice</span> sent regarding pool closure.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
