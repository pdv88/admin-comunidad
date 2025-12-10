import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Settings = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
        <div className="p-4 sm:p-7">
          <div className="text-center mb-6">
            <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">
              {t('settings.title', 'Account Settings')}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {t('settings.subtitle', 'Manage your account profile and preferences.')}
            </p>
          </div>

          <div className="mt-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">{t('settings.fullname', 'Full Name')}</label>
                <div className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
                  {user?.user_metadata?.full_name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">{t('settings.email', 'Email Address')}</label>
                <div className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
                  {user?.email || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">{t('settings.role', 'Role')}</label>
                 <div className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400">
                  {user?.profile?.roles?.name || 'User'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
