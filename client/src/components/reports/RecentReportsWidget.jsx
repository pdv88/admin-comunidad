import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const RecentReportsWidget = (props) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const role = user?.profile?.roles?.name || 'resident';
    const canViewAll = ['admin', 'president', 'vocal', 'secretary', 'maintenance'].includes(role);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Controller already sorts by created_at desc
                setReports(data.slice(0, 3));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'pending': return t('common.pending', 'Pending');
            case 'in_progress': return t('common.in_progress', 'In Progress');
            case 'resolved': return t('common.resolved', 'Resolved');
            case 'rejected': return t('common.rejected', 'Rejected');
            default: return status;
        }
    };

    if (loading) return (
        <div className={props.className}>
            <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
            </div>
            
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start justify-between p-4 glass-card border border-white/20 dark:border-white/5">
                        <div className="flex items-center gap-3 overflow-hidden w-full">
                                <div className="flex-shrink-0 w-8 h-8 bg-gray-200 dark:bg-neutral-800 rounded-full animate-pulse"></div>
                                <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                                <div className="h-3 w-1/2 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                                </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className={props.className}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-orange-500">🔧</span>
                    {canViewAll ? t('dashboard.recent_reports', 'Recent Reports') : t('dashboard.my_reports', 'My Reports')}
                </h2>
                <Link to="/app/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    {t('common.view_all', 'View All')}
                </Link>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-neutral-500 py-4">
                        <span className="text-3xl mb-2 opacity-50">📝</span>
                        <p className="font-medium text-sm">{t('reports.no_reports', 'No reports found')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map(report => (
                            <div key={report.id} className="flex items-start justify-between p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 transition-all hover:shadow-lg group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                     <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white dark:bg-neutral-600 rounded-full text-lg shadow-sm">
                                        {report.category === 'maintenance' ? '🔧' : 
                                         report.category === 'security' ? '🛡️' :
                                         report.category === 'cleaning' ? '🧹' : 
                                         report.category === 'noise' ? '🔊' : '📝'}
                                     </div>
                                     <div className="min-w-0">
                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                            {report.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-neutral-400">
                                            {new Date(report.created_at).toLocaleDateString()}
                                        </p>
                                     </div>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${getStatusStyle(report.status)}`}>
                                    {getStatusLabel(report.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentReportsWidget;
