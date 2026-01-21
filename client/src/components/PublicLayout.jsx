import React from 'react';
import { Outlet } from 'react-router-dom';


const PublicLayout = () => {
    return (
        <div className="relative min-h-screen bg-slate-300 dark:bg-slate-950 selection:bg-indigo-500 selection:text-white">
            <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-pink-100/40 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10" />
            <div className="relative z-10">
                <Outlet />
            </div>
        </div>
    );
};

export default PublicLayout;
