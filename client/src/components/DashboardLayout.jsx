import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const DashboardLayout = ({ children }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to logout", error);
        }
    };

    const isActive = (path) => {
        return location.pathname === path ? 
            "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 font-medium" : 
            "text-gray-600 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-700";
    };

    // Helper to translate roles if needed, or just display them capitalised
    const displayRole = (role) => {
        if (!role) return 'User';
        // Check if role exists in translation
        const key = `user_management.roles.${role}`;
        const translated = t(key);
        // If translation returns key, fall back to capitalized role
        return translated !== key ? translated : role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-neutral-900">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 hidden md:block">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard_layout.brand')}</h1>
                </div>
                <nav className="mt-4 px-2 space-y-1">
                    <Link to="/app/dashboard" className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/dashboard')}`}>
                        {t('dashboard_layout.nav.dashboard')}
                    </Link>
                    <Link to="/app/notices" className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/notices')}`}>
                         {t('dashboard_layout.nav.notices')}
                    </Link>
                    <Link to="/app/reports" className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/reports')}`}>
                         {t('dashboard_layout.nav.reports')}
                    </Link>
                    <Link to="/app/voting" className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/voting')}`}>
                         {t('dashboard_layout.nav.voting')}
                    </Link>
                    <Link to="/app/properties" className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/properties')}`}>
                         {t('dashboard_layout.nav.properties')}
                    </Link>
                    <Link to="/app/users" className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/users')}`}>
                         {t('dashboard_layout.nav.users')}
                    </Link>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 dark:bg-neutral-800 dark:border-neutral-700">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center md:hidden">
                            <button className="text-gray-500 hover:text-gray-600 dark:text-neutral-400">
                                <span className="sr-only">Open sidebar</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-end w-full gap-4">
                             <div className="text-sm text-gray-700 dark:text-neutral-300">
                                {user?.user_metadata?.full_name || user?.email} ({displayRole(user?.profile?.roles?.name)})
                             </div>
                             <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 transition-colors">
                                {t('dashboard_layout.sign_out')}
                             </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-neutral-900 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
