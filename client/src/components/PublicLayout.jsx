import React from 'react';
import { Outlet } from 'react-router-dom';
import AnimatedBackground from '../assets/components/AnimatedBackground';

const PublicLayout = () => {
    return (
        <div className="relative min-h-screen bg-slate-300 dark:bg-slate-950 selection:bg-indigo-500 selection:text-white">
            <AnimatedBackground />
            <div className="relative z-10">
                <Outlet />
            </div>
        </div>
    );
};

export default PublicLayout;
