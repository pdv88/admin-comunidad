import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const DashboardLayout = ({ children }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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
            "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium" : 
            "text-gray-600 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-700";
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-neutral-900">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 hidden md:block">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Admin Comunidad</h1>
                </div>
                <nav className="mt-4 px-2">
                    <Link to="/app/dashboard" className={`block py-2 px-4 rounded-lg mt-1 ${isActive('/app/dashboard')}`}>Dashboard</Link>
                    <Link to="/app/notices" className={`block py-2 px-4 rounded-lg mt-1 ${isActive('/app/notices')}`}>Notices</Link>
                    <Link to="/app/reports" className={`block py-2 px-4 rounded-lg mt-1 ${isActive('/app/reports')}`}>Reports</Link>
                    <Link to="/app/voting" className={`block py-2 px-4 rounded-lg mt-1 ${isActive('/app/voting')}`}>Voting</Link>
                    <Link to="/app/properties" className={`block py-2 px-4 rounded-lg mt-1 ${isActive('/app/properties')}`}>Properties</Link>
                    <Link to="/app/users" className={`block py-2 px-4 rounded-lg mt-1 ${isActive('/app/users')}`}>Users</Link>
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
                                {user?.user_metadata?.full_name || user?.email} ({user?.profile?.roles?.name || 'User'})
                             </div>
                             <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                                Sign out
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
