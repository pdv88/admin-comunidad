
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';

const RecentNoticesWidget = () => {
    const { t } = useTranslation();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchRecentNotices();
    }, []);

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

    if (loading) return <div className="animate-pulse h-12 w-full bg-gray-200 dark:bg-neutral-800 rounded-lg mb-6"></div>;
    if (notices.length === 0) return null;
    
    // Duplicate notices to create a seamless loop effect
    const tickerItems = [...notices, ...notices]; 

    return (
        <div className="relative overflow-hidden rounded-lg shadow-lg mb-1 transition-all duration-500 ease-in-out bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-900 dark:to-blue-900">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white opacity-10 rounded-full blur-xl transform rotate-45"></div>
            <div className="absolute bottom-0 left-0 -mb-2 -ml-2 w-16 h-16 bg-black opacity-10 rounded-full blur-lg"></div>

            <div className="relative flex items-center px-4 py-3 md:px-6 h-14">
                {/* Static Icon Badge */}
                <div className="flex items-center gap-3 shrink-0 z-10 bg-inherit pr-4 shadow-xl shadow-transparent">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    </span>
                    <span className="bg-white/20 backdrop-blur-sm text-xs font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap border border-white/10 text-white">
                        {t('notices.latest', 'Latest')}
                    </span>
                </div>

                {/* Marquee Container */}
                <div className="flex-1 overflow-hidden relative h-full flex items-center mask-image-linear-gradient">
                     <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
                        {tickerItems.map((notice, idx) => (
                            <div key={`${notice.id}-${idx}`} className="flex items-center gap-3 text-white">
                                {notice.priority === 'urgent' && (
                                     <span className="bg-red-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        FLASH
                                    </span>
                                )}
                                <span className="text-sm font-bold md:text-base">
                                    {notice.title}:
                                </span>
                                <span className="text-sm md:text-base font-normal opacity-90">
                                    {notice.content}
                                </span>
                                {/* Separator */}
                                <span className="text-white/40 mx-2">•</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

             {/* Animation Keyframes */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); } 
                }
                .animate-marquee {
                    animation: marquee ${notices.length * 10}s linear infinite;
                    will-change: transform;
                }
                /* Add a mask to fade out the edges of the text area if supported */
                .mask-image-linear-gradient {
                     mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
                }
            `}</style>
        </div>
    );
};

export default RecentNoticesWidget;
