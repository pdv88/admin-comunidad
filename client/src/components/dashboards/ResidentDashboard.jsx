import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import ActiveCampaignsWidget from '../payments/ActiveCampaignsWidget';
import RecentNoticesWidget from '../notices/RecentNoticesWidget';

const ResidentDashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard.resident.title', 'My Home')}</h2>
            
            <div className="mb-6">
                <ActiveCampaignsWidget />
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.resident.balance', 'My Balance')}</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white">€0.00</p>
                    <span className="text-xs text-green-600">{t('dashboard.resident.up_to_date', 'Up to date')}</span>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.resident.next_payment', 'Next Payment')}</h3>
                    <p className="mt-2 text-xl font-bold text-gray-800 dark:text-white">€85.00</p>
                    <span className="text-xs text-gray-500">{t('dashboard.resident.due_date', 'Due: Oct 01')}</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.resident.my_incidents', 'My Incidents')}</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white">1</p>
                    <span className="text-xs text-orange-500">{t('dashboard.resident.in_progress', 'In progress')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-full">
                     <RecentNoticesWidget />
                  </div>

                   <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                     <h3 className="font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.resident.quick_links', 'Quick Links')}</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <Link to="/app/reports" className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl dark:bg-neutral-700 dark:hover:bg-neutral-600 transition">
                             <span className="text-2xl mb-2">🛠️</span>
                             <span className="text-sm font-medium dark:text-white">{t('dashboard.resident.report_issue', 'Report Issue')}</span>
                        </Link>
                         <Link to="/app/voting" className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl dark:bg-neutral-700 dark:hover:bg-neutral-600 transition">
                             <span className="text-2xl mb-2">🗳️</span>
                             <span className="text-sm font-medium dark:text-white">{t('dashboard.resident.vote', 'Vote')}</span>
                        </Link>
                         <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl dark:bg-neutral-700 dark:hover:bg-neutral-600 transition">
                             <span className="text-2xl mb-2">📅</span>
                             <span className="text-sm font-medium dark:text-white">{t('dashboard.resident.reserve', 'Reserve Area')}</span>
                        </button>
                         <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl dark:bg-neutral-700 dark:hover:bg-neutral-600 transition">
                             <span className="text-2xl mb-2">📖</span>
                             <span className="text-sm font-medium dark:text-white">{t('dashboard.resident.directory', 'Directory')}</span>
                        </button>
                     </div>
                  </div>
            </div>
        </div>
    );
};

export default ResidentDashboard;
