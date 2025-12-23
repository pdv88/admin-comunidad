import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

import ConfirmationModal from '../components/ConfirmationModal';
import ModalPortal from '../components/ModalPortal';
import GlassSelect from '../components/GlassSelect';
import GlassLoader from '../components/GlassLoader';

const Reports = () => {
    const { user, activeCommunity } = useAuth();
    const { t } = useTranslation();
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);

    const role = activeCommunity?.roles?.name || user?.profile?.roles?.name;
    const isVocal = role === 'vocal';
    const isAdminOrPres = ['admin', 'president', 'secretary', 'treasurer'].includes(role); //Added treasurer just in case
    const isMaintenance = role === 'maintenance';

    const [activeTab, setActiveTab] = useState(isAdminOrPres ? 'all' : 'my'); // 'my', 'block', 'all'

    // New Report State
    const [newReport, setNewReport] = useState({ 
        title: '', 
        description: '', 
        category: 'maintenance',
        unit_id: '' 
    });

    // Get User Units for Dropdown
    const userUnits = user?.profile?.unit_owners?.map(uo => uo.units) || [];

    useEffect(() => {
        if (userUnits.length === 1) {
            setNewReport(prev => ({ ...prev, unit_id: userUnits[0].id }));
        }
        fetchReports();
    }, []);

    // Effect to filter reports based on Active Tab
    useEffect(() => {
        if (!reports.length) return;

        let filtered = [];
        if (activeTab === 'my') {
            filtered = reports.filter(r => r.user_id === user.id);
        } else if (activeTab === 'block') {
            // Filter by Vocal's blocks
            const myBlockIds = userUnits.map(u => u.block_id);
            filtered = reports.filter(r => myBlockIds.includes(r.block_id));
        } else if (activeTab === 'all') {
            filtered = reports;
        }
        setFilteredReports(filtered);
    }, [activeTab, reports]);


    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data);
                // Default filter will trigger via useEffect
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReport = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newReport)
            });

            if (res.ok) {
                setShowModal(false);
                setNewReport({ title: '', description: '', category: 'maintenance', unit_id: userUnits.length === 1 ? userUnits[0].id : '' });
                fetchReports();
            }
        } catch (error) {
            console.error('Error creating report:', error);
        }
    };

    const handleDeleteClick = (reportId) => {
        setReportToDelete(reportId);
        setShowDeleteModal(true);
    };

    const confirmDeleteReport = async () => {
        if (!reportToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${reportToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchReports();
                setShowDeleteModal(false);
                setReportToDelete(null);
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Error deleting report:', error);
        }
    };

    const handleStatusUpdate = async (reportId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/reports/${reportId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchReports();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('reports.title', 'Issues & Maintenance')}</h1>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="glass-button gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        {t('reports.report_issue', 'Report Issue')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-white/30 backdrop-blur-md border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10 p-1 rounded-full mb-6 w-fit items-center">
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'my' 
                            ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400' 
                            : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                    >
                        {t('reports.tabs.my', 'My Reports')}
                    </button>
                    {(isVocal || isAdminOrPres) && (
                        <button
                            onClick={() => setActiveTab('block')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'block' 
                                ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400' 
                                : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                        >
                            {t('reports.tabs.block', 'Block Reports')}
                        </button>
                    )}
                    {isAdminOrPres && (
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'all' 
                                ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400' 
                                : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                        >
                            {t('reports.tabs.all', 'All Reports')}
                        </button>
                    )}
                </div>

                {/* Reports List */}
                <div className="grid gap-4">
                    {loading ? (
                        <GlassLoader />
                    ) : filteredReports.length === 0 ? (
                        <div className="glass-card text-center py-12">
                             <p className="text-gray-500 dark:text-neutral-400">{t('reports.no_reports', 'No reports found.')}</p>
                        </div>
                    ) : (
                        filteredReports.map(report => (
                            <div key={report.id} className="glass-card p-5 hover:shadow-xl transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                             <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(report.status)} uppercase tracking-wide`}>
                                                {t(`reports.status.${report.status}`, report.status)}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-neutral-400">
                                                {new Date(report.created_at).toLocaleDateString()}
                                            </span>
                                            {/* Show Unit Info if not 'my' tab */}
                                            {activeTab !== 'my' && report.units && (
                                                <span className="text-xs font-semibold text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                                                    {report.units.blocks?.name} - {report.units.unit_number}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{report.title}</h3>
                                        <p className="text-gray-600 dark:text-neutral-400 text-sm mb-3">{report.description}</p>
                                        
                                        {/* Status Actions for Authorized Users */}
                                        {(isAdminOrPres || isMaintenance || (isVocal && activeTab === 'block')) && (
                                            <div className="flex gap-2 mt-2">
                                                {report.status === 'pending' && (
                                                    <button onClick={() => handleStatusUpdate(report.id, 'in_progress')} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 font-medium">
                                                        {t('reports.actions.start', 'Start Progress')}
                                                    </button>
                                                )}
                                                {report.status === 'in_progress' && (
                                                    <button onClick={() => handleStatusUpdate(report.id, 'resolved')} className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded hover:bg-green-100 font-medium">
                                                        {t('reports.actions.resolve', 'Mark Resolved')}
                                                    </button>
                                                )}
                                                {report.status !== 'rejected' && report.status !== 'resolved' && (
                                                     <button onClick={() => handleStatusUpdate(report.id, 'rejected')} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 font-medium">
                                                        {t('reports.actions.reject', 'Reject')}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Delete Action (Admins or Own Pending Reports) */}
                                        {(isAdminOrPres || (report.user_id === user.id && report.status === 'pending')) && (
                                            <div className="mt-2 text-right">
                                                 <button 
                                                    onClick={() => handleDeleteClick(report.id)}
                                                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 ml-auto"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    {t('common.delete', 'Delete')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {report.image_url && (
                                        <img src={report.image_url} alt="Report" className="w-20 h-20 object-cover rounded-lg ml-4 bg-gray-100" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create Modal */}
                {showModal && (
                    <ModalPortal>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="glass-card w-full max-w-md p-6 shadow-xl animate-fade-in">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('reports.form.title', 'Report Issue')}</h2>
                            <form onSubmit={handleCreateReport} className="space-y-4">
                                {/* Unit Selection (if multiple) */}
                                {userUnits.length > 1 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.unit', 'Unit')}</label>
                                        <GlassSelect
                                            value={newReport.unit_id}
                                            onChange={(e) => setNewReport({ ...newReport, unit_id: e.target.value })}
                                            options={[
                                                 { value: '', label: t('common.select', 'Select...') },
                                                 ...userUnits.map(unit => ({
                                                     value: unit.id,
                                                     label: `${unit.blocks?.name ? unit.blocks.name + ' - ' : ''}${unit.unit_number}`
                                                 }))
                                            ]}
                                            placeholder={t('reports.form.select_unit', 'Select Unit')}
                                            required
                                        />
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.issue_title', 'Issue Title')}</label>
                                    <input
                                        type="text"
                                        value={newReport.title}
                                        onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                                        className="glass-input"
                                        required
                                        placeholder={t('reports.form.placeholder_title', 'e.g. Broken Light')}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.category', 'Category')}</label>
                                    <GlassSelect
                                        value={newReport.category}
                                        onChange={(e) => setNewReport({ ...newReport, category: e.target.value })}
                                        options={[
                                            { value: 'maintenance', label: t('reports.categories.maintenance', 'Maintenance') },
                                            { value: 'security', label: t('reports.categories.security', 'Security') },
                                            { value: 'cleanliness', label: t('reports.categories.cleanliness', 'Cleanliness') },
                                            { value: 'other', label: t('reports.categories.other', 'Other') }
                                        ]}
                                        placeholder={t('reports.form.select_category', 'Select Category')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.desc', 'Description')}</label>
                                    <textarea
                                        value={newReport.description}
                                        onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                                        className="glass-input min-h-[100px] rounded-2xl"
                                        rows="3"
                                        placeholder={t('reports.form.placeholder_desc', 'Describe the issue...')}
                                    ></textarea>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 glass-button-secondary"
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 glass-button"
                                    >
                                        {t('reports.form.submit', 'Submit Report')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    </ModalPortal>
                )}
                
                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDeleteReport}
                    title={t('common.delete', 'Delete Report')}
                    message={t('common.confirm_delete_report', 'Are you sure you want to delete this report? This action cannot be undone.')}
                    confirmText={t('common.delete', 'Delete')}
                    cancelText={t('common.cancel', 'Cancel')}
                />
            </div>
        </DashboardLayout>
    );
};

export default Reports;
