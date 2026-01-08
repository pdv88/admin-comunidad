
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { API_URL } from '../../config';

const RecentNoticesWidget = () => {
    const { t } = useTranslation();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const abortController = new AbortController();
        
        const fetchRecentNotices = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/notices`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: abortController.signal
                });
                if (res.ok) {
                    const data = await res.json();
                    setNotices(data.slice(0, 5)); 
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Error fetching notices:", error);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        
        fetchRecentNotices();
        
        return () => abortController.abort();
    }, []);

    if (loading) return <div className="animate-pulse h-12 w-full bg-gray-200 dark:bg-neutral-800 rounded-lg mb-6"></div>;
    if (notices.length === 0) return null;
    
    // Duplicate notices to create a seamless loop effect
    const tickerItems = [...notices, ...notices]; 

    return (
        <div className="relative overflow-hidden mb-1 transition-all duration-500 ease-in-out border border-white/20 dark:border-white/10 shadow-sm hover:shadow-lg rounded-2xl backdrop-blur-md bg-white/40 dark:bg-white/5">
            <div className="relative flex items-center px-4 py-3 md:px-6 h-14">
                {/* Static Icon Badge */}
                <div className="flex items-center gap-3 shrink-0 z-10 pr-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    </span>
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-500/10 text-blue-800 dark:text-blue-200 border border-blue-500/10">
                        {t('notices.latest', 'Latest')}
                    </span>
                </div>

                {/* Marquee Container */}
                <div className="flex-1 overflow-hidden relative h-full flex items-center mask-image-linear-gradient">
                     <div className="flex animate-marquee whitespace-nowrap">
                        {[...Array(10)].map((_, iteration) => (
                            <div key={iteration} className="flex items-center gap-8 pr-8 shrink-0">
                                {notices.map((notice, idx) => (
                                    <div key={`${iteration}-${notice.id}-${idx}`} className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
                                        {notice.priority === 'urgent' && (
                                            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                                                FLASH
                                            </span>
                                        )}
                                        <span className="text-sm font-bold md:text-base">
                                            {notice.title}:
                                        </span>
                                        <span className="text-sm md:text-base font-normal text-gray-700 dark:text-gray-300">
                                            {notice.content}
                                        </span>
                                        {/* Separator */}
                                        <span className="text-blue-500/40 mx-2">•</span>
                                    </div>
                                ))}
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
                    animation: marquee ${notices.length * 40}s linear infinite;
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
