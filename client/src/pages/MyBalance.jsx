import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import PaymentUpload from '../components/payments/PaymentUpload';
import ModalPortal from '../components/ModalPortal';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';

import { useSearchParams } from 'react-router-dom';

const MyBalance = () => {
    const { t, i18n } = useTranslation();
    const { activeCommunity } = useAuth();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState([]);
    const [blocks, setBlocks] = useState([]); // Store blocks for hierarchy resolving
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'monthly'); // 'monthly' or 'extraordinary'
    const [showFilters, setShowFilters] = useState(false);

    // Filters & Pagination State
    const [filters, setFilters] = useState({ page: 1, limit: 10, period: '', status: '' });
    const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);

    // Debounce Fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeCommunity) fetchFees();
        }, 300);
        return () => clearTimeout(timer);
    }, [filters, activeTab, activeCommunity]);

    // Reset filters when tab changes
    useEffect(() => {
        setFilters({ page: 1, limit: 10, period: '', status: '' });
    }, [activeTab]);

    // Fetch blocks on mount for hierarchy resolution
    useEffect(() => {
        if (activeCommunity) {
            fetchBlocks();
        }
    }, [activeCommunity]);

    const fetchBlocks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/properties/blocks?simple=true`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });
            if (res.ok) {
                const data = await res.json();
                setBlocks(data);
            }
        } catch (error) {
            console.error("Error fetching blocks:", error);
        }
    };

    const fetchFees = async () => {
        if (!activeCommunity) return;

        setLoading(true);
        try {
            const feeType = activeTab === 'monthly' ? 'maintenance' : 'extraordinary';
            const params = new URLSearchParams({
                type: feeType,
                page: filters.page,
                limit: filters.limit,
                ...(filters.status && { status: filters.status }),
                ...(filters.period && { period: filters.period })
            });

            const res = await fetch(`${API_URL}/api/maintenance/my-statement?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });

            if (res.ok) {
                const data = await res.json();
                setFees(data.data || []);
                setPagination({
                    totalPages: data.totalPages || 1,
                    totalCount: data.totalCount || 0
                });
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

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset page on filter change
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setFilters(prev => ({ ...prev, page: newPage }));
        }
    };

    const handlePayClick = (fee) => {
        setSelectedFeeForPayment(fee);
        setPaymentModalOpen(true);
    };

    const calculateEffectiveStatus = (fee, isExtraordinary) => {
        if (fee.status === 'paid') return 'paid';
        if (fee.status === 'pending' && fee.payment_id) return 'processing';
        if (fee.status === 'overdue') return 'overdue';

        if (fee.status === 'pending') {
            const now = new Date();
            let dueDate = null;

            if (isExtraordinary && fee.campaigns?.deadline) {
                dueDate = new Date(fee.campaigns.deadline);
            } else if (!isExtraordinary && fee.period) {
                // For monthly fees, assume due date is end of the month + grace period? 
                // Or simply if we are in the next month.
                // Let's say if current date is > last day of fee.period month
                const [year, month] = fee.period.split('-');
                // Create date for 1st of next month
                dueDate = new Date(Date.UTC(parseInt(year), parseInt(month), 1));
            }

            if (dueDate && now > dueDate) {
                return 'overdue';
            }
        }

        return fee.status;
    };

    // Helper to resolve full block path recursively
    const getBlockPath = (blockId) => {
        if (!blockId || !Array.isArray(blocks)) return '-';

        const block = blocks.find(b => b.id === blockId);
        if (!block) return '-';

        let path = block.name;
        let currentParentId = block.parent_id;

        // Safety counter to prevent infinite loops
        let depth = 0;
        const maxDepth = 10;

        while (currentParentId && depth < maxDepth) {
            const parent = blocks.find(b => b.id === currentParentId);
            if (parent) {
                path = `${parent.name} > ${path}`;
                currentParentId = parent.parent_id;
            } else {
                break;
            }
            depth++;
        }

        return path;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const renderFeeTable = (feeList, isExtraordinary = false) => (
        <div className="overflow-x-auto">
            <table className="glass-table">
                <thead>
                    <tr>
                        {/* First column differs by type */}
                        <th>{isExtraordinary ? t('common.description', 'Description') : t('maintenance.period', 'Period')}</th>
                        <th>{t('maintenance.block', 'Block')}</th>
                        <th>{t('maintenance.unit', 'Unit')}</th>
                        <th>{t('maintenance.amount', 'Amount')}</th>
                        {/* Due Date only for extraordinary */}
                        {isExtraordinary && <th>{t('maintenance.due_date', 'Due Date')}</th>}
                        <th>{t('maintenance.status', 'Status')}</th>
                        <th>{t('maintenance.paid_date', 'Paid Date')}</th>
                        <th className="text-right">{t('common.actions', 'Actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {feeList.map(fee => {
                        const effectiveStatus = calculateEffectiveStatus(fee, isExtraordinary);
                        return (
                            <tr key={fee.id}>
                                {/* First column: Period for Maintenance, Description for Extraordinary */}
                                <td className="text-gray-900 dark:text-white font-medium capitalize">
                                    {isExtraordinary
                                        ? (fee.campaigns?.name || t('dashboard_layout.extraordinary_fee', 'Extraordinary Fee'))
                                        : (() => {
                                            if (!fee.period) return '-';
                                            const date = new Date(fee.period + 'T12:00:00');
                                            const month = date.toLocaleDateString(i18n.language, { month: 'long', timeZone: 'UTC' });
                                            const year = date.toLocaleDateString(i18n.language, { year: 'numeric', timeZone: 'UTC' });
                                            return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
                                        })()
                                    }
                                </td>
                                <td>
                                    {fee.units?.block_id ? getBlockPath(fee.units.block_id) : '-'}
                                </td>
                                <td className="text-gray-900 font-medium dark:text-white">
                                    {fee.unit_number || fee.units?.unit_number}
                                </td>
                                <td className="text-gray-900 dark:text-white">
                                    {fee.amount}
                                </td>
                                {/* Due Date only for extraordinary */}
                                {isExtraordinary && (
                                    <td className="text-gray-900 dark:text-white">
                                        {fee.campaigns?.deadline
                                            ? new Date(fee.campaigns.deadline).toLocaleDateString(i18n.language)
                                            : '-'}
                                    </td>
                                )}
                                <td>
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(effectiveStatus)}`}>
                                        {t(`maintenance.statuses.${effectiveStatus}`, effectiveStatus)}
                                    </span>
                                </td>
                                <td className="text-gray-600 dark:text-neutral-400 text-sm">
                                    {(fee.payment_date || fee.payments?.payment_date)
                                        ? new Date(fee.payment_date || fee.payments?.payment_date).toLocaleDateString(i18n.language)
                                        : '-'}
                                </td>
                                <td className="text-right font-medium">
                                    {(fee.status === 'pending' || fee.status === 'overdue') && !fee.payment_id && (
                                        <button
                                            onClick={() => handlePayClick(fee)}
                                            className="inline-flex items-center px-4 py-1.5 text-xs font-medium rounded-full shadow-lg backdrop-blur-md bg-green-600/80 hover:bg-green-600 border border-green-500/50 text-white transition-all transform hover:scale-105"
                                        >
                                            {t('maintenance.pay', 'Pay')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {feeList.length === 0 && (
                        <tr>
                            <td colSpan={isExtraordinary ? "8" : "7"} className="text-center py-4 text-gray-500">
                                {t('maintenance.no_records', 'No records found.')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <DashboardLayout>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {t('maintenance.tab_personal', 'My Statement')}
                    </h1>
                </div>

                {/* Tabs & Filter Toggle */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex bg-white/30 backdrop-blur-md border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10 p-1 rounded-full w-fit items-center">
                        <button
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'monthly'
                                ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                            onClick={() => setActiveTab('monthly')}
                        >
                            {t('maintenance.tab_monthly', 'Monthly Fees')}
                        </button>
                        <button
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'extraordinary'
                                ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                            onClick={() => setActiveTab('extraordinary')}
                        >
                            {t('maintenance.tab_extraordinary', 'Extraordinary Fees')}
                        </button>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`glass-button-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-blue-500/50' : ''}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {t('common.filters', 'Filters')}
                    </button>
                </div>

                {/* Collapsible Filters */}
                {showFilters && (
                    <div className="w-full animate-fadeIn p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg border border-gray-100 dark:border-white/10">
                        <div className="flex flex-wrap gap-4 items-end">
                            {/* Period Filter (only for monthly fees) */}
                            {activeTab === 'monthly' && (
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
                            )}

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

                            {/* Clear Filters Button */}
                            <button
                                onClick={() => setFilters({ page: 1, limit: 10, period: '', status: '' })}
                                className="glass-button-secondary text-sm py-2 px-4"
                            >
                                {t('common.clear_filters', 'Clear')}
                            </button>
                        </div>
                    </div>
                )}

                <div className="glass-card p-6">
                    {loading ? (
                        <GlassLoader />
                    ) : (
                        <>
                            {renderFeeTable(fees, activeTab === 'extraordinary')}

                            {/* Pagination Controls */}
                            {pagination.totalPages > 1 && (
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
                        </>
                    )}
                </div>

                {/* Payment Upload Modal */}
                {paymentModalOpen && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-lg">
                                <PaymentUpload
                                    onSuccess={() => {
                                        setPaymentModalOpen(false);
                                        fetchFees();
                                        setToast({ message: t('payment.success', 'Payment uploaded successfully'), type: 'success' });
                                    }}
                                    onCancel={() => setPaymentModalOpen(false)}
                                    initialType={activeTab === 'monthly' ? 'maintenance' : 'extraordinary'}
                                    initialFeeId={selectedFeeForPayment?.id}
                                    initialAmount={selectedFeeForPayment?.amount}
                                    initialUnitId={selectedFeeForPayment?.unit_id}
                                    isAdmin={false}
                                />
                            </div>
                        </div>
                    </ModalPortal>
                )}
            </div>
        </DashboardLayout>
    );
};

export default MyBalance;
