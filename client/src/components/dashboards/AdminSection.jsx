import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const AdminSection = () => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard.admin.title', 'Administration Center')}</h2>
            
            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 flex flex-col justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.users', 'Total Users')}</h3>
                        <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">124</p>
                    </div>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 flex flex-col justify-between">
                    <div>
                         <h3 className="text-gray-500 text-xs font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.pending_req', 'Pending Requests')}</h3>
                         <p className="mt-2 text-2xl font-bold text-orange-500">5</p>
                    </div>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 flex flex-col justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.notices', 'Active Notices')}</h3>
                        <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-500">3</p>
                    </div>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 flex flex-col justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-medium uppercase dark:text-neutral-400">{t('dashboard.admin.reservations', 'Reservations Today')}</h3>
                        <p className="mt-2 text-2xl font-bold text-green-600">2</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.admin.pending_actions', 'Pending Actions')}</h3>
                     <div className="space-y-3">
                         <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-red-100 text-red-600 rounded-lg">⚠️</div>
                                 <div>
                                     <p className="text-sm font-medium text-gray-800 dark:text-white">Urgent: Elevator Repair</p>
                                     <p className="text-xs text-gray-500 dark:text-neutral-400">Reported 2 hours ago</p>
                                 </div>
                             </div>
                             <Link to="/app/reports" className="text-sm text-red-600 font-medium hover:underline">{t('common.view', 'View')}</Link>
                         </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">👤</div>
                                 <div className="overflow-hidden">
                                     <p className="text-sm font-medium text-gray-800 dark:text-white">New User Approval</p>
                                     <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">Waitlist: Unit 402</p>
                                 </div>
                             </div>
                             <button className="text-sm text-blue-600 font-medium hover:underline">{t('common.review', 'Review')}</button>
                         </div>
                     </div>
                </div>
                 <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.admin.management', 'Quick Management')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/app/users" className="p-4 border border-gray-200 dark:border-neutral-700 rounded-xl hover:shadow-md transition text-center">
                            <span className="text-2xl mb-2 block">👥</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.admin.manage_users', 'Users')}</span>
                        </Link>
                         <Link to="/app/properties" className="p-4 border border-gray-200 dark:border-neutral-700 rounded-xl hover:shadow-md transition text-center">
                            <span className="text-2xl mb-2 block">🏢</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.admin.manage_units', 'Units')}</span>
                        </Link>
                         <Link to="/app/notices" className="p-4 border border-gray-200 dark:border-neutral-700 rounded-xl hover:shadow-md transition text-center">
                            <span className="text-2xl mb-2 block">📢</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.admin.post_notice', 'Notices')}</span>
                        </Link>
                         <Link to="/app/payments" className="p-4 border border-gray-200 dark:border-neutral-700 rounded-xl hover:shadow-md transition text-center">
                            <span className="text-2xl mb-2 block">💰</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.admin.finances', 'Finances')}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSection;
