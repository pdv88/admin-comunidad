import React from 'react';
import { useTranslation } from 'react-i18next';

const PresidentSection = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard.president.title', 'President\'s Overview')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.president.balance', 'Consolidated Balance')}</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white">€45,200</p>
                    <span className="text-xs text-green-600">▲ 5% vs last year</span>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.president.next_meeting', 'Next Meeting')}</h3>
                    <p className="mt-2 text-xl font-bold text-gray-800 dark:text-white">Oct 15, 2025</p>
                    <span className="text-xs text-gray-500">Annual General Meeting</span>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">{t('dashboard.president.participation', 'Voting Participation')}</h3>
                    <p className="mt-2 text-3xl font-bold text-blue-600">78%</p>
                    <span className="text-xs text-gray-500">Last poll</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                     <h3 className="font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.president.approvals', 'Pending Approvals')}</h3>
                     <div className="space-y-4">
                        <div className="p-4 border border-gray-200 dark:border-neutral-700 rounded-lg">
                            <p className="font-medium text-gray-800 dark:text-white">Budget for Roof Repair</p>
                            <p className="text-sm text-gray-500 mt-1">€2,500 - Provider: RoofMasters Inc.</p>
                            <div className="mt-3 flex gap-2">
                                <button className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">{t('common.approve', 'Approve')}</button>
                                <button className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200">{t('common.reject', 'Reject')}</button>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default PresidentSection;
