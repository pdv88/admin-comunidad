import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import GlassLoader from '../components/GlassLoader';
import DashboardLayout from '../components/DashboardLayout';

const CommunityInfo = () => {
    const { t } = useTranslation();
    const { activeCommunity } = useAuth(); // Removed getAuthHeaders
    const [loading, setLoading] = useState(true);
    const [info, setInfo] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (activeCommunity) {
            fetchInfo();
        }
    }, [activeCommunity]);

    const fetchInfo = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const communityId = activeCommunity?.community_id;

            if (!token || !communityId) return;

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/communities/public-info`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Community-ID': communityId
                }
            });
            setInfo(response.data);
        } catch (err) {
            console.error('Error fetching community info:', err);
            setError('Failed to load information');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    if (loading) return (
        <DashboardLayout>
            <GlassLoader />
        </DashboardLayout>
    );

    if (error) return (
        <DashboardLayout>
            <div className="p-6 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl glass-card">
                {error}
            </div>
        </DashboardLayout>
    );

    const { community, leaders } = info || {};

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 md:pb-0 h-full overflow-y-auto customer-scrollbar p-1">
                {/* Header */}
                <div>
                     <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                        {t('community_info.title', 'Community Information')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('community_info.subtitle', 'Contact details and bank information')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Community + Bank */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Community Card */}
                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center glass-card">
                            {community?.logo_url ? (
                                <img src={community.logo_url} alt="Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-lg" />
                            ) : (
                                <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                                    {community?.name?.charAt(0)}
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{community?.name}</h2>
                            <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {community?.address || 'No address provided'}
                            </p>
                        </div>

                        {/* Bank Card */}
                        <div className="relative group overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-2xl border border-gray-700">
                            {/* Decorative Circles */}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/5 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl"></div>

                            <div className="relative z-10">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                    {t('community_info.bank_details', 'Bank Details')}
                                </h3>
                                
                                <div className="mb-6 whitespace-pre-wrap">
                                    {typeof community?.bank_details === 'string' ? (
                                        <p className="text-lg font-medium leading-relaxed">{community.bank_details}</p>
                                    ) : community?.bank_details ? (
                                        <div className="font-mono text-sm space-y-2">
                                             {/* Try to render key-values if it's an object */}
                                             {Object.entries(community.bank_details).map(([k, v]) => (
                                                <div key={k}>
                                                    <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}:</span> <span className="text-white">{v}</span>
                                                </div>
                                             ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">
                                            {t('community_info.no_bank_details', 'No bank details available.')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Leaders */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden glass-card">
                            <div className="p-6 border-b border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    {t('community_info.leaders_title', 'Community Leaders & Contact')}
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {leaders && leaders.length > 0 ? (
                                    leaders.map((leader, index) => (
                                        <div key={index} className="p-4 hover:bg-white/30 dark:hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/40 dark:to-violet-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg">
                                                    {leader.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">{leader.name}</h4>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                                                        ${leader.role === 'president' ? 'bg-purple-100 text-purple-800' :
                                                          leader.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                          leader.role === 'secretary' ? 'bg-green-100 text-green-800' :
                                                          leader.role === 'treasurer' ? 'bg-yellow-100 text-yellow-800' :
                                                          'bg-gray-100 text-gray-800'}`}>
                                                        {t(`user_management.roles.${leader.role}`, leader.role)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col md:items-end gap-1 text-sm">
                                                {leader.email && (
                                                    <a href={`mailto:${leader.email}`} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                        {leader.email}
                                                    </a>
                                                )}
                                                {leader.phone && (
                                                    <a href={`tel:${leader.phone}`} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                        {leader.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        {t('community_info.no_leaders', 'No public contact information available.')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CommunityInfo;
