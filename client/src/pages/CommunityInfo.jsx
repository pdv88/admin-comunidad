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
    const [copied, setCopied] = useState(null);

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(text);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

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

            if (!token || !communityId) {
                setLoading(false);
                return;
            }

            const response = await axios.get('/api/communities/public-info', {
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
                {/* Community Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl shadow-2xl">
                    {/* Background decorative elements */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-500/20 to-orange-500/20 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                    
                    <div className="relative z-10 p-6 md:p-8">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Logo */}
                            {community?.logo_url ? (
                                <img 
                                    src={community.logo_url} 
                                    alt="Logo" 
                                    className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-xl bg-white/10 p-2 shadow-lg" 
                                />
                            ) : (
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-lg">
                                    {community?.name?.charAt(0)}
                                </div>
                            )}
                            
                            {/* Community Info */}
                            <div className="text-center md:text-left flex-1">
                                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                    {community?.name}
                                </h1>
                                <p className="text-gray-300 flex items-center justify-center md:justify-start gap-2">
                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {community?.address || t('community_info.no_address', 'No address provided')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bank Details Section - Right on desktop */}
                    <div className="space-y-4 order-2 lg:order-2">
                        <div className="flex items-center gap-2 px-1">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                            </svg>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {t('community_info.bank_details', 'Bank Details')}
                            </h2>
                        </div>
                        
                        {(() => {
                            const bankData = community?.bank_details;
                            
                            // No bank details
                            if (!bankData || (Array.isArray(bankData) && bankData.length === 0)) {
                                return (
                                    <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl p-8 text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400">
                                            {t('community_info.no_bank_details', 'No bank details available.')}
                                        </p>
                                    </div>
                                );
                            }
                            
                            // String format
                            if (typeof bankData === 'string') {
                                return (
                                    <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl p-4">
                                        <p className="text-gray-800 dark:text-white whitespace-pre-wrap">{bankData}</p>
                                    </div>
                                );
                            }
                            
                            // Convert single object to array for uniform handling
                            const accounts = Array.isArray(bankData) ? bankData : [bankData];
                            
                            return (
                                <div className="space-y-3">
                                    {accounts.map((account, idx) => (
                                        <div key={idx} className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                                            {/* Bank Name Header */}
                                            {account.bank_name && (
                                                <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{account.bank_name}</h4>
                                                </div>
                                            )}
                                            
                                            {/* Account Details - Row layout with wrap */}
                                            <div className="p-4 flex flex-wrap gap-x-6 gap-y-3">
                                                {/* Account Holder */}
                                                {account.account_holder && (
                                                    <div className="min-w-[120px]">
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">{t('community_info.account_holder', 'Account Holder')}</span>
                                                        <p className="text-gray-900 dark:text-white">{account.account_holder}</p>
                                                    </div>
                                                )}
                                                
                                                {/* Account Number */}
                                                {account.account_number && (
                                                    <div className="min-w-[120px] group flex items-start gap-1">
                                                        <div>
                                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">{t('community_info.account_number', 'Account Number')}</span>
                                                            <p className="text-gray-900 dark:text-white font-mono tracking-wider">{account.account_number}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => copyToClipboard(account.account_number)}
                                                            className="mt-3 p-1 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                            title={t('common.copy', 'Copy')}
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Secondary Number (CLABE/IBAN) */}
                                                {account.secondary_number && (
                                                    <div className="min-w-[120px] group flex items-start gap-1">
                                                        <div>
                                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                                                                {(account.secondary_type || 'CLABE').toUpperCase()}
                                                            </span>
                                                            <p className="text-gray-900 dark:text-white font-mono tracking-wider">{account.secondary_number}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => copyToClipboard(account.secondary_number)}
                                                            className="mt-3 p-1 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                            title={t('common.copy', 'Copy')}
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Backward compatibility: CLABE field */}
                                                {!account.secondary_number && account.clabe && (
                                                    <div className="min-w-[120px] group flex items-start gap-1">
                                                        <div>
                                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">CLABE</span>
                                                            <p className="text-gray-900 dark:text-white font-mono tracking-wider">{account.clabe}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => copyToClipboard(account.clabe)}
                                                            className="mt-3 p-1 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                            title={t('common.copy', 'Copy')}
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Leaders Section - Left on desktop */}
                    <div className="space-y-4 order-1 lg:order-1">
                        <div className="flex items-center gap-2 px-1">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {t('community_info.leaders_title', 'Community Leaders & Contact')}
                            </h2>
                        </div>
                        
                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                            {leaders && leaders.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {leaders.map((leader, index) => (
                                        <div key={index} className="p-4 hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                                            <div className="flex items-start gap-3">
                                                {/* Avatar */}
                                                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/40 dark:to-violet-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                                                    {leader.name?.charAt(0)}
                                                </div>
                                                
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{leader.name}</h4>
                                                    
                                                    {/* Roles */}
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {leader.roles?.map((roleInfo, roleIdx) => {
                                                            const roleName = roleInfo.role;
                                                            const blockName = roleInfo.block;
                                                            
                                                            const getRoleColor = (role) => {
                                                                switch(role) {
                                                                    case 'president': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
                                                                    case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
                                                                    case 'secretary': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
                                                                    case 'treasurer': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
                                                                    case 'vocal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
                                                                    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                                                                }
                                                            };
                                                            
                                                            return (
                                                                <span 
                                                                    key={roleIdx}
                                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleColor(roleName)}`}
                                                                >
                                                                    {t(`user_management.roles.${roleName}`, roleName)}
                                                                    {blockName && ` - ${blockName}`}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    {/* Contact Info */}
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                                                        {leader.email && (
                                                            <a href={`mailto:${leader.email}`} className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 truncate">
                                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                <span className="truncate">{leader.email}</span>
                                                            </a>
                                                        )}
                                                        {leader.phone && (
                                                            <a href={`tel:${leader.phone}`} className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5">
                                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                                {leader.phone}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {t('community_info.no_leaders', 'No public contact information available.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CommunityInfo;
