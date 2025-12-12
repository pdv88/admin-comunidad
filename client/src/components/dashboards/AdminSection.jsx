import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const AdminSection = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard.admin.title', 'Administration Center')}</h2>
            
            {/* Quick Management Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/app/users" className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 hover:shadow-md transition flex flex-col items-center text-center">
                    <span className="text-3xl mb-3 block">👥</span>
                    <span className="font-bold text-gray-800 dark:text-white">{t('dashboard.admin.manage_users', 'Users')}</span>
                </Link>
                 <Link to="/app/properties" className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 hover:shadow-md transition flex flex-col items-center text-center">
                    <span className="text-3xl mb-3 block">🏢</span>
                    <span className="font-bold text-gray-800 dark:text-white">{t('dashboard.admin.manage_units', 'Units')}</span>
                </Link>
                 <Link to="/app/notices" className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 hover:shadow-md transition flex flex-col items-center text-center">
                    <span className="text-3xl mb-3 block">📢</span>
                    <span className="font-bold text-gray-800 dark:text-white">{t('dashboard.admin.post_notice', 'Notices')}</span>
                </Link>
                 <Link to="/app/payments" className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 hover:shadow-md transition flex flex-col items-center text-center">
                    <span className="text-3xl mb-3 block">💰</span>
                    <span className="font-bold text-gray-800 dark:text-white">{t('dashboard.admin.finances', 'Finances')}</span>
                </Link>
            </div>
        </div>
    );
};

export default AdminSection;
