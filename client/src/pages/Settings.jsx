import React from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const [fullName, setFullName] = React.useState(user?.user_metadata?.full_name || '');
  const [loading, setLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  // Community Settings State
  const [commName, setCommName] = React.useState('');
  const [commAddress, setCommAddress] = React.useState('');
  const [commLoading, setCommLoading] = React.useState(false);
  const [commSuccess, setCommSuccess] = React.useState('');
  const [commError, setCommError] = React.useState('');

  React.useEffect(() => {
    if (user?.profile?.roles?.name === 'admin') {
        const fetchCommunity = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/communities/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCommName(data.name || '');
                    setCommAddress(data.address || '');
                }
            } catch (error) {
                console.error("Failed to fetch community", error);
            }
        };
        fetchCommunity();
    }
  }, [user]);

  const handleUpdateCommunity = async () => {
    setCommLoading(true);
    setCommSuccess('');
    setCommError('');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/communities/my`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: commName, address: commAddress })
        });
        
        if (!response.ok) throw new Error('Failed to update');
        
        setCommSuccess(t('settings.update_success', 'Updated successfully'));
    } catch (error) {
        setCommError(t('common.error_occurred'));
    } finally {
        setCommLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
        await updateProfile({ full_name: fullName });
        setSuccessMsg(t('settings.update_success', 'Profile updated successfully'));
    } catch (error) {
        setErrorMsg('Failed to update profile');
    } finally {
        setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="glass-card p-4 sm:p-7">
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
                <label htmlFor="fullName" className="block text-sm font-medium mb-2 dark:text-gray-300">{t('settings.fullname', 'Full Name')}</label>
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        id="fullName"
                        className="glass-input" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                    <button 
                        onClick={handleUpdateProfile}
                        disabled={loading}
                        className="glass-button whitespace-nowrap"
                    >
                        {loading ? '...' : t('settings.save', 'Save')}
                    </button>
                </div>
                {successMsg && <p className="text-sm text-green-600 mt-2">{successMsg}</p>}
                {errorMsg && <p className="text-sm text-red-600 mt-2">{errorMsg}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('settings.email', 'Email Address')}</label>
                <div className="py-2.5 px-4 block w-full bg-gray-50/50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700/50 rounded-full text-sm dark:text-neutral-400">
                  {user?.email || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('settings.role', 'Role')}</label>
                 <div className="py-2.5 px-4 block w-full bg-gray-50/50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700/50 rounded-full text-sm dark:text-neutral-400 capitalize">
                  {user?.profile?.roles?.name || 'User'}
                </div>
              </div>

              {/* Preferences Section */}
              <div className="pt-6 border-t border-gray-200 dark:border-neutral-700">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('settings.preferences.title', 'Preferences')}</h2>
                  <div>
                      <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('settings.preferences.language', 'Language')}</label>
                      <select
                          className="glass-input"
                          value={i18n.language}
                          onChange={(e) => i18n.changeLanguage(e.target.value)}
                      >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                      </select>
                  </div>
              </div>

              {/* Admin Only Section */}
              {user?.profile?.roles?.name === 'admin' && (
                  <>
                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-neutral-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('settings.community_settings', 'Community Settings')}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('community_settings.name', 'Community Name')}</label>
                            <input 
                                type="text"
                                className="glass-input"
                                value={commName}
                                onChange={(e) => setCommName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('community_settings.address', 'Address')}</label>
                            <input 
                                type="text"
                                className="glass-input"
                                value={commAddress}
                                onChange={(e) => setCommAddress(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleUpdateCommunity}
                            disabled={commLoading}
                            className="glass-button"
                        >
                            {commLoading ? '...' : t('settings.save', 'Save Changes')}
                        </button>
                        {commSuccess && <p className="text-sm text-green-600">{commSuccess}</p>}
                        {commError && <p className="text-sm text-red-600">{commError}</p>}
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-neutral-700">
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('settings.subscription.title', 'Subscription & Payment')}</h2>
                      <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                          <div className="flex justify-between items-center mb-4">
                              <div>
                                  <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">{t('settings.subscription.plan', 'Current Plan')}</p>
                                  <p className="text-lg font-bold text-gray-800 dark:text-white">Pro Plan</p>
                              </div>
                              <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500">
                                {t('settings.subscription.active', 'Active')}
                              </span>
                          </div>
                          <div className="space-y-2">
                              <p className="text-sm text-gray-600 dark:text-neutral-400">{t('settings.subscription.next_billing', 'Next billing date')}: <span className="font-semibold text-gray-800 dark:text-white">August 15, 2025</span></p>
                              <button className="glass-button-secondary">
                                  {t('settings.subscription.manage', 'Manage Subscription')}
                              </button>
                          </div>
                      </div>
                  </div>

                  </>
              )}

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
