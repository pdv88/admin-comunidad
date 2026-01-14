import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

import ConfirmationModal from '../components/ConfirmationModal';
import ModalPortal from '../components/ModalPortal';
import GlassSelect from '../components/GlassSelect';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';
import ReportDetailsPanel from '../components/ReportDetailsPanel';
import { exportReportToPDF } from '../utils/pdfExport';

const Reports = () => {
    const { user, activeCommunity, hasAnyRole } = useAuth();
    const { t } = useTranslation();
    const [reports, setReports] = useState([]);
    const [blocks, setBlocks] = useState([]); // Blocks for scope selection
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Accordion State
    const [expandedReportId, setExpandedReportId] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);

    const isVocal = hasAnyRole(['vocal']);
    const isAdminOrPres = hasAnyRole(['super_admin', 'admin', 'president', 'secretary', 'treasurer']); 
    const isMaintenance = hasAnyRole(['maintenance']);

    const [activeTab, setActiveTab] = useState(isAdminOrPres ? 'all' : 'my'); 

    // New Report State
    const [newReport, setNewReport] = useState({ 
        title: '', 
        description: '', 
        category: 'maintenance',
        scope: 'community', // community, block, unit
        block_id: '',
        unit_id: '' 
    });

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalReports, setTotalReports] = useState(0);
    const itemsPerPage = 10;

    // Get User Units for Dropdown
    const userUnits = user?.profile?.unit_owners?.map(uo => uo.units) || [];

    useEffect(() => {
        // Debounce search term
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter, categoryFilter, activeTab]);

    useEffect(() => {
        if (userUnits.length === 1) {
             setNewReport(prev => ({ 
                ...prev, 
                unit_id: userUnits[0].id,
                block_id: userUnits[0].block_id
            }));
        }
        fetchBlocks();
    }, []);

    // Fetch reports when dependencies change
    useEffect(() => {
        fetchReports();
    }, [currentPage, debouncedSearch, statusFilter, categoryFilter, activeTab]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                status: statusFilter,
                category: categoryFilter,
                mode: activeTab
            });

            const res = await fetch(`${API_URL}/api/reports?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setReports(data.data || []);
                setTotalReports(data.count || 0);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBlocks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/properties/blocks`);
            if (res.ok) {
                const data = await res.json();
                setBlocks(data);
            }
        } catch (error) {
            console.error("Error fetching blocks:", error);
        }
    };

    const handleCreateReport = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Prepare payload based on scope
            const payload = {
                title: newReport.title,
                description: newReport.description,
                category: newReport.category,
                // Scope logic
                unit_id: newReport.scope === 'unit' ? newReport.unit_id : null,
                block_id: newReport.scope === 'block' ? newReport.block_id : null
                // if scope is community, both are null
            };

            const res = await fetch(`${API_URL}/api/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                // Reset form
                setNewReport({ 
                    title: '', 
                    description: '', 
                    category: 'maintenance', 
                    scope: 'community',
                    block_id: userUnits.length === 1 ? userUnits[0].block_id : '',
                    unit_id: userUnits.length === 1 ? userUnits[0].id : '' 
                });
                fetchReports();
                setToast({ message: t('reports.create_success', 'Report created successfully'), type: 'success' });
            } else {
                 setToast({ message: t('common.error', 'Error creating report'), type: 'error' });
            }
        } catch (error) {
            console.error('Error creating report:', error);
            setToast({ message: t('common.error', 'Error creating report'), type: 'error' });
        }
    };

    // ... (handleDeleteClick, confirmDeleteReport, handleStatusUpdate, getStatusColor remain same) ...
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
                setToast({ message: t('reports.delete_success', 'Report deleted successfully'), type: 'success' });
            } else {
                const data = await res.json();
                setToast({ message: data.error || t('common.error', 'Error deleting report'), type: 'error' });
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            setToast({ message: t('common.error', 'Error deleting report'), type: 'error' });
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
                setToast({ message: t('reports.status_updated', 'Status updated'), type: 'success' });
            } else {
                setToast({ message: t('common.error', 'Error updating status'), type: 'error' });
            }
        } catch (error) {
            console.error('Error updating status:', error);
            setToast({ message: t('common.error', 'Error updating status'), type: 'error' });
        }
    };

    const handleExportPDF = async (report, e) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            let notesData = [];
            let imagesData = [];

            // Fetch notes
            const notesRes = await fetch(`${API_URL}/api/reports/${report.id}/notes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (notesRes.ok) notesData = await notesRes.json();
            
            // Fetch images
            const imagesRes = await fetch(`${API_URL}/api/reports/${report.id}/images`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (imagesRes.ok) imagesData = await imagesRes.json();
            // Try to get logo and brand color from nested communities object or direct property
            const logoUrl = activeCommunity?.communities?.logo_url || activeCommunity?.logo_url;
            const brandColor = activeCommunity?.communities?.brand_color || activeCommunity?.brand_color || '#3B82F6';
            
            await exportReportToPDF(report, notesData, imagesData, t, logoUrl, brandColor);
            setToast({ message: t('reports.pdf_exported', 'PDF downloaded successfully'), type: 'success' });
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setToast({ message: t('common.error_occurred', 'Error occurred'), type: 'error' });
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
            <Toast 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast({ ...toast, message: '' })} 
            />
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                {/* ... Header and Tabs ... */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('reports.title', 'Issues & Maintenance')}</h1>
                    {(isAdminOrPres || isVocal) && (
                        <button 
                            onClick={() => setShowModal(true)}
                            className="glass-button gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            {t('reports.report_issue', 'Report Issue')}
                        </button>
                    )}
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
                    {isVocal && !isAdminOrPres && (
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
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('reports.search_placeholder', 'Search by title, description or name...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="glass-input pl-10 w-full"
                            />
                            <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div>
                        <GlassSelect
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'all', label: t('reports.filters.all_status', 'All Statuses') },
                                { value: 'pending', label: t('reports.status.pending', 'Pending') },
                                { value: 'in_progress', label: t('reports.status.in_progress', 'In Progress') },
                                { value: 'resolved', label: t('reports.status.resolved', 'Resolved') },
                                { value: 'rejected', label: t('reports.status.rejected', 'Rejected') }
                            ]}
                        />
                    </div>
                    <div>
                        <GlassSelect
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            options={[
                                { value: 'all', label: t('reports.filters.all_categories', 'All Categories') },
                                { value: 'maintenance', label: t('reports.categories.maintenance', 'Maintenance') },
                                { value: 'security', label: t('reports.categories.security', 'Security') },
                                { value: 'cleanliness', label: t('reports.categories.cleanliness', 'Cleanliness') },
                                { value: 'other', label: t('reports.categories.other', 'Other') }
                            ]}
                        />
                    </div>
                </div>

                {/* Reports List */}
                <div className="grid gap-4">
                    {loading ? (
                        <GlassLoader />
                    ) : reports.length === 0 ? (
                        <div className="glass-card text-center py-12">
                             <p className="text-gray-500 dark:text-neutral-400">{t('reports.no_reports', 'No reports found.')}</p>
                        </div>
                    ) : (
                        <>
                        {reports.map(report => (
                            <div 
                                key={report.id} 
                                className={`glass-card p-4 hover:bg-white/40 dark:hover:bg-neutral-800/40 transition-colors animate-fade-in ${expandedReportId === report.id ? 'active-card ring-2 ring-blue-500/50' : ''}`}
                            >
                                <div 
                                    className="cursor-pointer"
                                    onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                                                    {t(`reports.status.${report.status}`, report.status)}
                                                </span>
                                                <span className="text-xs text-gray-400 capitalize bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">
                                                    {t(`reports.categories.${report.category}`, report.category)}
                                                </span>
                                            </div>
                                            <h2 className="font-bold text-gray-800 dark:text-white text-lg mb-1">{report.title}</h2>
                                            <p className="text-gray-600 dark:text-neutral-300 text-sm line-clamp-2 md:line-clamp-none">{report.description}</p>
                                            
                                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-neutral-400">
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    {report.profiles?.full_name || 'Unknown'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </div>
                                                {/* Scope Badge */}
                                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded flex items-center gap-1">
                                                    {report.scope === 'community' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                                    {report.scope === 'block' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                                                    {report.scope === 'unit' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                                                    {report.scope === 'block' ? `${t('reports.scope.block')} ${report.blocks?.name || ''}` : 
                                                     report.scope === 'unit' ? `${t('reports.scope.unit')} ${report.blocks?.name || ''} - ${report.units?.unit_number || ''}` : 
                                                     t('reports.scope.community')}
                                                </span>
                                            </div>

                                            {/* Status Change Buttons */}
                                            {(isAdminOrPres || isVocal) && ( report.status !== 'resolved' && report.status !== 'rejected') && (
                                                <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                                                    {report.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id, 'in_progress')}
                                                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                                                        >
                                                            {t('reports.actions.start_progress', 'Start Progress')}
                                                        </button>
                                                    )}
                                                    {report.status === 'in_progress' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                                            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                                                        >
                                                            {t('reports.actions.mark_resolved', 'Mark Resolved')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}  
                                            
                                            {/* Action Buttons Row */}
                                            <div className="mt-3 flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                                {/* Download PDF Button */}
                                                <button
                                                    onClick={(e) => handleExportPDF(report, e)}
                                                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium transition-colors"
                                                    title={t('reports.export_pdf', 'Download PDF')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    <span className="hidden sm:inline">{t('reports.export_pdf', 'Download PDF')}</span>
                                                </button>

                                                {/* Delete Button */}
                                                {(report.status === 'pending' || report.status === 'rejected' || isAdminOrPres) && (report.user_id === user.id || isAdminOrPres) && (
                                                    <button 
                                                        onClick={() => handleDeleteReport(report.id)}
                                                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 ml-auto"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        {t('common.delete', 'Delete')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {report.image_url && (
                                            <img src={report.image_url} alt="Report" className="w-20 h-20 object-cover rounded-lg ml-4 bg-gray-100" />
                                        )}
                                        {/* Chevron for indication */}
                                        <div className="ml-2 mt-1 text-gray-400">
                                            <svg className={`w-5 h-5 transform transition-transform ${expandedReportId === report.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Accordion Content */}
                                {expandedReportId === report.id && (
                                    <div className="mt-4 animate-slide-down">
                                        <ReportDetailsPanel report={report} onUpdate={fetchReports} />
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Pagination Controls */}
                        {totalReports > itemsPerPage && (
                            <div className="flex justify-center items-center gap-4 mt-6">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="glass-button px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Previous Page"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <span className="text-gray-600 dark:text-neutral-400 font-medium">
                                    {currentPage} / {Math.ceil(totalReports / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalReports / itemsPerPage)))}
                                    disabled={currentPage >= Math.ceil(totalReports / itemsPerPage)}
                                    className="glass-button px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Next Page"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                        </>
                    )}
                </div>

                {/* Create Modal */}
                {showModal && (
                    <ModalPortal>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="glass-card w-full max-w-md p-6 shadow-xl animate-fade-in">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('reports.form.title', 'Report Issue')}</h2>
                            <form onSubmit={handleCreateReport} className="space-y-4">
                                
                                {/* Scope Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.scope', 'Scope')}</label>
                                    <GlassSelect
                                        value={newReport.scope}
                                        onChange={(e) => setNewReport({ ...newReport, scope: e.target.value })}
                                        options={[
                                            { value: 'community', label: t('reports.scope.community', 'Community (General)') },
                                            { value: 'block', label: t('reports.scope.block', 'Block (Building)') },
                                            { value: 'unit', label: t('reports.scope.unit', 'My Unit') }
                                        ]}
                                    />
                                </div>

                                {/* Conditional Block Selection (For Block Scope OR Unit Scope for Admins) */}
                                {(newReport.scope === 'block' || ((isAdminOrPres || isVocal) && newReport.scope === 'unit')) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.select_block', 'Select Block')}</label>
                                        <GlassSelect
                                            value={newReport.block_id}
                                            onChange={(e) => setNewReport({ ...newReport, block_id: e.target.value, unit_id: '' })} // Reset unit when block changes
                                            options={[
                                                { value: '', label: t('common.select', 'Select...') },
                                                ...blocks
                                                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                                                    .map(b => ({ value: b.id, label: b.name }))
                                            ]}
                                            required={newReport.scope === 'block' || newReport.scope === 'unit'}
                                        />
                                    </div>
                                )}

                                {/* Conditional Unit Selection */}
                                {newReport.scope === 'unit' && (
                                    (isAdminOrPres || isVocal) ? (
                                        // Admin/Vocal View: Select from units in chosen block
                                        newReport.block_id && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.unit', 'Unit')}</label>
                                                <GlassSelect
                                                    value={newReport.unit_id}
                                                    onChange={(e) => setNewReport({ ...newReport, unit_id: e.target.value })}
                                                    options={[
                                                         { value: '', label: t('common.select', 'Select...') },
                                                         ...(blocks.find(b => b.id === newReport.block_id)?.units
                                                            ?.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
                                                            ?.map(u => ({
                                                             value: u.id,
                                                             label: u.unit_number
                                                         })) || [])
                                                    ]}
                                                    required={newReport.scope === 'unit'}
                                                    placeholder={t('reports.form.select_unit', 'Select Unit')}
                                                />
                                            </div>
                                        )
                                    ) : (
                                        // Resident View: Select from OWN units (if multiple)
                                        userUnits.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('reports.form.unit', 'Unit')}</label>
                                                <GlassSelect
                                                    value={newReport.unit_id}
                                                    onChange={(e) => setNewReport({ ...newReport, unit_id: e.target.value })}
                                                    options={[
                                                         { value: '', label: t('common.select', 'Select...') },
                                                         ...userUnits
                                                            .sort((a, b) => {
                                                                const blockA = a.blocks?.name || '';
                                                                const blockB = b.blocks?.name || '';
                                                                if (blockA !== blockB) return blockA.localeCompare(blockB, undefined, { numeric: true });
                                                                return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true });
                                                            })
                                                            .map(unit => ({
                                                             value: unit.id,
                                                             label: `${unit.blocks?.name ? unit.blocks.name + ' - ' : ''}${unit.unit_number}`
                                                         }))
                                                    ]}
                                                    required={newReport.scope === 'unit'}
                                                    placeholder={t('reports.form.select_unit', 'Select Unit')}
                                                />
                                            </div>
                                        )
                                    )
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
                                        className="glass-input min-h-[100px] rounded-3xl"
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
