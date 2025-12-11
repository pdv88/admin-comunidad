import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const VocalSection = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard.vocal.title', 'Vocal\'s Overview')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.vocal.active_polls', 'Active Polls')}</h3>
                    <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-500">2</p>
                    <Link to="/app/voting" className="text-sm text-blue-600 hover:underline mt-2 inline-block">{t('common.view_all', 'View All')}</Link>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.vocal.recent_minutes', 'Recent Minutes')}</h3>
                    <p className="mt-2 text-lg font-bold text-gray-800 dark:text-white">Sept 2025 Meeting</p>
                    <span className="text-xs text-gray-500">{t('common.download', 'Download PDF')}</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.vocal.agreements', 'Agreements Status')}</h3>
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 dark:bg-gray-700">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 inline-block">60% Completed</span>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                 <h3 className="font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.vocal.observations', 'Observations & Comments')}</h3>
                 <div className="space-y-4">
                     <div className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                        <p className="text-sm font-medium dark:text-white">Re: Garden maintenance contract</p>
                        <p className="text-sm text-gray-600 dark:text-neutral-300 mt-1">"We should consider getting a third quote before deciding."</p>
                        <p className="text-xs text-gray-400 mt-2">Posted 2 days ago</p>
                     </div>
                 </div>
                 <button className="mt-4 text-sm text-blue-600 font-medium hover:underline">{t('common.add_comment', 'Add Observation')}</button>
            </div>
        </div>
    );
};

export default VocalSection;
