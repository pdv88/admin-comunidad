import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const RecentReportsWidget = () => {
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

    if (loading) return null;
    if (reports.length === 0) return null;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    {canViewAll ? t('dashboard.recent_reports', 'Recent Reports') : t('dashboard.my_reports', 'My Reports')}
                </h2>
                <Link to="/app/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    {t('common.view_all', 'View All')}
                </Link>
            </div>

            <div className="space-y-4">
                {reports.map(report => (
                    <div key={report.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-neutral-700 transition">
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
        </div>
    );
};

export default RecentReportsWidget;
