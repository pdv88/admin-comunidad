import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import GlassLoader from '../components/GlassLoader';

const Alerts = () => {
    const { t } = useTranslation();
    const { activeCommunity } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/alerts`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(Array.isArray(data) ? data : []);
            } else {
                setAlerts([]);
            }
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, [activeCommunity]);

    const handleMarkAsRead = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/alerts/${id}/read`, {
                method: 'PUT'
            });
            if (res.ok) {
                setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
                toast.success(t('alerts.marked_as_read', 'Marked as read'));
            } else {
                toast.error(t('alerts.error_updating', 'Failed to update alert'));
            }
        } catch (error) {
            toast.error(t('alerts.error_updating', 'Failed to update alert'));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('common.confirm_delete', 'Are you sure?'))) return;
        try {
            const res = await fetch(`${API_URL}/api/alerts/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setAlerts(prev => prev.filter(a => a.id !== id));
                toast.success(t('common.deleted', 'Deleted'));
            } else {
                toast.error(t('common.error_deleting', 'Error deleting'));
            }
        } catch (error) {
            toast.error(t('common.error_deleting', 'Error deleting'));
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
                        {t('alerts.title', 'System Alerts')}
                    </h1>
                </div>

                {alerts.length === 0 ? (
                    <div className="text-center py-12 glass-card border border-dashed border-gray-300 dark:border-gray-700">
                        <svg className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-gray-500 text-lg">{t('alerts.no_alerts', 'All systems operational. No alerts found.')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`relative p-6 rounded-2xl border transition-all duration-300 backdrop-blur-md ${alert.is_read ? 'bg-white/40 dark:bg-black/20 border-gray-200 dark:border-gray-800 opacity-75' : 'bg-white/80 dark:bg-black/40 border-red-200 dark:border-red-900/50 shadow-lg border-l-4 border-l-red-500'}`}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            {alert.is_read ? (
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            )}
                                            <h3 className={`text-lg font-bold ${alert.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                {alert.title}
                                            </h3>
                                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {new Date(alert.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300">{alert.message}</p>

                                        {alert.metadata && (
                                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-xs font-mono text-gray-500 overflow-x-auto border border-gray-100 dark:border-gray-800">
                                                {JSON.stringify(alert.metadata, null, 2)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {!alert.is_read && (
                                            <button
                                                onClick={() => handleMarkAsRead(alert.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title={t('alerts.mark_as_read', 'Mark as read')}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(alert.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Alerts;
