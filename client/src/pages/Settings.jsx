import React from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';

const Settings = () => {
    const { user, updateProfile, logout, hasAnyRole, activeCommunity } = useAuth();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [fullName, setFullName] = React.useState(user?.user_metadata?.full_name || '');
    const [phone, setPhone] = React.useState(user?.profile?.phone || user?.phone || '');
    const [loading, setLoading] = React.useState(false);
    const [deleteLoading, setDeleteLoading] = React.useState(false);
    const [toast, setToast] = React.useState({ message: '', type: 'success' });
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            await updateProfile({ full_name: fullName, phone: phone });
            setToast({ message: t('settings.update_success', 'Profile updated successfully'), type: 'success' });
        } catch (error) {
            setToast({ message: t('settings.update_error', 'Failed to update profile'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users/${user.id}/account`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete account');
            }

            // Logout and redirect
            await logout();
            navigate('/login');

        } catch (error) {
            console.error("Delete account error:", error);
            setToast({ message: t('settings.danger_zone.delete_error', 'Error deleting account: ') + error.message, type: 'error' });
        }
    };

    return (
        <DashboardLayout>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
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
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium mb-2 mt-4 dark:text-gray-300">{t('settings.profile.phone', 'Phone Number')}</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        className="glass-input w-full"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={loading}
                                        className="glass-button whitespace-nowrap min-w-[100px] flex justify-center items-center"
                                    >
                                        {loading ? (
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : t('settings.save', 'Save')}
                                    </button>
                                </div>
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
                                    {activeCommunity?.roles?.map(r => r.name).join(', ') || 'User'}
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
                                        <option value="en">English (US)</option>
                                        <option value="es-MX">Español (México) 🇲🇽</option>
                                        <option value="es-ES">Español (España) 🇪🇸</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-200 dark:border-neutral-700">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('settings.security.title', 'Change Password')}</h2>
                                <SecuritySection t={t} setToast={setToast} />
                            </div>

                            {/* Admin Only Section */}
                            {hasAnyRole(['super_admin']) && (
                                <>
                                    {/* Subscription Plans Placeholder */}
                                    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-neutral-700">
                                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('settings.plans.title', 'Available Plans')}</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Free Plan */}
                                            <div className="glass-card p-6 border border-gray-200 dark:border-neutral-700 opacity-60">
                                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Basic</h3>
                                                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">$0 <span className="text-base font-medium text-gray-500">/mo</span></p>
                                                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-neutral-400">
                                                    <li>• Basic Community Management</li>
                                                    <li>• Limited Residents</li>
                                                </ul>
                                            </div>
                                            {/* Pro Plan (Active) */}
                                            <div className="glass-card p-6 border-2 border-blue-500 relative transform scale-105 shadow-xl">
                                                <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">CURRENT</span>
                                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Pro</h3>
                                                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">$29 <span className="text-base font-medium text-gray-500">/mo</span></p>
                                                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-neutral-400">
                                                    <li>• Unlimited Residents</li>
                                                    <li>• Advanced Analytics</li>
                                                    <li>• Priority Support</li>
                                                </ul>
                                            </div>
                                            {/* Enterprise Plan */}
                                            <div className="glass-card p-6 border border-gray-200 dark:border-neutral-700 opacity-60">
                                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Enterprise</h3>
                                                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">Custom</p>
                                                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-neutral-400">
                                                    <li>• Dedicated Manager</li>
                                                    <li>• Custom Integrations</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    {user?.user_metadata?.is_admin_registration === true && (
                                        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-neutral-700">
                                            <h2 className="text-lg font-bold text-red-600 mb-4">{t('settings.danger_zone.title', 'Danger Zone')}</h2>
                                            <div className="backdrop-blur-md bg-red-50/30 dark:bg-red-900/10 border border-red-200/50 dark:border-red-500/30 rounded-xl p-6 shadow-sm">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-red-800 dark:text-red-400">{t('settings.danger_zone.delete_account', 'Delete Account')}</p>
                                                        <p className="text-xs text-red-600/80 dark:text-red-500/70 mt-1">
                                                            {t('settings.danger_zone.warning_text', 'Once you delete your account, there is no going back. Please be certain.')}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowDeleteModal(true)}
                                                        className="glass-button-danger"
                                                    >
                                                        {t('settings.danger_zone.delete_btn', 'Delete Account')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                        </div>
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title={t('settings.danger_zone.delete_account', 'Delete Account')}
                message={t('settings.danger_zone.delete_warning_modal', 'This action cannot be undone. This will permanently delete your account and all associated data.')}
                confirmText={t('settings.danger_zone.delete_btn', 'Delete Account')}
                isDangerous={true}
                inputConfirmation="DELETE"
                isLoading={deleteLoading}
            />
        </DashboardLayout >
    );
};

const SecuritySection = ({ t, setToast }) => {
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setToast({ message: t('settings.security.error_empty', 'Please fill in all fields'), type: 'error' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setToast({ message: t('settings.security.error_match', 'Passwords do not match'), type: 'error' });
            return;
        }
        if (newPassword.length < 6) {
            setToast({ message: t('settings.security.error_length', 'Password must be at least 6 characters'), type: 'error' });
            return;
        }
        if (currentPassword === newPassword) {
            setToast({ message: t('settings.security.error_same', 'New password must be different from current password'), type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/auth/update-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    password: newPassword
                })
            });

            if (res.ok) {
                setToast({ message: t('settings.security.success', 'Password updated successfully'), type: 'success' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update password');
            }
        } catch (error) {
            console.error(error);
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 max-w-md">
            <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('settings.security.current_password', 'Current Password')}</label>
                <input
                    type="password"
                    className="glass-input w-full"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('settings.security.new_password', 'New Password')}</label>
                <input
                    type="password"
                    className="glass-input w-full"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('settings.security.confirm_password', 'Confirm New Password')}</label>
                <input
                    type="password"
                    className="glass-input w-full"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                />
            </div>
            <div className="pt-2">
                <button
                    onClick={handleChangePassword}
                    disabled={loading || !newPassword}
                    className="glass-button-secondary py-2 px-4 text-xs w-auto"
                >
                    {t('settings.security.btn_change', 'Update Password')}
                </button>
            </div>
        </div>

    );
};

export default Settings;
