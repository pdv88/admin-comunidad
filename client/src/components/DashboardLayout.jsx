import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const DashboardLayout = ({ children }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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

    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-neutral-900">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">{t('dashboard_layout.brand')}</h1>
                    <button onClick={closeSidebar} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-neutral-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <nav className="mt-4 px-2 space-y-1">
                    <Link to="/app/dashboard" onClick={closeSidebar} className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/dashboard')}`}>
                        {t('dashboard_layout.nav.dashboard')}
                    </Link>
                    <Link to="/app/notices" onClick={closeSidebar} className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/notices')}`}>
                         {t('dashboard_layout.nav.notices')}
                    </Link>
                    <Link to="/app/reports" onClick={closeSidebar} className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/reports')}`}>
                         {t('dashboard_layout.nav.reports')}
                    </Link>
                    <Link to="/app/voting" onClick={closeSidebar} className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/voting')}`}>
                         {t('dashboard_layout.nav.voting')}
                    </Link>
                    <Link to="/app/properties" onClick={closeSidebar} className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/properties')}`}>
                         {t('dashboard_layout.nav.properties')}
                    </Link>
                    <Link to="/app/users" onClick={closeSidebar} className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/app/users')}`}>
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
                            <button 
                                className="text-gray-500 hover:text-gray-600 dark:text-neutral-400"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <span className="sr-only">Open sidebar</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-end w-full gap-4">
                             <Link to="/app/settings" className="text-sm text-gray-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                {user?.user_metadata?.full_name || user?.email} ({displayRole(user?.profile?.roles?.name)})
                             </Link>
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
