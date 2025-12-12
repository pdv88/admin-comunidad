
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';

const RecentNoticesWidget = () => {
    const { t } = useTranslation();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        fetchRecentNotices();
    }, []);

    // Remove the interval based rotation
    /* 
    useEffect(() => {
        if (notices.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % notices.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [notices]);
    */

    const handleAnimationEnd = () => {
        if (notices.length > 1) {
            setCurrentIndex((prev) => (prev + 1) % notices.length);
        }
    };

    const fetchRecentNotices = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/notices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotices(data.slice(0, 5)); 
            }
        } catch (error) {
            console.error("Error fetching notices:", error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityStyles = (priority) => {
        switch(priority) {
            case 'urgent': return 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-200 dark:shadow-none';
            case 'high': return 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-200 dark:shadow-none';
            default: return 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-blue-200 dark:shadow-none';
        }
    };

    if (loading) return <div className="animate-pulse h-12 w-full bg-gray-200 dark:bg-neutral-800 rounded-lg mb-6"></div>;
    if (notices.length === 0) return null;

    const currentNotice = notices[currentIndex];

    // Unique key to force re-render and restart animation when index changes
    const animationKey = `${currentNotice.id}-${currentIndex}`; 

    return (
        <div className={`relative overflow-hidden rounded-lg shadow-lg mb-1 transition-all duration-500 ease-in-out ${getPriorityStyles(currentNotice.priority)}`}>
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white opacity-10 rounded-full blur-xl transform rotate-45"></div>
            <div className="absolute bottom-0 left-0 -mb-2 -ml-2 w-16 h-16 bg-black opacity-10 rounded-full blur-lg"></div>

            <div className="relative flex items-center px-4 py-3 md:px-6 h-14">
                <div className="flex items-center gap-3 shrink-0 z-10 bg-inherit pr-4 shadow-xl shadow-transparent">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    </span>
                    <span className="bg-white/20 backdrop-blur-sm text-xs font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap border border-white/10">
                        {currentNotice.priority === 'urgent' ? 'FLASH' : 'NEWS'}
                    </span>
                </div>

                <div className="flex-1 overflow-hidden relative h-full flex items-center">
                    <div 
                        key={animationKey}
                        className="whitespace-nowrap flex items-center gap-8 absolute animate-marquee"
                        style={{ 
                            transform: 'translateX(100%)', // Ensure it starts off-screen
                            animationIterationCount: notices.length > 1 ? 1 : 'infinite' 
                        }}
                        onAnimationEnd={handleAnimationEnd}
                    >
                        <span className="text-sm font-bold md:text-base text-white">
                            {currentNotice.title}: <span className="font-normal opacity-90">{currentNotice.content}</span>
                        </span>
                    </div>
                </div>
            </div>
             {/* Animation Keyframes */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-150%); } 
                }
                .animate-marquee {
                    animation: marquee 15s linear; /* Default run once, override inline for infinite if needed */
                    will-change: transform;
                }
            `}</style>
        </div>
    );
};

export default RecentNoticesWidget;
