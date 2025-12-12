import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const ResidentSection = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mt-8">{t('dashboard.resident.title', 'My Home')}</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                     </div>
                  </div>
            </div>
        </div>
    );
};

export default ResidentSection;
