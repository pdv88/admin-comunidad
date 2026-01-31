import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';
import PaymentUpload from '../components/payments/PaymentUpload';
import PaymentReviewModal from '../components/payments/PaymentReviewModal';
import FeeDetailsModal from '../components/payments/FeeDetailsModal';
import ModalPortal from '../components/ModalPortal';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';

const Maintenance = () => {
    const { t, i18n } = useTranslation();
    const { user, activeCommunity, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [fees, setFees] = useState([]);
    const [blocks, setBlocks] = useState([]); // State for block dropdown
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState('community'); // 'community' | 'personal'
    const [showFilters, setShowFilters] = useState(false); // Collapsible filters state

    // Admin Generation State
    const [genPeriod, setGenPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [genAmount, setGenAmount] = useState('50');
    const [generating, setGenerating] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [feeToDelete, setFeeToDelete] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Filters & Pagination State
    const [filters, setFilters] = useState({ page: 1, limit: 10, period: '', status: '', search: '', block: '', sortBy: 'period', sortOrder: 'desc' });
    const [sortConfig, setSortConfig] = useState({ key: 'period', direction: 'desc' });
    const [pagination, setPagination] = useState({ totalDocs: 0, totalPages: 1 });

    // Bulk Selection State
    const [selectedFees, setSelectedFees] = useState(new Set());
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState(null); // 'delete' | 'pay'

    // Fee Details Modal State
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedFeeDetails, setSelectedFeeDetails] = useState(null);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeCommunity) fetchFees();
        }, 500); // Debounce API calls for search/filters
        return () => clearTimeout(timer);
    }, [filters, activeTab, isAdmin, activeCommunity]); // Auto-fetch on filter change

    const handleReviewClick = (fee) => {
        setSelectedReviewId(fee.payment_id);
        setReviewModalOpen(true);
    };

    const handlePayClick = (fee) => {
        setSelectedFeeForPayment(fee);
        setPaymentModalOpen(true);
    };

    const handleDeleteClick = (fee) => {
        setFeeToDelete(fee);
        setDeleteModalOpen(true);
    };

    const handleResendEmail = async (fee) => {
        try {
            setToast({ message: t('maintenance.sending_email', 'Sending email...'), type: 'info' });
            const res = await fetch(`${API_URL}/api/maintenance/${fee.id}/email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });

            const data = await res.json();
            if (res.ok) {
                setToast({ message: t('maintenance.email_sent', 'Email sent successfully'), type: 'success' });
            } else {
                setToast({ message: t('maintenance.email_error', `Error: ${data.error}`), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: 'Network error', type: 'error' });
        }
    };

    const handleConfirmDelete = async () => {
        if (!feeToDelete) return;

        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/maintenance/${feeToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });

            if (res.ok) {
                setToast({ message: t('maintenance.delete_success', 'Fee deleted successfully'), type: 'success' });
                fetchFees();
            } else {
                const data = await res.json();
                setToast({ message: t('maintenance.delete_error', `Error deleting: ${data.error}`), type: 'error' });
            }
        } catch (error) {
            console.error("Delete error:", error);
            setToast({ message: 'Network error', type: 'error' });
        } finally {
            setActionLoading(false);
            setDeleteModalOpen(false);
            setFeeToDelete(null);
        }
    };

    // Bulk Selection Handlers
    const handleSelectFee = (feeId) => {
        setSelectedFees(prev => {
            const newSet = new Set(prev);
            if (newSet.has(feeId)) {
                newSet.delete(feeId);
            } else {
                newSet.add(feeId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        // Only select fees that can be deleted (not paid)
        const selectableFees = fees.filter(fee => fee.status !== 'paid' && !fee.payment_id);
        if (selectedFees.size === selectableFees.length) {
            setSelectedFees(new Set());
        } else {
            setSelectedFees(new Set(selectableFees.map(fee => fee.id)));
        }
    };

    const handleBulkAction = (action) => {
        setBulkAction(action);
        setBulkModalOpen(true);
    };

    const handleConfirmBulkAction = async () => {
        if (!bulkAction || selectedFees.size === 0) return;

        setActionLoading(true);
        try {
            const feeIds = Array.from(selectedFees);
            const endpoint = bulkAction === 'delete'
                ? `${API_URL}/api/maintenance/bulk`
                : `${API_URL}/api/maintenance/bulk/pay`;

            const res = await fetch(endpoint, {
                method: bulkAction === 'delete' ? 'DELETE' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                },
                body: JSON.stringify({ feeIds })
            });

            const data = await res.json();

            if (res.ok) {
                const successKey = bulkAction === 'delete'
                    ? 'maintenance.bulk_delete_success'
                    : 'maintenance.bulk_paid_success';
                setToast({
                    message: t(successKey, { count: data.count || selectedFees.size }),
                    type: 'success'
                });
                setSelectedFees(new Set());
                fetchFees();
            } else {
                setToast({ message: data.error || 'Error processing request', type: 'error' });
            }
        } catch (error) {
            console.error("Bulk action error:", error);
            setToast({ message: 'Network error', type: 'error' });
        } finally {
            setActionLoading(false);
            setBulkModalOpen(false);
            setBulkAction(null);
        }
    };

    // Clear selection when filters/page change
    useEffect(() => {
        setSelectedFees(new Set());
    }, [filters, activeTab]);

    useEffect(() => {
        if (!authLoading && activeCommunity) {
            const rawRole = activeCommunity?.roles;
            // Handle Supabase returning array (1-to-many inference) or object (1-to-1)
            const roleName = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;

            console.log("Maintenance: Role Check", {
                roleName,
                rawRole,
                isAdminCalc: ['admin', 'president', 'treasurer'].includes(roleName)
            });

            const adminRole = ['super_admin', 'admin', 'president', 'treasurer'].includes(roleName);
            setIsAdmin(adminRole);

            const hasUnits = activeCommunity?.unit_owners?.length > 0;

            // If not admin and trying to view community, force personal
            if (!adminRole && activeTab === 'community') {
                console.log("Maintenance: Unauthorized for community view, switching to personal.");
                setActiveTab('personal');
            }

            // If admin but NO units, force community (cannot view personal)
            if (adminRole && !hasUnits && activeTab === 'personal') {
                console.log("Maintenance: Admin has no units, switching to community view.");
                setActiveTab('community');
            }
        }
    }, [activeCommunity, user, authLoading, activeTab]); // Added activeTab to dependency array to catch state changes

    // Fetch when relevant state changes (tab or admin status)
    useEffect(() => {
        if (activeCommunity) {
            fetchFees();
            fetchBlocks();
        }
    }, [activeTab, isAdmin, activeCommunity]);

    const fetchFees = async () => {
        if (!activeCommunity) return;

        setLoading(true);
        try {
            // Calculate role immediately to avoid state lag from useEffect
            const rawRole = activeCommunity?.roles;
            const roleName = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;
            const isUserAdmin = ['super_admin', 'admin', 'president', 'treasurer'].includes(roleName);

            // Ensure UI state matches (optional sync)
            if (isUserAdmin !== isAdmin) setIsAdmin(isUserAdmin);

            const baseUrl = `${API_URL}/api/maintenance`;
            let endpoint;

            if (isUserAdmin && activeTab === 'community') {
                // Admin View: Use Status endpoint with params
                const params = new URLSearchParams({
                    page: filters.page,
                    limit: filters.limit,
                    sortBy: filters.sortBy,
                    sortOrder: filters.sortOrder,
                    ...(filters.period && { period: filters.period }),
                    ...(filters.status && { status: filters.status }),
                    ...(filters.search && { search: filters.search }), // Unit search
                    ...(filters.block && { block: filters.block }),
                });
                endpoint = `${baseUrl}/status?${params.toString()}`;
            } else {
                // Personal View: Use My Statement (currently no filtering implemented on backend for this, but could be added later)
                endpoint = `${baseUrl}/my-statement`;
            }

            const res = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (isUserAdmin && activeTab === 'community') {
                    // Expect { data, page, totalPages, totalCount }
                    setFees(data.data || []);
                    setPagination({
                        totalPages: data.totalPages || 1,
                        totalCount: data.totalCount || 0
                    });
                } else {
                    // Personal view returns direct array
                    setFees(Array.isArray(data) ? data : []);
                }
            } else {
                const errorData = await res.json();
                setToast({ message: errorData.error || t('common.error_fetching_data', 'Error fetching data'), type: 'error' });
            }
        } catch (error) {
            console.error("Error fetching fees:", error);
            setToast({ message: t('common.network_error', 'Network error'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Export to Excel (CSV)
    const handleExport = async () => {
        if (!activeCommunity) return;

        try {
            // Fetch all records (high limit)
            const queryParams = new URLSearchParams({
                page: 1,
                limit: 10000,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder
            });

            if (filters.period) queryParams.append('period', filters.period);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.block) queryParams.append('block', filters.block);

            const res = await fetch(`${API_URL}/api/maintenance/status?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });

            if (res.ok) {
                const { data } = await res.json();

                if (!data || data.length === 0) {
                    setToast({ message: t('maintenance.no_records_export', 'No records to export.'), type: 'error' });
                    return;
                }

                // CSV Headers with BOM for Excel compatibility
                const BOM = '\uFEFF';
                let csvContent = BOM + "Period;Unit;Block;Owner;Amount;Status;Paid Date\n";

                data.forEach(item => {
                    const row = [
                        item.period,
                        item.unit_number || '',
                        item.block_name || '',
                        item.owner_name || '',
                        Number(item.amount).toFixed(2),
                        item.status,
                        item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ''
                    ].join(';');
                    csvContent += row + "\n";
                });

                // Trigger Download
                const communityName = (activeCommunity?.name || 'community').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `maintenance_fees_${communityName}_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const errorData = await res.json();
                setToast({ message: errorData.error || t('common.error_exporting_data', 'Error exporting data'), type: 'error' });
            }
        } catch (error) {
            console.error("Export error:", error);
            setToast({ message: t('common.error_occurred', 'An error occurred'), type: 'error' });
        }
    };

    // Fetch Blocks for Dropdown
    const fetchBlocks = async () => {
        if (!activeCommunity) return;
        try {
            const res = await fetch(`${API_URL}/api/properties/blocks`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });
            if (res.ok) {
                const data = await res.json();
                setBlocks(data);
            } else {
                const errorData = await res.json();
                setToast({ message: errorData.error || t('common.error_fetching_blocks', 'Error fetching blocks'), type: 'error' });
            }
        } catch (error) {
            console.error("Error fetching blocks:", error);
            setToast({ message: t('common.network_error', 'Network error'), type: 'error' });
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
    };

    const handleSort = (key) => {
        setFilters(prev => ({
            ...prev,
            page: 1,
            sortBy: key,
            sortOrder: prev.sortBy === key && prev.sortOrder === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setFilters(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/maintenance/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Community-ID': activeCommunity.community_id
                },
                body: JSON.stringify({ period: `${genPeriod}-01`, amount: parseFloat(genAmount) })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.count === 0) {
                    setToast({ message: t('maintenance.warning_gen_zero', 'Warning: No new fees generated. All occupied units may already be billed for this period.'), type: 'warning' });
                } else {
                    setToast({ message: t('maintenance.success_gen', `Success: Generated ${data.count} fees successfully.`), type: 'success' });
                }
                fetchFees();
            } else {
                if (data.error === 'NO_OCCUPIED_UNITS') {
                    setToast({ message: t('maintenance.error_no_users', 'There are no users to generate fees to.'), type: 'error' });
                } else {
                    setToast({ message: t('maintenance.error_gen', `Error: ${data.error}`), type: 'error' });
                }
            }
        } catch (error) {
            console.error(error);
            setToast({ message: 'Network error', type: 'error' });
        } finally {
            setGenerating(false);
        }
    };

    const getStatusColor = (status, paymentId) => {
        if (status === 'pending' && paymentId) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const hasUnits = activeCommunity?.unit_owners?.length > 0;

    return (
        <DashboardLayout>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {t('maintenance.title', 'Maintenance Fees')}
                    </h1>

                    {/* Tab Switcher for Admins (Only if they have units) */}
                    {isAdmin && hasUnits && (
                        <div className="p-1 rounded-full flex items-center backdrop-blur-md bg-white/30 border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10">
                            <button
                                onClick={() => setActiveTab('community')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'community'
                                    ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'
                                    }`}
                            >
                                {t('maintenance.tab_community', 'Community Management')}
                            </button>
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'personal'
                                    ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'
                                    }`}
                            >
                                {t('maintenance.tab_personal', 'My Statement')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Admin Generator Section */}
                {isAdmin && activeTab === 'community' && (
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t('maintenance.generate_title', 'Generate Monthly Fees')}</h2>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('maintenance.period', 'Billing Period')}</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="glass-input flex-1"
                                            value={genPeriod.split('-')[1] || '01'}
                                            onChange={(e) => setGenPeriod(`${genPeriod.split('-')[0]}-${e.target.value}`)}
                                            required
                                        >
                                            {Array.from({ length: 12 }, (_, i) => {
                                                const monthNum = String(i + 1).padStart(2, '0');
                                                const monthName = new Date(2024, i, 1).toLocaleDateString(i18n.language, { month: 'long' });
                                                return (
                                                    <option key={monthNum} value={monthNum} className="capitalize">
                                                        {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <select
                                            className="glass-input w-24"
                                            value={genPeriod.split('-')[0] || new Date().getFullYear()}
                                            onChange={(e) => setGenPeriod(`${e.target.value}-${genPeriod.split('-')[1] || '01'}`)}
                                            required
                                        >
                                            {Array.from({ length: 5 }, (_, i) => {
                                                const year = new Date().getFullYear() - 1 + i;
                                                return <option key={year} value={year}>{year}</option>;
                                            })}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('maintenance.amount', 'Amount')}</label>
                                    <input
                                        type="number"
                                        className="glass-input w-full"
                                        value={genAmount}
                                        onChange={(e) => setGenAmount(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={generating}
                                className="glass-button w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                {generating ? t('common.processing', 'Generating...') : t('maintenance.generate_btn', 'Generate Bills')}
                            </button>
                        </form>
                    </div>
                )}

                {/* Filters & Fee List */}
                <div className="glass-card p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {isAdmin && activeTab === 'community'
                                ? t('maintenance.community_status', 'Community Status')
                                : t('maintenance.history', 'Payment History')}
                        </h2>

                        {/* Filters Toggle & Export (Admin Only) */}
                        {isAdmin && activeTab === 'community' && (
                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                        title={t('common.export_excel', 'Export to Excel')}
                                        aria-label={t('common.export_excel', 'Export to Excel')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        <span className="hidden sm:inline">{t('common.export', 'Export')}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                        </svg>
                                        {showFilters ? t('common.hide_filters', 'Hide Filters') : t('common.show_filters', 'Filter Data')}
                                    </button>
                                </div>

                            </div>
                        )}

                    </div>

                    {/* Collapsible Full Width Filters */}
                    {isAdmin && activeTab === 'community' && showFilters && (
                        <div className="w-full animate-fadeIn mb-6 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-gray-100 dark:border-white/10">
                            <div className="flex flex-wrap gap-4 items-end">
                                {/* Block Filter */}
                                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        {t('maintenance.block', 'Block')}
                                    </label>
                                    <select
                                        className="glass-input text-sm py-2 px-3 w-full"
                                        value={filters.block || ''}
                                        onChange={(e) => handleFilterChange('block', e.target.value)}
                                    >
                                        <option value="">{t('common.all_blocks', 'All Blocks')}</option>
                                        {blocks.map(block => (
                                            <option key={block.id} value={block.name}>{block.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Unit Search */}
                                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        {t('maintenance.unit', 'Unit')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={t('common.search_unit', 'Search Unit...')}
                                        className="glass-input text-sm py-2 px-3 w-full"
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                    />
                                </div>

                                {/* Period Filter */}
                                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        {t('maintenance.period', 'Period')}
                                    </label>
                                    <input
                                        type="month"
                                        className="glass-input text-sm py-2 px-3 w-full"
                                        value={filters.period}
                                        onChange={(e) => handleFilterChange('period', e.target.value)}
                                    />
                                </div>

                                {/* Status Filter */}
                                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        {t('maintenance.status', 'Status')}
                                    </label>
                                    <select
                                        className="glass-input text-sm py-2 px-3 w-full"
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        <option value="">{t('common.all_statuses', 'All Statuses')}</option>
                                        <option value="paid">{t('maintenance.statuses.paid', 'Paid')}</option>
                                        <option value="pending">{t('maintenance.statuses.pending', 'Pending')}</option>
                                        <option value="overdue">{t('maintenance.statuses.overdue', 'Overdue')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}




                    {loading ? (
                        <GlassLoader />
                    ) : (
                        <div className="overflow-x-auto">
                            {/* Bulk Action Bar */}
                            {isAdmin && activeTab === 'community' && selectedFees.size > 0 && (
                                <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between gap-4 flex-wrap">
                                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                        {t('maintenance.selected_count', { count: selectedFees.size })}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleBulkAction('pay')}
                                            disabled={actionLoading}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {t('maintenance.bulk_mark_paid', 'Mark as Paid')}
                                        </button>
                                        <button
                                            onClick={() => handleBulkAction('delete')}
                                            disabled={actionLoading}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            {t('maintenance.bulk_delete', 'Delete Selected')}
                                        </button>
                                        <button
                                            onClick={() => setSelectedFees(new Set())}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                                        >
                                            {t('maintenance.clear_selection', 'Clear')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <table className="glass-table">
                                <thead>
                                    <tr>
                                        {/* Checkbox Column for Admin Community View */}
                                        {isAdmin && activeTab === 'community' && (
                                            <th className="w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={fees.filter(f => f.status !== 'paid' && !f.payment_id).length > 0 && selectedFees.size === fees.filter(f => f.status !== 'paid' && !f.payment_id).length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-neutral-700"
                                                    title={t('common.select_all', 'Select All')}
                                                />
                                            </th>
                                        )}
                                        <th
                                            onClick={() => activeTab === 'community' && handleSort('period')}
                                            className={`transition-colors ${activeTab === 'community' ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {t('maintenance.period', 'Period')}
                                                {activeTab === 'community' && filters.sortBy === 'period' && (
                                                    <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th>
                                            <div className="flex items-center gap-1">
                                                {t('maintenance.block', 'Block')}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => activeTab === 'community' && handleSort('unit')}
                                            className={`transition-colors ${activeTab === 'community' ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {t('maintenance.unit', 'Unit')}
                                                {activeTab === 'community' && filters.sortBy === 'unit' && (
                                                    <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        {isAdmin && activeTab === 'community' && <th>{t('maintenance.owner', 'Owner')}</th>}
                                        <th
                                            onClick={() => activeTab === 'community' && handleSort('amount')}
                                            className={`transition-colors ${activeTab === 'community' ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {t('maintenance.amount', 'Amount')}
                                                {activeTab === 'community' && filters.sortBy === 'amount' && (
                                                    <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => activeTab === 'community' && handleSort('status')}
                                            className={`transition-colors ${activeTab === 'community' ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {t('maintenance.status', 'Status')}
                                                {activeTab === 'community' && filters.sortBy === 'status' && (
                                                    <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th className="text-right">{t('common.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fees.map(fee => (
                                        <tr key={fee.id} className={selectedFees.has(fee.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}>
                                            {/* Checkbox Cell for Admin Community View */}
                                            {isAdmin && activeTab === 'community' && (
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFees.has(fee.id)}
                                                        onChange={() => handleSelectFee(fee.id)}
                                                        disabled={fee.status === 'paid' || !!fee.payment_id}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-neutral-700"
                                                        title={fee.status === 'paid' || fee.payment_id ? t('maintenance.cannot_select_paid', 'Cannot select fee with payment') : ''}
                                                    />
                                                </td>
                                            )}
                                            <td className="text-gray-900 dark:text-white capitalize">
                                                {(() => {
                                                    const date = new Date(fee.period + 'T12:00:00');
                                                    const month = date.toLocaleDateString(i18n.language, { month: 'long', timeZone: 'UTC' });
                                                    const year = date.toLocaleDateString(i18n.language, { year: 'numeric', timeZone: 'UTC' });
                                                    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
                                                })()}
                                            </td>
                                            <td className="text-gray-500 dark:text-neutral-400">
                                                {fee.block_name || fee.units?.blocks?.name || '-'}
                                            </td>
                                            <td className="text-gray-900 font-medium dark:text-white">
                                                {fee.unit_number || fee.units?.unit_number}
                                            </td>
                                            {isAdmin && activeTab === 'community' && (
                                                <td className="text-gray-500 dark:text-neutral-400">
                                                    {fee.owner_name}
                                                </td>
                                            )}
                                            <td className="text-gray-900 dark:text-white">
                                                {fee.amount}
                                            </td>
                                            <td>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status, fee.payment_id)}`}>
                                                    {(fee.status === 'pending' && fee.payment_id)
                                                        ? t('maintenance.statuses.processing', 'Processing')
                                                        : (t(`maintenance.statuses.${fee.status}`, fee.status))}
                                                </span>
                                            </td>
                                            <td className="text-right font-medium">
                                                {/* Review Button (Admin Community View + Pending + HAS payment_id) */}
                                                {isAdmin && activeTab === 'community' && fee.status === 'pending' && fee.payment_id && (
                                                    <button
                                                        onClick={() => handleReviewClick(fee)}
                                                        className="mr-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-md border border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30 dark:hover:bg-indigo-500/30 transition-colors"
                                                        title={t('maintenance.review', 'Review Payment')}
                                                    >
                                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                                        {t('common.review', 'Review')}
                                                    </button>
                                                )}

                                                {/* Record Payment Button (Admin Community View + Pending + NO payment_id) */}
                                                {isAdmin && activeTab === 'community' && fee.status === 'pending' && !fee.payment_id && (
                                                    <button
                                                        onClick={() => handlePayClick(fee)}
                                                        className="mr-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-md border border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30 dark:hover:bg-emerald-500/30 transition-colors"
                                                        title={t('maintenance.record_payment', 'Record Payment')}
                                                    >
                                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {t('maintenance.register', 'Register')}
                                                    </button>
                                                )}

                                                {/* Info Button (Admin Community View) */}
                                                {isAdmin && activeTab === 'community' && (
                                                    <button
                                                        onClick={() => { setSelectedFeeDetails(fee); setDetailsModalOpen(true); }}
                                                        className="mr-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                                                        title={t('maintenance.view_details', 'View Details')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Resend Email Button (Admin Community View) */}
                                                {isAdmin && activeTab === 'community' && (
                                                    <button
                                                        onClick={() => handleResendEmail(fee)}
                                                        className="mr-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 transition-colors inline-flex items-center"
                                                        title={t('maintenance.resend_email', 'Resend Email')}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Delete Button (Admin Community View) - Disabled if payment registered */}
                                                {isAdmin && activeTab === 'community' && (
                                                    <button
                                                        onClick={() => handleDeleteClick(fee)}
                                                        disabled={fee.status === 'paid' || !!fee.payment_id}
                                                        className={`transition-colors ${fee.status === 'paid' || fee.payment_id
                                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                            : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                                            }`}
                                                        title={fee.status === 'paid' || fee.payment_id ? t('maintenance.cannot_delete_paid', 'Cannot delete paid fee') : t('common.delete', 'Delete')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Pay Button (My Statement View + Pending/Overdue + NO payment_id) */}
                                                {activeTab !== 'community' && (fee.status === 'pending' || fee.status === 'overdue') && !fee.payment_id && (
                                                    <button
                                                        onClick={() => handlePayClick(fee)}
                                                        className="inline-flex items-center px-4 py-1.5 text-xs font-medium rounded-full shadow-lg backdrop-blur-md bg-green-600/80 hover:bg-green-600 border border-green-500/50 text-white transition-all transform hover:scale-105"
                                                    >
                                                        {t('maintenance.pay', 'Pay')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {fees.length === 0 && <p className="text-center py-4 text-gray-500">{t('maintenance.no_records', 'No records found.')}</p>}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {isAdmin && activeTab === 'community' && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t('common.page', 'Page')} {filters.page} {t('common.of', 'of')} {pagination.totalPages} ({pagination.totalCount} {t('common.total', 'total')})
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(filters.page - 1)}
                                    disabled={filters.page === 1}
                                    className="px-4 py-2 text-sm font-medium rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-gray-700 dark:text-gray-200 hover:bg-white/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    {t('common.prev', 'Previous')}
                                </button>
                                <button
                                    onClick={() => handlePageChange(filters.page + 1)}
                                    disabled={filters.page === pagination.totalPages}
                                    className="px-4 py-2 text-sm font-medium rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-gray-700 dark:text-gray-200 hover:bg-white/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    {t('common.next', 'Next')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('maintenance.delete_title', 'Delete Maintenance Fee')}
                    message={t('maintenance.delete_confirm', 'Are you sure you want to delete this fee? This action cannot be undone.')}
                    confirmText={t('common.delete', 'Delete')}
                    isDangerous={true}
                    isLoading={actionLoading}
                />

                {/* Bulk Action Confirmation Modal */}
                <ConfirmationModal
                    isOpen={bulkModalOpen}
                    onClose={() => { setBulkModalOpen(false); setBulkAction(null); }}
                    onConfirm={handleConfirmBulkAction}
                    title={bulkAction === 'delete'
                        ? t('maintenance.bulk_delete_title', 'Delete Selected Fees')
                        : t('maintenance.bulk_paid_title', 'Mark Fees as Paid')}
                    message={bulkAction === 'delete'
                        ? t('maintenance.bulk_delete_confirm', 'Are you sure you want to delete {{count}} fee(s)? This action cannot be undone.').replace('{{count}}', selectedFees.size)
                        : t('maintenance.bulk_paid_confirm', 'Mark {{count}} fee(s) as paid?').replace('{{count}}', selectedFees.size)}
                    confirmText={bulkAction === 'delete'
                        ? t('common.delete', 'Delete')
                        : t('maintenance.confirm_paid', 'Mark as Paid')}
                    isDangerous={bulkAction === 'delete'}
                    isLoading={actionLoading}
                />

                {/* Payment Upload Modal */}
                {paymentModalOpen && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-lg">
                                <PaymentUpload
                                    onSuccess={() => {
                                        setPaymentModalOpen(false);
                                        fetchFees(); // Refresh status
                                        setToast({ message: t('payment.success', 'Payment uploaded successfully'), type: 'success' });
                                    }}
                                    onCancel={() => setPaymentModalOpen(false)}
                                    // Pass pre-filled data
                                    initialType="maintenance"
                                    initialFeeId={selectedFeeForPayment?.id}
                                    initialAmount={selectedFeeForPayment?.amount}
                                    initialUnitId={selectedFeeForPayment?.unit_id} // If available in fee object? Yes, usually.
                                    isAdmin={isAdmin}
                                />
                            </div>
                        </div>
                    </ModalPortal>
                )}

                <PaymentReviewModal
                    isOpen={reviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    paymentId={selectedReviewId}
                    onConfirm={() => {
                        setToast({ message: t('maintenance.payment_confirmed', 'Payment confirmed successfully'), type: 'success' });
                        fetchFees();
                    }}
                    onReject={() => {
                        setToast({ message: t('maintenance.payment_rejected', 'Payment rejected'), type: 'info' });
                        fetchFees();
                    }}
                />

                <FeeDetailsModal
                    isOpen={detailsModalOpen}
                    onClose={() => { setDetailsModalOpen(false); setSelectedFeeDetails(null); }}
                    fee={selectedFeeDetails}
                    onUpdate={(toast) => {
                        setToast(toast);
                        fetchFees();
                    }}
                />
            </div>
        </DashboardLayout>
    );
};

export default Maintenance;
