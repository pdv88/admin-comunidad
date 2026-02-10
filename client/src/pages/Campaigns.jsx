import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import CampaignProgress from '../components/payments/CampaignProgress';
import DashboardLayout from '../components/DashboardLayout';
import ModalPortal from '../components/ModalPortal';
import PaymentUpload from '../components/payments/PaymentUpload';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';
import { getCurrencySymbol } from '../utils/currencyUtils';
import HierarchicalBlockSelector from '../components/HierarchicalBlockSelector';

const CampaignsContent = () => {
    const { t } = useTranslation();
    const { user, activeCommunity, hasAnyRole } = useAuth();
    const isAdmin = hasAnyRole(['super_admin', 'admin', 'president', 'treasurer']);
    const canCreate = hasAnyRole(['super_admin', 'admin', 'president', 'treasurer', 'vocal']);
    const isVocal = hasAnyRole(['vocal']);

    const vocalBlocks = activeCommunity?.roles
        ?.filter(r => r.name === 'vocal' && r.block_id)
        .map(r => r.block_id) || [];

    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('active'); // 'all' | 'active' | 'closed'

    // Form State
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('');
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [showCreateForm, setShowCreateForm] = useState(false);

    const [createError, setCreateError] = useState('');

    // Targeting State
    const [availableBlocks, setAvailableBlocks] = useState([]);
    const [targetType, setTargetType] = useState('all'); // 'all' or 'blocks'
    const [selectedBlocks, setSelectedBlocks] = useState([]); // Array of block IDs
    const [isMandatory, setIsMandatory] = useState(false);
    const [calculationMethod, setCalculationMethod] = useState('fixed'); // 'fixed' | 'coefficient'
    const [amountPerUnit, setAmountPerUnit] = useState('');

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Fee Calculation State
    const [showBreakdown, setShowBreakdown] = useState(false);

    // Memoized calculation of affected units to prevent performance issues
    const affectedUnits = useMemo(() => {
        if (!availableBlocks.length) return [];

        // Helper to resolve full block path
        const getBlockPath = (blockId) => {
            let path = [];
            let current = availableBlocks.find(b => b.id === blockId);

            while (current) {
                path.unshift(current.name);
                current = availableBlocks.find(b => b.id === current.parent_id);
            }
            return path.join(' / ');
        };

        const extractUnits = (blocks) => {
            let units = [];
            blocks.forEach(block => {
                if (block.units && block.units.length > 0) {
                    const fullPath = getBlockPath(block.id);
                    // Include all units regardless of ownership for correct coefficient calculation
                    const allUnits = block.units;

                    units = [...units, ...allUnits.map(u => ({
                        ...u,
                        block_name: fullPath
                    }))];
                }
            });
            return units;
        };

        if (targetType === 'all') {
            return extractUnits(availableBlocks);
        } else {
            // Filter availableBlocks to only those selected
            // Note: selectedBlocks contains IDs. We need to find the full block objects.
            const selectedBlockObjects = availableBlocks.filter(b => selectedBlocks.includes(b.id));
            return extractUnits(selectedBlockObjects);
        }
    }, [availableBlocks, targetType, selectedBlocks]);

    const totalUnits = affectedUnits.length;
    // const totalBlocks = targetType === 'all' ? availableBlocks.length : selectedBlocks.length;

    const calculatedFee = useMemo(() => {
        if (!isMandatory) return 0;

        if (calculationMethod === 'fixed') {
            return amountPerUnit ? parseFloat(amountPerUnit) : 0;
        } else {
            // Coefficient based
            // This is an estimation for preview since real calculation involves individual coefficients.
            // We just show average here or maybe handling later.
            // For now, let's keep the logic simple: Total / Units for basic preview, 
            // but the breakdown table needs to be smarter if we want to show exact amounts.
            return (goal && totalUnits > 0) ? (parseFloat(goal) / totalUnits) : 0;
        }
    }, [isMandatory, calculationMethod, amountPerUnit, goal, totalUnits]);

    // Calculate individual fee distribution for coefficient method
    const feeDistribution = useMemo(() => {
        if (!isMandatory || calculationMethod !== 'coefficient' || !goal || totalUnits === 0) {
            return {};
        }

        const targetAmount = parseFloat(goal);

        // 1. Sum total coefficient of affected units
        const unitsWithCoeff = affectedUnits.map(u => ({ ...u, coeff: parseFloat(u.coefficient) || 0 }));
        const totalCoeff = unitsWithCoeff.reduce((sum, u) => sum + u.coeff, 0);

        const distribution = {};

        if (totalCoeff === 0) {
            // Fallback: Equal split
            const equalShare = targetAmount / totalUnits;
            affectedUnits.forEach(u => {
                distribution[u.id] = equalShare;
            });
        } else {
            // Proportional split
            unitsWithCoeff.forEach(u => {
                const share = (u.coeff / totalCoeff) * targetAmount;
                distribution[u.id] = share;
            });
        }

        return distribution;
    }, [isMandatory, calculationMethod, goal, affectedUnits, totalUnits]);

    const [campaignToDelete, setCampaignToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteClick = (campaign) => {
        setCampaignToDelete(campaign);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!campaignToDelete) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns/${campaignToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete campaign');
            }

            setToast({ message: t('campaigns.delete_success', 'Campaign deleted successfully'), type: 'success' });
            setDeleteModalOpen(false);
            setCampaignToDelete(null);
            fetchCampaigns();
        } catch (error) {
            console.error(error);
            setToast({ message: error.message || t('campaigns.delete_error', 'Error deleting campaign'), type: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    // Payment State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedCampaignForPayment, setSelectedCampaignForPayment] = useState(null);

    const handleContributeClick = (campaign) => {
        setSelectedCampaignForPayment(campaign);
        setPaymentModalOpen(true);
    };

    const openCreateForm = () => {
        const isRestrictedVocal = isVocal && !isAdmin;
        // Reset and pre-fill
        setName('');
        setGoal('');
        setDesc('');
        setDeadline('');
        setCreateError('');
        setTargetType(isRestrictedVocal ? 'blocks' : 'all');
        setSelectedBlocks(isRestrictedVocal ? vocalBlocks : []);
        setSelectedBlocks(isRestrictedVocal ? vocalBlocks : []);
        setIsMandatory(false);
        setCalculationMethod('fixed');
        setAmountPerUnit('');
        setShowCreateForm(true);
    };

    // Edit State
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        goal_amount: '',
        description: '',
        deadline: '',
        is_active: true
    });

    useEffect(() => {
        fetchCampaigns();
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/properties/blocks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAvailableBlocks(await res.json());
            }
        } catch (error) {
            console.error("Error fetching blocks:", error);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    goal_amount: goal,
                    description: desc,
                    deadline: deadline || null,
                    target_type: targetType,
                    target_blocks: targetType === 'blocks' ? selectedBlocks : [],
                    is_mandatory: isMandatory,
                    calculation_method: isMandatory ? calculationMethod : null,
                    amount_per_unit: isMandatory && calculationMethod === 'fixed' ? Number(amountPerUnit) : 0,
                    goal_amount: isMandatory && calculationMethod === 'fixed' ? (Number(amountPerUnit) * totalUnits).toString() : goal,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create campaign');
            }

            setToast({ message: t('campaigns.success', 'Extraordinary fee created successfully!'), type: 'success' });
            setName('');
            setGoal('');
            setDesc('');
            setDesc('');
            setDeadline('');
            setTargetType('all');
            setSelectedBlocks([]);
            setSelectedBlocks([]);
            setIsMandatory(false);
            setCalculationMethod('fixed');
            setAmountPerUnit('');
            setShowCreateForm(false);
            fetchCampaigns(); // Refresh list

        } catch (error) {
            console.error(error);
            setCreateError(error.message);
            // Optionally keep toast for generic network errors, but user asked for modal warning.
        } finally {
            setCreating(false);
        }
    };

    const handleToggleBlock = (blockId) => {
        const getAllDescendants = (pId, allBlocks) => {
            let descendants = [];
            const children = allBlocks.filter(b => b.parent_id === pId);
            children.forEach(child => {
                descendants.push(child.id);
                descendants = [...descendants, ...getAllDescendants(child.id, allBlocks)];
            });
            return descendants;
        };

        const idsToToggle = [blockId, ...getAllDescendants(blockId, availableBlocks)];
        const isCurrentlySelected = selectedBlocks.includes(blockId);

        if (isCurrentlySelected) {
            // Deselect block and all descendants
            setSelectedBlocks(selectedBlocks.filter(id => !idsToToggle.includes(id)));
        } else {
            // Select block and all descendants
            setSelectedBlocks([...new Set([...selectedBlocks, ...idsToToggle])]);
        }
    };

    const handleEditClick = (campaign) => {
        setEditingCampaign(campaign);
        setEditError('');
        setEditForm({
            name: campaign.name,
            goal_amount: campaign.target_amount,
            description: campaign.description || '',
            deadline: campaign.deadline ? campaign.deadline.split('T')[0] : '',
            is_active: campaign.is_active
        });
    };

    const [editError, setEditError] = useState('');

    const handleUpdate = async (e) => {
        e.preventDefault();
        setEditError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns/${editingCampaign.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...editForm,
                    deadline: editForm.deadline || null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update');
            }

            setToast({ message: t('campaigns.update_success', 'Campaign updated successfully!'), type: 'success' });
            setEditingCampaign(null);
            fetchCampaigns();

        } catch (error) {
            console.error(error);
            setEditError(error.message);
        }
    };

    if (loading) {
        return (
            <GlassLoader />
        );
    }

    return (
        <>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 md:gap-0 mb-6">
                    {/* Title removed as requested */}
                    {canCreate && (
                        <button
                            onClick={openCreateForm}
                            className="glass-button"
                        >
                            {t('campaigns.create_btn', 'Create Extraordinary Fee')}
                        </button>
                    )}
                </div>

                {/* Create Campaign Modal */}
                {showCreateForm && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowCreateForm(false)}></div>
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                <div className="inline-block align-bottom glass-card text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-6">
                                    <h3 className="text-lg leading-6 font-bold text-gray-800 dark:text-white mb-4" id="modal-title">
                                        {t('campaigns.create_title', 'Create New Extraordinary Fee')}
                                    </h3>
                                    {createError && (
                                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md">
                                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                                {createError}
                                            </p>
                                        </div>
                                    )}
                                    <form onSubmit={handleCreate} className="space-y-4">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.name', 'Fee Concept')}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="glass-input"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                {(!isMandatory || calculationMethod === 'coefficient') ? (
                                                    <>
                                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.goal', 'Goal Amount')}</label>
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            required
                                                            className="glass-input"
                                                            value={goal}
                                                            onChange={(e) => setGoal(e.target.value)}
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.amount_per_unit_label', 'Amount Per Unit')}</label>
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            required
                                                            className="glass-input"
                                                            value={amountPerUnit}
                                                            onChange={(e) => setAmountPerUnit(e.target.value)}
                                                        />
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {t('campaigns.goal', 'Goal')}: {getCurrencySymbol(activeCommunity?.communities?.currency)}{(Number(amountPerUnit || 0) * totalUnits).toFixed(2)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.description', 'Description')}</label>
                                            <textarea
                                                className="glass-input !rounded-3xl"
                                                rows="3"
                                                value={desc}
                                                onChange={(e) => setDesc(e.target.value)}
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.deadline', 'Deadline')} <span className="text-gray-400 font-normal">({t('common.optional', 'Optional')})</span></label>
                                            <input
                                                type="date"
                                                className="glass-input"
                                                value={deadline}
                                                onChange={(e) => setDeadline(e.target.value)}
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 dark:border-white/5 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-semibold dark:text-gray-300">
                                                    {t('campaigns.is_mandatory_label', 'Mandatory (Generates automatic charges)')}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsMandatory(!isMandatory)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isMandatory ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-neutral-700'}`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isMandatory ? 'translate-x-6' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                            </div>
                                            {isMandatory && (
                                                <div className="animate-fade-in mt-3 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                                    <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                        {t('campaigns.preview_title', 'Calculation Preview')}
                                                    </h4>

                                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                                        <div className="bg-white dark:bg-neutral-800 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('campaigns.total_units', 'Selected Units')}</div>
                                                            <div className="font-bold text-gray-800 dark:text-white text-lg">{totalUnits}</div>
                                                        </div>
                                                        <div className="bg-white dark:bg-neutral-800 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('campaigns.fee_per_unit', 'Fee/Unit')}</div>
                                                            <div className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                                                                {calculationMethod === 'coefficient' ? (
                                                                    <span className="text-sm">{t('campaigns.variable_fees', 'Variable')}</span>
                                                                ) : (
                                                                    <>{getCurrencySymbol(activeCommunity?.communities?.currency)}{calculatedFee.toFixed(2)}</>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setShowBreakdown(!showBreakdown)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1 mb-2"
                                                    >
                                                        {showBreakdown ? '▼' : '▶'} {t('campaigns.unit_breakdown', 'View Unit Breakdown')}
                                                    </button>

                                                    {showBreakdown && (
                                                        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 max-h-40 overflow-y-auto custom-scrollbar">
                                                            <table className="w-full text-xs text-left">
                                                                <thead className="bg-gray-50 dark:bg-neutral-700 sticky top-0">
                                                                    <tr>
                                                                        <th className="p-2 font-medium text-gray-600 dark:text-gray-300">{t('campaigns.unit_col', 'Unit')}</th>
                                                                        <th className="p-2 font-medium text-gray-600 dark:text-gray-300 text-right">{t('campaigns.amount_col', 'Amount')}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {affectedUnits.length > 0 ? affectedUnits.map((u, idx) => (
                                                                        <tr key={`u-${idx}`} className="border-b border-gray-100 dark:border-neutral-700 last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-700/50">
                                                                            <td className="p-2 text-gray-800 dark:text-gray-200">
                                                                                <span className="text-gray-400">{u.block_name} / </span> {u.unit_number || u.name}
                                                                            </td>
                                                                            <td className="p-2 text-right font-mono text-gray-800 dark:text-gray-200">
                                                                                {/* For preview, we show the calculated fee. 
                                                                                    If coefficient, this is approximate average. 
                                                                                    If fixed, it is exact. */}
                                                                                {getCurrencySymbol(activeCommunity?.communities?.currency)}
                                                                                {calculationMethod === 'coefficient'
                                                                                    ? (feeDistribution[u.id] || 0).toFixed(2)
                                                                                    : calculatedFee.toFixed(2)
                                                                                }
                                                                                {calculationMethod === 'coefficient' && <span className="text-[10px] text-gray-400 block">({(u.coefficient * 100).toFixed(2)}%)</span>}
                                                                            </td>
                                                                        </tr>
                                                                    )) : (
                                                                        <tr><td colSpan="2" className="p-3 text-center text-gray-400 italic">{t('common.no_items')}</td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                    <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 border-t border-indigo-100 dark:border-indigo-500/20 pt-2">
                                                        {t('campaigns.mandatory_warning', 'Extraordinary fees will be billed automatically to all targeted units.')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Targeting Options */}
                                        <div className="pt-2">
                                            {isMandatory && (
                                                <div className="mb-4 animate-fade-in">
                                                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                                                        {t('campaigns.calculation_method', 'Calculation Method')}
                                                    </label>
                                                    <div className="flex flex-col gap-3">
                                                        {/* Fixed Amount Option */}
                                                        <div className="flex items-start">
                                                            <div className="flex items-center h-5">
                                                                <input
                                                                    id="method_fixed"
                                                                    name="calculationMethod"
                                                                    type="radio"
                                                                    checked={calculationMethod === 'fixed'}
                                                                    onChange={() => setCalculationMethod('fixed')}
                                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                                                />
                                                            </div>
                                                            <div className="ml-3 text-sm">
                                                                <label htmlFor="method_fixed" className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                                    {t('campaigns.method_fixed', 'Fixed Amount per Unit')}
                                                                    <div className="group relative flex items-center">
                                                                        <svg className="w-4 h-4 text-gray-400 hover:text-gray-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50 pointer-events-none">
                                                                            {t('campaigns.info_fixed', 'Fixed Amount: You set the price per unit. The total goal is calculated automatically.')}
                                                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 rotate-45"></div>
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {/* Coefficient Option */}
                                                        <div className="flex items-start">
                                                            <div className="flex items-center h-5">
                                                                <input
                                                                    id="method_coefficient"
                                                                    name="calculationMethod"
                                                                    type="radio"
                                                                    checked={calculationMethod === 'coefficient'}
                                                                    onChange={() => setCalculationMethod('coefficient')}
                                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                                                />
                                                            </div>
                                                            <div className="ml-3 text-sm">
                                                                <label htmlFor="method_coefficient" className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                                    {t('campaigns.method_coefficient', 'Total Goal (Coefficient)')}
                                                                    <div className="group relative flex items-center">
                                                                        <svg className="w-4 h-4 text-gray-400 hover:text-gray-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50 pointer-events-none">
                                                                            {t('campaigns.info_coefficient', 'Coefficient: You set the total goal. Each unit pays based on their coefficient.')}
                                                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 rotate-45"></div>
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Targeting Options */}
                                        <div className="pt-2">
                                            <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('campaigns.target_audience', 'Target Audience')}</label>
                                            <div className="flex gap-4 mb-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="targetType"
                                                        value="all"
                                                        checked={targetType === 'all'}
                                                        onChange={() => setTargetType('all')}
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                        disabled={isVocal && !isAdmin}
                                                    />
                                                    <span className={`text-sm dark:text-gray-300 ${(isVocal && !isAdmin) ? 'opacity-50' : ''}`}>{t('campaigns.target_all', 'All Community')}</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="targetType"
                                                        value="blocks"
                                                        checked={targetType === 'blocks'}
                                                        onChange={() => setTargetType('blocks')}
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm dark:text-gray-300">{t('campaigns.target_blocks', 'Specific Blocks')}</span>
                                                </label>
                                            </div>

                                            {targetType === 'blocks' && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                                                        {t('campaigns.select_blocks', 'Select Blocks')}
                                                    </label>
                                                    <HierarchicalBlockSelector
                                                        blocks={availableBlocks.filter(block => (!isVocal || isAdmin) || vocalBlocks.includes(block.id))}
                                                        selectedBlocks={selectedBlocks}
                                                        onToggleBlock={handleToggleBlock}
                                                    />

                                                    {selectedBlocks.length > 0 && (
                                                        <div className="mt-3 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 backdrop-blur-sm">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                                                    {t('campaigns.selection_summary', 'Selection Summary')}
                                                                </h4>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedBlocks([])}
                                                                    className="text-[10px] text-gray-500 hover:text-red-500 transition-colors"
                                                                >
                                                                    {t('common.clear_selection', 'Clear All')}
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                                                {availableBlocks
                                                                    .filter(b => selectedBlocks.includes(b.id))
                                                                    .filter(b => !b.parent_id || !selectedBlocks.includes(b.parent_id))
                                                                    .map(block => (
                                                                        <span
                                                                            key={block.id}
                                                                            className="px-2 py-0.5 bg-white/60 dark:bg-neutral-800/60 text-[10px] rounded-full border border-indigo-100/50 dark:border-indigo-900/50 flex items-center gap-1 group whitespace-nowrap"
                                                                        >
                                                                            {block.name}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleBlock(block.id)}
                                                                                className="hover:text-red-500 font-bold"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </span>
                                                                    ))
                                                                }
                                                            </div>
                                                            <div className="mt-2 text-[10px] text-gray-500 italic">
                                                                {selectedBlocks.length} {t('campaigns.total_entities', 'total entities targeted')}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>


                                        <div className="flex gap-3 mt-6">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateForm(false)}
                                                className="glass-button-secondary flex-1"
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={creating}
                                                className="glass-button flex-1"
                                            >
                                                {creating ? t('common.loading', 'Loading...') : t('campaigns.create_btn', 'Create Campaign')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )}

                {/* Filter Dropdown */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="glass-input !py-2 !px-4 !rounded-full !w-auto cursor-pointer"
                        >
                            <option value="all">{t('campaigns.filter_all', 'All Campaigns')}</option>
                            <option value="active">{t('campaigns.filter_active', 'Active Only')}</option>
                            <option value="closed">{t('campaigns.filter_closed', 'Closed Only')}</option>
                        </select>
                    </div>
                </div>

                {/* List of campaigns */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns
                        .filter(c => {
                            if (filterStatus === 'all') return true;
                            if (filterStatus === 'active') return c.is_active;
                            if (filterStatus === 'closed') return !c.is_active;
                            return true;
                        })
                        .map(campaign => (
                            <div key={campaign.id} className="glass-card p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <Link to={`/app/campaigns/${campaign.id}`} className="hover:underline">
                                            <h2 className="font-bold text-lg text-gray-800 dark:text-white">{campaign.name}</h2>
                                        </Link>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium ${campaign.is_active ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500' : 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-500'}`}>
                                                {campaign.is_active ? t('campaigns.active', 'Active') : t('campaigns.closed', 'Closed')}
                                            </span>
                                            {campaign.is_mandatory && (
                                                <span className="inline-flex items-center py-0.5 px-2 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 uppercase tracking-wider">
                                                    {t('campaigns.mandatory', 'Mandatory')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4 h-12 overflow-hidden text-ellipsis">
                                        {campaign.description || t('campaigns.no_desc', 'No description provided.')}
                                    </p>

                                    <CampaignProgress
                                        campaign={campaign}
                                    />

                                    <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-neutral-500 mb-4">
                                        <span>{t('campaigns.collected', 'Collected')}: {getCurrencySymbol(activeCommunity?.communities?.currency)}{campaign.current_amount}</span>
                                        <span>{t('campaigns.goal', 'Goal')}: {getCurrencySymbol(activeCommunity?.communities?.currency)}{campaign.target_amount}</span>
                                    </div>
                                    {campaign.deadline && (
                                        <div className="text-xs text-gray-500 dark:text-neutral-400 mb-4 text-right">
                                            {t('campaigns.deadline_label', 'Deadline')}: {new Date(campaign.deadline).toLocaleDateString()}
                                        </div>
                                    )}

                                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-3">
                                        {/* Contribute Button */}
                                        {campaign.is_active ? (
                                            <button
                                                onClick={() => handleContributeClick(campaign)}
                                                className={`glass-button flex-1 flex items-center justify-center gap-2 ${campaign.is_mandatory ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-none' : ''}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                {campaign.is_mandatory ? t('campaigns.pay_fee', 'Pay Fee') : t('campaigns.contribute', 'Contribute')}
                                            </button>
                                        ) : (
                                            <div className="flex-1"></div>
                                        )}

                                        {/* Admin Actions */}
                                        {(isAdmin || (isVocal && campaign.created_by === user.id)) && (
                                            <div className="flex gap-1 shrink-0">
                                                <button
                                                    onClick={() => handleEditClick(campaign)}
                                                    className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                                                    title={t('common.edit', 'Edit')}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(campaign)}
                                                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title={t('common.delete', 'Delete')}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>

                {/* Edit Modal */}
                {editingCampaign && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setEditingCampaign(null)}></div>
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                <div className="inline-block align-bottom glass-card text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-6">
                                    <h3 className="text-lg leading-6 font-bold text-gray-800 dark:text-white mb-4" id="modal-title">
                                        {t('campaigns.edit_title', 'Edit Campaign')}
                                    </h3>
                                    {editError && (
                                        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md">
                                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                                {editError}
                                            </p>
                                        </div>
                                    )}
                                    <form onSubmit={handleUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.name', 'Campaign Name')}</label>
                                            <input
                                                type="text"
                                                required
                                                className="glass-input"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.goal', 'Goal Amount')}</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                className="glass-input"
                                                value={editForm.goal_amount}
                                                onChange={(e) => setEditForm({ ...editForm, goal_amount: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.description', 'Description')}</label>
                                            <textarea
                                                className="glass-input !rounded-3xl"
                                                rows="3"
                                                value={editForm.description}
                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.deadline', 'Deadline')} <span className="text-gray-400 font-normal">({t('campaigns.ongoing_hint', 'Leave empty for ongoing')})</span></label>
                                            <input
                                                type="date"
                                                className="glass-input"
                                                value={editForm.deadline}
                                                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="is_active"
                                                name="is_active"
                                                type="checkbox"
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                checked={editForm.is_active}
                                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                            />
                                            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                                {t('campaigns.is_active', 'Active Campaign')}
                                            </label>
                                        </div>
                                        <div className="flex gap-3 mt-6">
                                            <button
                                                type="button"
                                                onClick={() => setEditingCampaign(null)}
                                                className="glass-button-secondary flex-1"
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                className="glass-button flex-1"
                                            >
                                                {t('common.save', 'Save Changes')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )}

                {/* Payment Modal */}
                {paymentModalOpen && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-lg">
                                <PaymentUpload
                                    onSuccess={() => {
                                        setPaymentModalOpen(false);
                                        fetchCampaigns();
                                        setToast({ message: t('campaigns.payment_success', 'Contribution registered!'), type: 'success' });
                                    }}
                                    onCancel={() => setPaymentModalOpen(false)}
                                    initialType={selectedCampaignForPayment?.is_mandatory ? 'maintenance' : 'campaign'}
                                    initialCampaignId={selectedCampaignForPayment?.id}
                                    initialAmount={selectedCampaignForPayment?.amount_per_unit}
                                    isAdmin={isAdmin}
                                />
                            </div>
                        </div>
                    </ModalPortal>
                )}


                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('campaigns.delete_title', 'Delete Campaign')}
                    message={t('campaigns.delete_confirm', 'Are you sure you want to delete this campaign? This action cannot be undone.')}
                    confirmText={t('common.delete', 'Delete')}
                    isDangerous={true}
                    isLoading={deleting}
                />
            </div>
        </>
    );
};

const Campaigns = () => {
    return (
        <DashboardLayout>
            <CampaignsContent />
        </DashboardLayout>
    );
};

export { CampaignsContent };
export default Campaigns;
