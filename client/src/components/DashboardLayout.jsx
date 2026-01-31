import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logos/habiio_logo_header_nobg.webp';


import CommunitySwitcher from './CommunitySwitcher';

const DashboardLayout = ({ children }) => {
    const { logout, user, activeCommunity, hasAnyRole, getPrimaryRole } = useAuth();
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
            "bg-gradient-to-r from-blue-600/10 to-violet-600/10 text-blue-700 dark:text-blue-300 font-bold backdrop-blur-md shadow-lg border border-blue-200/50 dark:border-blue-500/20 translate-x-1" :
            "text-gray-600 dark:text-neutral-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-300 hover:shadow-md hover:backdrop-blur-sm hover:translate-x-1 transition-all duration-300";
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

    // Get primary role for display
    const primaryRole = getPrimaryRole();

    return (
        <div className="relative flex h-screen bg-slate-300 dark:bg-slate-950 overflow-hidden md:gap-2">
            {/* Static Background */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-pink-100/40 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-4 left-0 z-50 w-64 bg-gradient-to-b from-white/50 to-white/20 backdrop-blur-2xl border border-white/40 dark:from-neutral-900/80 dark:to-neutral-900/40 dark:border-neutral-700/50 shadow-2xl transform transition-transform duration-300 ease-in-out md:ml-4 md:translate-x-0 md:static md:h-[calc(100vh-2rem)] md:my-4 md:rounded-3xl md:inset-auto ${isSidebarOpen ? 'translate-x-0 rounded-r-3xl' : '-translate-x-full'} flex flex-col`}>
                <div className="p-2 flex justify-between md:justify-center items-center h-20 shrink-0">
                    <Link to="/" className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                        <img src={logo} alt="Logo" className="h-16 w-auto drop-shadow-[0_0_1px_rgba(255,255,255,0.8)_0_0_10px_rgba(0,0,0,0.2)]" />
                    </Link>
                    <button onClick={closeSidebar} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-neutral-400" aria-label={t('header.close_sidebar', 'Close Sidebar')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Community Switcher */}
                <CommunitySwitcher />

                {/* Nav Links - Scrollable area */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto customer-scrollbar">
                    <Link to="/app/dashboard" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/dashboard')}`}>
                        {t('dashboard_layout.nav.dashboard')}
                    </Link>
                    <Link to="/app/community-info" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/community-info')}`}>
                        {t('dashboard_layout.nav.community_info', 'Community Info')}
                    </Link>
                    {/* Notices: Residents/Admins only */}
                    {hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal', 'resident']) && (
                        <Link to="/app/notices" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/notices')}`}>
                            {t('dashboard_layout.nav.notices')}
                        </Link>
                    )}
                    {/* Reports: Maintenance + Residents/Admins */}
                    {hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal', 'resident', 'maintenance']) && (
                        <Link to="/app/reports" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/reports')}`}>
                            {t('dashboard_layout.nav.reports')}
                        </Link>
                    )}
                    {/* Voting: Residents/Admins only */}
                    {hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal', 'resident']) && (
                        <Link to="/app/voting" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/voting')}`}>
                            {t('dashboard_layout.nav.voting')}
                        </Link>
                    )}
                    {/* Maintenance Fees: Residents/Admins only */}
                    {hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'treasurer', 'vocal', 'resident']) && (
                        <Link to="/app/maintenance" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/maintenance')}`}>
                            {t('dashboard_layout.nav.maintenance', 'Maintenance Fees')}
                        </Link>
                    )}
                    {/* Campaigns: Residents/Admins only */}
                    {hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'treasurer', 'vocal', 'resident']) && (
                        <Link to="/app/campaigns" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/campaigns')}`}>
                            {t('dashboard_layout.nav.campaigns')}
                        </Link>
                    )}
                    {/* Reservations: All EXCEPT Treasurer */}
                    {hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal', 'resident', 'security', 'maintenance']) && (
                        <Link to="/app/reservations" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/reservations')}`}>
                            {t('dashboard_layout.nav.reservations', 'Reservations')}
                        </Link>
                    )}
                    {/* Visitors: Security + Residents/Admins */}
                    {hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'vocal', 'resident', 'security']) && (
                        <Link to="/app/visitors" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/visitors')}`}>
                            {t('visitors.title', 'Visitors')}
                        </Link>
                    )}
                    {hasAnyRole(['super_admin', 'admin', 'president']) && (
                        <>
                            <div className="pt-2 pb-1">
                                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-neutral-600 to-transparent mb-2 opacity-50"></div>
                                <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider italic">{t('dashboard_layout.nav.administration', 'Administration')}</span>
                            </div>
                            <Link to="/app/properties" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/properties')}`}>
                                {t('dashboard_layout.nav.properties')}
                            </Link>

                            <Link to="/app/users" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/users')}`}>
                                {t('dashboard_layout.nav.users')}
                            </Link>

                            <Link to="/app/community" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/community')}`}>
                                {t('dashboard_layout.nav.community_settings', 'Community Settings')}
                            </Link>
                            <Link to="/app/alerts" onClick={closeSidebar} className={`block py-1.5 px-5 rounded-full transition-all duration-200 ${isActive('/app/alerts')}`}>
                                {t('dashboard_layout.nav.alerts', 'System Alerts')}
                            </Link>
                        </>
                    )}
                </nav>

                {/* Sidebar Footer with Profile & Logout */}
                <div className="p-4 border-t border-white/20 dark:border-neutral-700/50 bg-white/10 dark:bg-black/10 shrink-0 backdrop-blur-sm rounded-b-3xl">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {(user?.profile?.full_name || user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col truncate">
                                <Link to="/app/settings" className="text-sm font-bold text-gray-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                                    {user?.profile?.full_name || user?.user_metadata?.full_name || user?.email}
                                </Link>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                                    {displayRole(primaryRole)}
                                </span>
                            </div>
                        </div>

                        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" title={t('dashboard_layout.sign_out')}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header - Visible only on mobile */}
                {/* Mobile Header - Visible only on mobile */}
                <div className="md:hidden flex items-center justify-between px-4 py-1 bg-white/40 dark:bg-black/20 backdrop-blur-md border-b border-white/20 dark:border-white/5 shrink-0 z-20">
                    {/* Logo Left */}
                    <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 flex items-center gap-2">
                        <img src={logo} alt="Logo" className="h-10 w-auto object-contain drop-shadow-[0_0_1px_rgba(255,255,255,0.8)_0_0_10px_rgba(0,0,0,0.2)]" />

                    </span>

                    {/* Burger Right */}
                    <button
                        className="p-2 -mr-2 text-gray-600 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 rounded-lg transition-colors"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                </div>


                {/* Page Content */}
                <main className="relative flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-3 md:p-4 z-10 w-full h-full">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
