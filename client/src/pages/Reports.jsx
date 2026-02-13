import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import ImageUploader from '../components/ImageUploader';
import { exportReportToPDF } from '../utils/pdfExport';
import HierarchicalBlockSelector from '../components/HierarchicalBlockSelector';
import HierarchicalUnitSelector from '../components/HierarchicalUnitSelector';

const Reports = () => {
    const { user, activeCommunity, hasAnyRole } = useAuth();
    const { t } = useTranslation();
    const [reports, setReports] = useState([]);
    const [blocks, setBlocks] = useState([]); // Blocks for scope selection
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    // Accordion State
    const [expandedReportId, setExpandedReportId] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const isVocal = hasAnyRole(['vocal']);
    // Removed secretary and treasurer. Added maintenance to generic admin-like access for reports if desired, 
    // OR keep strict and use canManageReports helper.
    // User said: super_admin, admin, president, vocal, maintenance can CRUD.
    const canManageReports = hasAnyRole(['super_admin', 'admin', 'president', 'maintenance']);
    const isMaintenance = hasAnyRole(['maintenance']);

    // For UI logic, traditionally isAdminOrPres was used. Let's remap it or replace usages.
    // NOTE: We are replacing the definition of isAdminOrPres to be "canManageReports" essentially for this file.
    const isAdminOrPres = canManageReports;

    const [activeTab, setActiveTab] = useState(isAdminOrPres ? 'all' : 'my');

    // New Report State
    const [newReport, setNewReport] = useState({
        title: '',
        description: '',
        category: 'maintenance',
        scope: 'community', // community, block, unit
        target_type: 'all', // all, blocks (New)
        target_blocks: [], // Array of block IDs (New)
        block_id: '',
        unit_id: '',
        image_url: '',
        visibility: 'public' // public or private
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

    const [searchParams, setSearchParams] = useSearchParams();
    const reportIdParam = searchParams.get('reportId');

    useEffect(() => {
        if (reportIdParam) {
            // Check if report is already in the list
            const localReport = reports.find(r => r.id === reportIdParam);
            if (localReport) {
                // If in list, just expand it (Accordion style)
                setExpandedReportId(reportIdParam);
                setSelectedReport(null); // Ensure modal is closed if we found it locally

                // Optional: Scroll to it?
                // For now, just expanding is enough as per user request "it is just an acordeon"
            } else {
                // Fetch single report and show in Modal (fallback for deep links not in current page)
                const fetchSingle = async () => {
                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${API_URL}/api/reports/${reportIdParam}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'X-Community-ID': activeCommunity.community_id
                            }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            setSelectedReport(data);
                        }
                    } catch (err) {
                        console.error('Error fetching report', err);
                    }
                };
                fetchSingle();
            }
        }
    }, [reportIdParam, reports]);

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

    // Helper to get block name (copied from Notices or similar)
    const getBlockName = (id) => {
        const block = blocks.find(b => b.id === id);
        return block ? block.name : 'Unknown Block';
    };

    const handleToggleBlock = (blockId) => {
        setNewReport(prev => {
            const currentSelected = prev.target_blocks || [];
            if (currentSelected.includes(blockId)) {
                return { ...prev, target_blocks: currentSelected.filter(id => id !== blockId) };
            } else {
                return { ...prev, target_blocks: [...currentSelected, blockId] };
            }
        });
    };

    const handleCreateReport = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const token = localStorage.getItem('token');

            // Prepare payload based on scope
            const payload = {
                title: newReport.title,
                description: newReport.description,
                category: newReport.category,
                image_url: newReport.image_url,
                visibility: newReport.visibility,
                // Scope logic
                // If 'specific' scope is chosen (legacy logic preserved for unit reports), pass unit/block
                // BUT we are enhancing the 'Block Selector' part.
                // If user selects 'Specific Area (Block / Unit)' -> traditional logic.
                // If user selects 'Target Audience' -> new logic?
                // Wait, user wants "Reports form too" to have "hierarchical block selector".
                // This implies the scope selection changes from "Community vs Specific" to "Audience: All vs Specific Blocks" like Notices?
                // Notices is about "Who sees this". Reports is about "Where is the issue".
                // If I report a broken light in "Building A", it's a specific scope.
                // The "Target Audience" in Notices determines visibility.
                // In Reports, `target_blocks` likely means "This report is relevant for these blocks".
                // The current form has "Scope": Community vs Specific Area.
                // If I keep "Specific Area", I should probably allow multi-block selection there?
                // OR replace the whole "Scope" dropdown with the "Target Audience" style radio buttons?
                // Let's replace "Scope" dropdown with "Target Scope" radios: "Community / Common Area" vs "Specific Blocks/Units".
                // Actually, let's look at the request: "add the hierarchical block selector... same layout".
                // So we probably want:
                // 1. Title/Desc/Category
                // 2. Target Scope (Radios: 'Community', 'Specific Blocks')
                // 3. If Specific Blocks -> Hierarchical Selector.
                // BUT what about Unit ID? "Specific Area (Block/Unit)" was useful for "Unit 101".
                // Maybe we keep Unit selection for "My Unit"?
                // Let's assume for now we mix it:
                // "Target": [x] Community [ ] Specific Areas
                // If Specific -> Show Block Selector AND maybe Unit Selector?
                // Complex. Let's stick to the styling requested matching Notices.
                // Notices has "Target Audience: All vs Blocks".
                // For Reports, let's map: 
                // type='all' -> Scope Community
                // type='blocks' -> Scope Specific Blocks (Hierarchical)
                // limit unit selection? If I need to report for my unit, I probably use "My Unit".
                // Let's send both legacy block_id (if single) and target_blocks.

                target_type: newReport.target_type,
                target_blocks: newReport.target_blocks,
                // Ensure backward compat if backend expects block_id for single selection? 
                // Backend update handles target_blocks.
                unit_id: newReport.unit_id || null
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
                    target_type: 'all',
                    target_blocks: [],
                    block_id: userUnits.length === 1 ? userUnits[0].block_id : '',
                    unit_id: userUnits.length === 1 ? userUnits[0].id : '',
                    image_url: '',
                    visibility: 'public'
                });
                fetchReports();
                setToast({ message: t('reports.create_success', 'Report created successfully'), type: 'success' });
            } else {
                setToast({ message: t('common.error', 'Error creating report'), type: 'error' });
            }
        } catch (error) {
            console.error('Error creating report:', error);
            setToast({ message: t('common.error', 'Error creating report'), type: 'error' });
        } finally {
            setIsCreating(false);
        }
    };


    // ... (handleDeleteClick, confirmDeleteReport, handleStatusUpdate, getStatusColor remain same) ...
    const handleDeleteClick = (reportId) => {
        setReportToDelete(reportId);
        setShowDeleteModal(true);
    };

    const confirmDeleteReport = async () => {
        if (!reportToDelete) return;

        setIsDeleting(true);
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
        } finally {
            setIsDeleting(false);
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6">
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
                                                    {report.visibility === 'private' && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                            {t('reports.private', 'Private')}
                                                        </span>
                                                    )}
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
                                                        {/* Icon Logic */}
                                                        {report.unit_id ? (
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                                        ) : (report.target_type === 'blocks' || report.block_id || (report.target_blocks && report.target_blocks.length > 0)) ? (
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                        ) : (
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                        )}

                                                        {/* Text Logic */}
                                                        {report.unit_id
                                                            ? `${report.units?.blocks?.name || report.blocks?.name || ''} - ${report.units?.unit_number || ''}`
                                                            : (report.target_blocks && report.target_blocks.length > 0)
                                                                ? (() => {
                                                                    // Map IDs to Names
                                                                    const count = report.target_blocks.length;
                                                                    if (count === 1) {
                                                                        return getBlockName(report.target_blocks[0]);
                                                                    } else {
                                                                        return `${count} ${t('reports.scope.blocks', 'Blocks')}`;
                                                                    }
                                                                })()
                                                                : report.block_id
                                                                    ? `${report.blocks?.name || ''}`
                                                                    : t('reports.scope.community')}
                                                    </span>
                                                </div>

                                                {/* Status Change Buttons */}
                                                {(isAdminOrPres || isVocal) && (report.status !== 'resolved' && report.status !== 'rejected') && (
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
                                                            onClick={() => handleDeleteClick(report.id)}
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
                                            <ReportDetailsPanel
                                                report={report}
                                                onUpdate={fetchReports}
                                                blocks={blocks}
                                                userUnits={userUnits}
                                            />
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
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('reports.form.create_title', 'Create Report')}</h2>
                                <form onSubmit={handleCreateReport} className="space-y-4">

                                    {/* Updated Form Layout matching Notices */}

                                    {/* 1. Title */}
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

                                    {/* 2. Category & Visibility */}
                                    {/* We can put them in a grid or stack. Notices stacks Priority. Let's stack Category. */}
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

                                    {/* Visibility Toggle (Admin Only) - Keep separate or integrate? */}
                                    {isAdminOrPres && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800/50 rounded-2xl mb-2">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                                                    {t('reports.form.private_report', 'Private Report')}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setNewReport({ ...newReport, visibility: newReport.visibility === 'private' ? 'public' : 'private' })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newReport.visibility === 'private' ? 'bg-purple-600' : 'bg-gray-200 dark:bg-neutral-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newReport.visibility === 'private' ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    )}

                                    {/* 3. Description (Content) */}
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

                                    {/* 4. Target Scope (Replaces old Scope Dropdown) */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">{t('reports.form.scope', 'Scope / Location')}</label>

                                        <div className="flex gap-4 mb-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="all"
                                                    checked={newReport.target_type === 'all'}
                                                    onChange={() => setNewReport({ ...newReport, target_type: 'all' })}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm dark:text-gray-300">{t('reports.scope.community', 'Community / General')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="blocks"
                                                    checked={newReport.target_type === 'blocks'}
                                                    onChange={() => setNewReport({ ...newReport, target_type: 'blocks', unit_id: '', block_id: '', target_blocks: [] })}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm dark:text-gray-300">{t('reports.scope.specific_blocks', 'Blocks / Common Areas')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="unit"
                                                    checked={newReport.target_type === 'unit'}
                                                    onChange={() => setNewReport({ ...newReport, target_type: 'unit', target_blocks: [], block_id: '' })}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm dark:text-gray-300">{t('reports.scope.specific_unit', 'Specific Unit')}</span>
                                            </label>
                                        </div>

                                        {newReport.target_type === 'blocks' && (
                                            <div className="space-y-3">
                                                <HierarchicalBlockSelector
                                                    blocks={blocks.filter(block => (isAdminOrPres || (isVocal && vocalBlockIds?.includes(block.id)) || true))}
                                                    selectedBlocks={newReport.target_blocks || []}
                                                    onToggleBlock={handleToggleBlock}
                                                />

                                                {newReport.target_blocks?.length > 0 && (
                                                    <div className="mt-3 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 backdrop-blur-sm">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                                                {t('campaigns.selection_summary', 'Selection Summary')}
                                                            </h4>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewReport({ ...newReport, target_blocks: [] })}
                                                                className="text-[10px] text-gray-500 hover:text-red-500 transition-colors"
                                                            >
                                                                {t('common.clear_selection', 'Clear All')}
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                                            {newReport.target_blocks
                                                                .filter(id => {
                                                                    const block = blocks.find(b => b.id === id);
                                                                    if (!block) return true;
                                                                    return !block.parent_id || !newReport.target_blocks.includes(block.parent_id);
                                                                })
                                                                .map(id => (
                                                                    <span key={id} className="px-2 py-0.5 bg-white/60 dark:bg-neutral-800/60 text-[10px] rounded-full border border-indigo-100/50 dark:border-indigo-900/50 flex items-center gap-1 group whitespace-nowrap">
                                                                        {getBlockName(id)}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleBlock(id)}
                                                                            className="hover:text-red-500 font-bold ml-1"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                        </div>
                                                        <div className="mt-2 text-[10px] text-gray-500 italic">
                                                            {newReport.target_blocks.length} {t('campaigns.total_entities', 'total entities selected')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {newReport.target_type === 'unit' && (
                                            <div className="space-y-3 mt-2">
                                                {/* If Admin/Pres/Vocal -> Select Block then Unit */}
                                                {(isAdminOrPres || isVocal) ? (
                                                    <HierarchicalUnitSelector
                                                        blocks={blocks}
                                                        activeCommunity={activeCommunity}
                                                        allowEdit={false}
                                                        selectedUnitId={newReport.unit_id}
                                                        onSelectUnit={(unitId) => {
                                                            // Find block for unit
                                                            let foundBlockId = '';
                                                            for (const block of blocks) {
                                                                if (block.units?.some(u => u.id === unitId)) {
                                                                    foundBlockId = block.id;
                                                                    break;
                                                                }
                                                                // If nested logic needed? units are only on current block in my simpler logic.
                                                            }
                                                            // Actually, since flattened blocks array has units attached to each block object:
                                                            if (!foundBlockId) {
                                                                const ownerBlock = blocks.find(b => b.units?.some(u => u.id === unitId));
                                                                if (ownerBlock) foundBlockId = ownerBlock.id;
                                                            }

                                                            setNewReport({ ...newReport, unit_id: unitId, block_id: foundBlockId });
                                                        }}
                                                    />
                                                ) : (
                                                    /* Resident: Select from their own units */
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('reports.form.my_unit', 'My Unit')}</label>
                                                        <GlassSelect
                                                            value={newReport.unit_id}
                                                            onChange={(e) => setNewReport({ ...newReport, unit_id: e.target.value, block_id: userUnits.find(u => u.id === e.target.value)?.block_id || '' })}
                                                            options={[
                                                                { value: '', label: t('common.select', 'Select Unit...') },
                                                                ...userUnits.map(u => ({
                                                                    value: u.id,
                                                                    label: `${u.blocks?.name || ''} - ${u.unit_number}`
                                                                }))
                                                            ]}
                                                            required={newReport.target_type === 'unit'}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>

                                    {/* Optional Image */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('common.optional', 'Optional')}</label>
                                        <div className="flex items-center gap-4">
                                            <ImageUploader
                                                onImageSelected={(url) => setNewReport({ ...newReport, image_url: url })}
                                                disabled={!!newReport.image_url}
                                            />
                                            {newReport.image_url && (
                                                <div className="relative group">
                                                    <img
                                                        src={newReport.image_url}
                                                        alt="Preview"
                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-neutral-700"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewReport({ ...newReport, image_url: '' })}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                                        aria-label={t('common.delete')}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="glass-button-secondary"
                                        >
                                            {t('common.cancel', 'Cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className="glass-button relative flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            <span className={isCreating ? 'invisible' : ''}>{t('reports.form.submit', 'Submit Report')}</span>
                                            {isCreating && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    </div>

                                </form>
                            </div>
                        </div>
                    </ModalPortal>
                )
                }

                {/* Delete Confirmation Modal */}
                {/* Details Modal for Deep Linking / Selection */}
                {selectedReport && (
                    <ModalPortal>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => {
                            setSelectedReport(null);
                            setSearchParams({});
                        }}>
                            <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => {
                                        setSelectedReport(null);
                                        setSearchParams({});
                                    }}
                                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <ReportDetailsPanel
                                    report={selectedReport}
                                    onUpdate={fetchReports}
                                    blocks={blocks}
                                    userUnits={userUnits}
                                />
                            </div>
                        </div>
                    </ModalPortal>
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDeleteReport}
                    title={t('reports.delete_title', 'Delete Report?')}
                    message={t('reports.delete_confirm', 'Are you sure you want to delete this report? This cannot be undone.')}
                    isDangerous
                    isLoading={isDeleting}
                    cancelText={t('common.cancel', 'Cancel')}
                    confirmText={t('common.delete', 'Delete')}
                />
            </div >
        </DashboardLayout >
    );
};

export default Reports;
