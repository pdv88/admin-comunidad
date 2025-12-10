import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';

const Notices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/notices');
            const data = await res.json();
            setNotices(data);
        } catch (error) {
            console.error("Error fetching notices:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div>{t('notices.loading')}</div>
                </div>
            </DashboardLayout>
        );
    }

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-blue-50 text-blue-800 border-blue-200';
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('notices.title')}</h1>
                    {/* Only admin sees this */}
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t('notices.post_notice')}</button>
                </div>

                <div className="space-y-4">
                    {notices.map(notice => (
                        <div key={notice.id} className={`p-4 rounded-xl border ${getPriorityColor(notice.priority)} dark:bg-neutral-800 dark:border-neutral-700`}>
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg">{notice.title}</h3>
                                <span className="text-xs uppercase font-semibold px-2 py-1 rounded bg-white/50">{notice.priority}</span>
                            </div>
                            <p className="mt-2 text-sm opacity-90">{notice.content}</p>
                            <div className="mt-3 text-xs opacity-70">
                                {t('notices.posted_on')} {new Date(notice.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {notices.length === 0 && <p className="text-gray-500">{t('notices.no_notices')}</p>}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Notices;
