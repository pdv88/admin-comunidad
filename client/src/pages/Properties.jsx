import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';
import ModalPortal from '../components/ModalPortal';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';
import BlockCard from '../components/properties/BlockCard';
import GlassEmptyState from '../components/GlassEmptyState';

const Properties = () => {
    const [blocks, setBlocks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    // newBlock state modified to support hierarchy
    const [newBlock, setNewBlock] = useState({ name: '', type: 'block', parentId: null });
    const [amenities, setAmenities] = useState([]);
    const [activeTab, setActiveTab] = useState('units'); // 'units' or 'amenities'
    const [newAmenity, setNewAmenity] = useState({
        name: '',
        description: '',
        is_reservable: false,
        max_hours: 0,
        max_days: 0,
        type: 'hour', // Default to hour
        exception_days: []
    });
    const [editingAmenityId, setEditingAmenityId] = useState(null);
    const [newUnit, setNewUnit] = useState({ blockId: '', number: '', type: 'apartment', parking_slots: 0, has_storage: false, coefficient: 0, coefficientFormat: 'percentage' });
    const [isUpdatingUnit, setIsUpdatingUnit] = useState(false);

    // Loading state for assigning representative
    const [assigningRepBlockId, setAssigningRepBlockId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [toast, setToast] = useState({ message: '', type: 'success' });
    const { t } = useTranslation();

    // Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null });

    const [editUnitModal, setEditUnitModal] = useState({ isOpen: false, unit: null });
    const [amenityModalOpen, setAmenityModalOpen] = useState(false);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [unitModalOpen, setUnitModalOpen] = useState(false);

    // Form Loading States
    const [isCreatingBlock, setIsCreatingBlock] = useState(false);

    const [isCreatingUnit, setIsCreatingUnit] = useState(false);
    const [isSavingAmenity, setIsSavingAmenity] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [blocksRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/api/properties/blocks`),
                fetch(`${API_URL}/api/properties/users`)
            ]);

            // Fetch amenities separately to avoid blocking main content
            fetch(`${API_URL}/api/amenities`)
                .then(res => {
                    if (res.ok) return res.json();
                    console.error('Amenities fetch status:', res.status);
                    return [];
                })
                .then(data => setAmenities(data || []))
                .catch(err => console.error('Amenities fetch error:', err));

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(usersData.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
            }

            if (blocksRes.ok) {
                const blocksData = await blocksRes.json();
                // Sort blocks by name naturally
                blocksData.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));

                // Sort units within each block naturally
                blocksData.forEach(block => {
                    if (block.units && Array.isArray(block.units)) {
                        block.units.sort((a, b) => (a.unit_number || '').localeCompare(b.unit_number || '', undefined, { numeric: true }));
                    }
                    block.children = []; // Initialize children array for tree building
                });

                // Build Tree Structure
                const blockMap = {};
                blocksData.forEach(b => blockMap[b.id] = b);

                const rootBlocks = [];
                blocksData.forEach(b => {
                    if (b.parent_id && blockMap[b.parent_id]) {
                        blockMap[b.parent_id].children.push(b);
                    } else {
                        rootBlocks.push(b);
                    }
                });

                setBlocks(rootBlocks);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBlock = async (e) => {
        e.preventDefault();
        setIsCreatingBlock(true);
        try {
            const payload = {
                name: newBlock.name,
                structure_type: newBlock.type,
                parent_id: newBlock.parentId
            };

            const res = await fetch(`${API_URL}/api/properties/blocks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setNewBlock({ name: '', type: 'block', parentId: null });
                setBlockModalOpen(false);
                fetchData();
                setToast({ message: t('properties.block_created', 'Block created successfully'), type: 'success' });
            } else {
                const data = await res.json();
                setToast({ message: data.error || t('common.error', 'Error creating block'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('common.error', 'Error creating block'), type: 'error' });
        } finally {
            setIsCreatingBlock(false);
        }
    };

    const handleCreateUnit = async (e) => {
        e.preventDefault();
        setIsCreatingUnit(true);
        try {
            if (newUnit.coefficientFormat === 'decimal' && parseFloat(newUnit.coefficient) > 1) {
                setToast({ message: t('properties.coefficient_decimal_warning', 'Decimal coefficient should be less than 1. Did you mean Percentage?'), type: 'error' });
                setIsCreatingUnit(false);
                return;
            }

            const finalCoefficient = newUnit.coefficientFormat === 'percentage'
                ? (parseFloat(newUnit.coefficient) / 100)
                : parseFloat(newUnit.coefficient);

            const res = await fetch(`${API_URL}/api/properties/units`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    block_id: newUnit.blockId,
                    unit_number: newUnit.number,
                    type: newUnit.type,
                    parking_slots: newUnit.parking_slots,
                    has_storage: newUnit.has_storage,
                    coefficient: finalCoefficient || 0
                })
            });

            if (res.ok) {
                setNewUnit({ blockId: '', number: '', type: 'apartment', parking_slots: 0, has_storage: false, coefficient: 0, coefficientFormat: 'percentage' });
                setUnitModalOpen(false);
                fetchData();
                setToast({ message: t('properties.unit_created', 'Unit created successfully'), type: 'success' });
            } else {
                setToast({ message: t('common.error', 'Error creating unit'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('common.error', 'Error creating unit'), type: 'error' });
        } finally {
            setIsCreatingUnit(false);
        }
    };

    const handleCreateAmenity = async (e) => {
        e.preventDefault();
        setIsSavingAmenity(true);
        try {
            const payload = {
                name: newAmenity.name,
                description: newAmenity.description,
                is_reservable: newAmenity.is_reservable,
                reservation_limits: {
                    type: newAmenity.type || 'hour',
                    max_hours_per_day: (newAmenity.is_reservable && newAmenity.type === 'hour') ? (parseInt(newAmenity.max_hours) || 0) : 0,
                    max_days_per_month: (newAmenity.is_reservable && newAmenity.type === 'day') ? (parseInt(newAmenity.max_days) || 0) : 0,
                    allowed_days: [0, 1, 2, 3, 4, 5, 6].filter(day => !(newAmenity.disabled_days || []).includes(day)),
                    schedule_start: newAmenity.schedule_start || '06:00',
                    schedule_end: newAmenity.schedule_end || '23:00',
                    exception_days: newAmenity.exception_days || []
                }
            };

            const url = editingAmenityId
                ? `${API_URL}/api/amenities/${editingAmenityId}`
                : `${API_URL}/api/amenities`;

            const method = editingAmenityId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setNewAmenity({
                    name: '',
                    description: '',
                    is_reservable: false,
                    max_hours: 0,
                    max_days: 0,
                    type: 'hour',
                    disabled_days: [],
                    schedule_start: '06:00',
                    schedule_end: '23:00',
                    exception_days: []
                });
                setEditingAmenityId(null);
                setAmenityModalOpen(false);
                fetchData();
                setToast({ message: editingAmenityId ? t('properties.amenity_updated', 'Amenity updated successfully') : t('properties.amenity_created', 'Amenity created successfully'), type: 'success' });
            } else {
                setToast({ message: t('properties.amenity_save_error', 'Error saving amenity'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('properties.amenity_save_error', 'Error saving amenity'), type: 'error' });
        } finally {
            setIsSavingAmenity(false);
        }
    };

    const handleEditAmenity = (amenity) => {
        setEditingAmenityId(amenity.id);

        // Calculate disabled days from allowed_days
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const allowed = amenity.reservation_limits?.allowed_days || allDays;
        const disabled = allDays.filter(d => !allowed.includes(d));

        setNewAmenity({
            name: amenity.name,
            description: amenity.description,
            is_reservable: amenity.is_reservable,
            max_hours: amenity.reservation_limits?.max_hours_per_day || 0,
            max_days: amenity.reservation_limits?.max_days_per_month || 0,
            type: (amenity.reservation_limits?.type || 'hour').toLowerCase(),
            disabled_days: disabled,
            schedule_start: amenity.reservation_limits?.schedule_start || '06:00',
            schedule_end: amenity.reservation_limits?.schedule_end || '23:00',
            exception_days: amenity.reservation_limits?.exception_days || []
        });
        setAmenityModalOpen(true);
    };

    const cancelEditAmenity = () => {
        setEditingAmenityId(null);
        setNewAmenity({
            name: '',
            description: '',
            is_reservable: false,
            max_hours: 0,
            max_days: 0,
            type: 'hour',
            disabled_days: [],
            schedule_start: '06:00',
            schedule_end: '23:00',
            exception_days: []
        });
        setAmenityModalOpen(false);
    };

    const handleAssignRep = async (blockId, userId) => {
        setAssigningRepBlockId(blockId);
        try {
            const res = await fetch(`${API_URL}/api/properties/blocks/${blockId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ representative_id: userId || null })
            });
            if (res.ok) {
                await fetchData();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setAssigningRepBlockId(null);
        }
    };

    const handleEditUnit = (unit) => {
        // Default to percentage for display if it helps user
        const coeffVal = parseFloat(unit.coefficient || 0);
        const format = 'percentage';

        // Smart Display: If coeff > 1, it's likely stored as 3.0 (3%) not 300%. 
        // So don't multiply by 100 in that case.
        // If coeff <= 1 (e.g. 0.03), multiply by 100 -> 3%.
        const displayVal = (format === 'percentage' && coeffVal <= 1) ? (coeffVal * 100) : coeffVal;

        setEditUnitModal({
            isOpen: true,
            unit: {
                ...unit,
                coefficient: parseFloat(displayVal.toFixed(4)), // Avoid long floating points
                coefficientFormat: format
            }
        });
    };

    const handleUpdateUnit = async (e) => {
        e.preventDefault();
        setIsUpdatingUnit(true);
        try {
            const { id, tenant_name, tenant_email, tenant_phone, type } = editUnitModal.unit;

            if (editUnitModal.unit.coefficientFormat === 'decimal' && parseFloat(editUnitModal.unit.coefficient) > 1) {
                setToast({ message: t('properties.coefficient_decimal_warning', 'Decimal coefficient should be less than 1. Did you mean Percentage?'), type: 'error' });
                setIsUpdatingUnit(false);
                return;
            }

            const finalCoefficient = editUnitModal.unit.coefficientFormat === 'percentage'
                ? (parseFloat(editUnitModal.unit.coefficient) / 100)
                : parseFloat(editUnitModal.unit.coefficient);

            const res = await fetch(`${API_URL}/api/properties/units/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_name,
                    tenant_email,
                    tenant_phone,
                    type,
                    parking_slots: editUnitModal.unit.parking_slots,
                    has_storage: editUnitModal.unit.has_storage,
                    coefficient: finalCoefficient
                })
            });
            if (res.ok) {
                setToast({ message: t('properties.update_success', 'Tenant info updated'), type: 'success' });
                setEditUnitModal({ isOpen: false, unit: null });
                fetchData();
            } else {
                setToast({ message: t('common.error', 'An error occurred'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('common.error', 'An error occurred'), type: 'error' });
        } finally {
            setIsUpdatingUnit(false);
        }
    };

    const confirmDelete = (type, id) => {
        setDeleteModal({ isOpen: true, type, id });
    };

    const handleExecuteDelete = async () => {
        const { type, id } = deleteModal;
        if (!type || !id) return;

        setIsDeleting(true);

        let endpoint = '';
        if (type === 'block') endpoint = `${API_URL}/api/properties/blocks/${id}`;
        else if (type === 'unit') endpoint = `${API_URL}/api/properties/units/${id}`;
        else if (type === 'amenity') endpoint = `${API_URL}/api/amenities/${id}`;

        try {
            const res = await fetch(endpoint, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchData();
                setDeleteModal({ isOpen: false, type: null, id: null });
                setToast({ message: t('properties.delete_success', 'Deleted successfully'), type: 'success' });
            } else {
                setToast({ message: t('common.error_occurred', 'An error occurred'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('common.error_occurred', 'An error occurred'), type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    // NEW Helper functions for structure
    const handleAddStructure = (parentId) => {
        setNewBlock({ name: '', type: 'staircase', parentId }); // Default to staircase for sub-structure
        setBlockModalOpen(true);
    };

    const handleOpenCreateBlock = () => {
        setNewBlock({ name: '', type: 'portal', parentId: null }); // Default to portal for root
        setBlockModalOpen(true);
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
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                {/* ... existing content ... */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('properties.title')}</h1>
                </div>

                {/* Tabs & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex bg-white/30 backdrop-blur-md border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10 p-1 rounded-full w-fit items-center">
                        <button
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'units'
                                ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                            onClick={() => setActiveTab('units')}
                        >
                            {t('properties.units_structure', 'Units & Structure')}
                        </button>
                        <button
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'amenities'
                                ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'}`}
                            onClick={() => setActiveTab('amenities')}
                        >
                            {t('properties.amenities', 'Common Areas / Amenities')}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {activeTab === 'units' ? (
                            <>
                                <button
                                    onClick={handleOpenCreateBlock}
                                    className="glass-button bg-blue-600 text-white flex items-center gap-2"
                                >
                                    <span>+</span> {t('properties.add_block')}
                                </button>
                                {/* "Add Unit" button moved to block cards */}
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    setNewAmenity({
                                        name: '',
                                        description: '',
                                        is_reservable: false,
                                        max_hours: 0,
                                        max_days: 0,
                                        type: 'hour',
                                        disabled_days: [],
                                        schedule_start: '06:00',
                                        schedule_end: '23:00',
                                        exception_days: []
                                    });
                                    setEditingAmenityId(null);
                                    setAmenityModalOpen(true);
                                }}
                                className="glass-button bg-blue-600 text-white flex items-center gap-2"
                            >
                                <span>+</span>
                                {t('properties.add_amenity', 'Add Amenity')}
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'units' ? (
                    <>
                        {/* Create Block Modal */}
                        {blockModalOpen && (
                            <ModalPortal>
                                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setBlockModalOpen(false)}></div>
                                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                                        <div className="inline-block align-bottom glass-card p-0 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full overflow-hidden">
                                            <div className="px-6 py-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {newBlock.parentId ? t('properties.add_sub_structure', 'Add Sub-Structure') : t('properties.add_block')}
                                                </h3>
                                                <button onClick={() => setBlockModalOpen(false)} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                                            </div>
                                            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-md px-6 py-6">
                                                <form onSubmit={handleCreateBlock}>
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.structure_type', 'Structure Type')}
                                                        </label>
                                                        <select
                                                            className="glass-input w-full"
                                                            value={newBlock.type}
                                                            onChange={(e) => setNewBlock({ ...newBlock, type: e.target.value })}
                                                        >
                                                            <option value="block">{t('properties.types.block', 'Block (Generic)')}</option>
                                                            <option value="portal">{t('properties.types.portal', 'Portal')}</option>
                                                            <option value="staircase">{t('properties.types.staircase', 'Staircase')}</option>
                                                            <option value="tower">{t('properties.types.tower', 'Tower')}</option>
                                                            <option value="level">{t('properties.types.level', 'Level')}</option>
                                                        </select>
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.block_name', 'Name')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder={t('properties.block_placeholder')}
                                                            className="glass-input w-full"
                                                            value={newBlock.name}
                                                            onChange={(e) => setNewBlock({ ...newBlock, name: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-3 mt-6">
                                                        <button type="button" onClick={() => setBlockModalOpen(false)} className="glass-button-secondary">
                                                            {t('common.cancel', 'Cancel')}
                                                        </button>
                                                        <button type="submit" disabled={isCreatingBlock} className="glass-button w-full sm:w-auto relative flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed">
                                                            <span className={isCreatingBlock ? 'invisible' : ''}>{t('properties.add_btn', 'Add')}</span>
                                                            {isCreatingBlock && (
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
                                    </div>
                                </div>
                            </ModalPortal>
                        )}

                        {/* Create Unit Modal */}
                        {unitModalOpen && (
                            <ModalPortal>
                                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setUnitModalOpen(false)}></div>
                                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                                        <div className="inline-block align-bottom glass-card p-0 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full overflow-hidden">
                                            <div className="px-6 py-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {t('properties.add_unit')}
                                                </h3>
                                                <button onClick={() => setUnitModalOpen(false)} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                                            </div>
                                            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-md px-6 py-6">
                                                <form onSubmit={handleCreateUnit} className="space-y-4">
                                                    {/* Block ID is now pre-filled and hidden */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.unit_number', 'Unit Number')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder={t('properties.unit_placeholder')}
                                                            className="glass-input w-full"
                                                            value={newUnit.number}
                                                            onChange={(e) => setNewUnit({ ...newUnit, number: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    {(() => {
                                                        if (!newUnit.blockId || !newUnit.number) return null;
                                                        // Flatten blocks to find the correct one, or search recursively
                                                        const findBlock = (list, id) => {
                                                            for (const b of list) {
                                                                if (b.id === id) return b;
                                                                if (b.children) {
                                                                    const found = findBlock(b.children, id);
                                                                    if (found) return found;
                                                                }
                                                            }
                                                            return null;
                                                        };
                                                        const selectedBlock = findBlock(blocks, newUnit.blockId);

                                                        const isDuplicate = selectedBlock?.units?.some(u => u.unit_number.toLowerCase() === newUnit.number.trim().toLowerCase());
                                                        return isDuplicate ? (
                                                            <p className="text-xs text-red-500 mt-1 font-medium">
                                                                {t('properties.unit_exists_error', 'This unit number already exists in this block.')}
                                                            </p>
                                                        ) : null;
                                                    })()}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.unit_type_label', 'Type')}
                                                        </label>
                                                        <select
                                                            className="glass-input w-full"
                                                            value={newUnit.type}
                                                            onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value })}
                                                        >
                                                            <option value="apartment">{t('properties.unit_type.apartment')}</option>
                                                            <option value="house">{t('properties.unit_type.house')}</option>
                                                            <option value="commercial">{t('properties.unit_type.commercial')}</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.coefficient', 'Coefficient')}
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.0001"
                                                                    placeholder={newUnit.coefficientFormat === 'percentage' ? "15.5" : "0.155"}
                                                                    className="glass-input w-full pr-8"
                                                                    value={newUnit.coefficient || ''}
                                                                    onChange={(e) => setNewUnit({ ...newUnit, coefficient: e.target.value })}
                                                                />
                                                                {newUnit.coefficientFormat === 'percentage' && (
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                                                                )}
                                                            </div>
                                                            <select
                                                                className="glass-input w-32"
                                                                value={newUnit.coefficientFormat}
                                                                onChange={(e) => setNewUnit({ ...newUnit, coefficientFormat: e.target.value })}
                                                            >
                                                                <option value="percentage">%</option>
                                                                <option value="decimal">{t('properties.format_decimal', 'Decimal')}</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.parking_slots', 'Parking Slots')}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="glass-input w-full"
                                                            value={newUnit.parking_slots}
                                                            onChange={(e) => setNewUnit({ ...newUnit, parking_slots: parseInt(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                                checked={newUnit.has_storage}
                                                                onChange={(e) => setNewUnit({ ...newUnit, has_storage: e.target.checked })}
                                                            />
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                {t('properties.has_storage', 'Has Storage')}
                                                            </span>
                                                        </label>
                                                    </div>
                                                    <div className="flex justify-end gap-3 mt-6">
                                                        <button type="button" onClick={() => setUnitModalOpen(false)} className="glass-button-secondary">
                                                            {t('common.cancel', 'Cancel')}
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={isCreatingUnit || (() => {
                                                                if (!newUnit.blockId || !newUnit.number) return false;
                                                                // Helper to find block for validation
                                                                const findBlock = (list, id) => {
                                                                    for (const b of list) {
                                                                        if (b.id === id) return b;
                                                                        if (b.children) {
                                                                            const found = findBlock(b.children, id);
                                                                            if (found) return found;
                                                                        }
                                                                    }
                                                                    return null;
                                                                };
                                                                const selectedBlock = findBlock(blocks, newUnit.blockId);
                                                                return selectedBlock?.units?.some(u => u.unit_number.toLowerCase() === newUnit.number.trim().toLowerCase());
                                                            })()}
                                                            className="glass-button bg-gradient-to-r from-emerald-500 to-teal-500 border-none shadow-emerald-500/20 w-full sm:w-auto relative flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                                                        >
                                                            <span className={isCreatingUnit ? 'invisible' : ''}>{t('properties.add_unit_btn')}</span>
                                                            {isCreatingUnit && (
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
                                    </div>
                                </div>
                            </ModalPortal>
                        )}

                        {/* Recursive Block List */}
                        <div className="mt-8">
                            <div className="space-y-6">
                                {Array.isArray(blocks) && blocks.map(block => (
                                    <BlockCard
                                        key={block.id}
                                        block={block}
                                        users={users}
                                        onAddUnit={(blockId) => {
                                            setNewUnit(prev => ({ ...prev, blockId }));
                                            setUnitModalOpen(true);
                                        }}
                                        onAddStructure={handleAddStructure}
                                        onEditUnit={handleEditUnit}
                                        onDeleteBlock={(id) => confirmDelete('block', id)}
                                        onDeleteUnit={(id) => confirmDelete('unit', id)}
                                        onAssignRep={handleAssignRep}
                                        assigningRepBlockId={assigningRepBlockId}
                                        t={t}
                                    />
                                ))}
                                {blocks.length === 0 && (
                                    <GlassEmptyState
                                        title={t('properties.no_blocks', 'No Blocks Found')}
                                        description={t('properties.no_blocks_desc', 'Start by adding a new block to your structure.')}
                                    >
                                        <button
                                            onClick={handleOpenCreateBlock}
                                            className="mt-4 glass-button bg-blue-600 text-white flex items-center gap-2"
                                        >
                                            <span>+</span> {t('properties.add_block')}
                                        </button>
                                    </GlassEmptyState>
                                )}
                            </div>
                        </div>

                    </>
                ) : (
                    <div className="space-y-6">
                        {/* Amenity Form Modal */}
                        {amenityModalOpen && (
                            <ModalPortal>
                                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity" onClick={cancelEditAmenity}></div>
                                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                                        <div className="inline-block align-bottom glass-card p-0 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full overflow-hidden">
                                            <div className="px-6 py-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {editingAmenityId ? t('properties.update_amenity', 'Update Amenity') : t('properties.create_amenity', 'Create Amenity')}
                                                </h3>
                                                <button onClick={cancelEditAmenity} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                                            </div>

                                            <div className="px-6 py-6 bg-white/50 dark:bg-black/40 backdrop-blur-md">
                                                <form onSubmit={handleCreateAmenity} className="space-y-6">
                                                    {/* Basic Info */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                                                                {t('properties.amenity_name', 'Amenity Name')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder={t('properties.amenity_name_placeholder', 'e.g. Swimming Pool, BBQ Area')}
                                                                className="glass-input w-full"
                                                                value={newAmenity.name}
                                                                onChange={(e) => setNewAmenity({ ...newAmenity, name: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                                                                {t('properties.description', 'Description')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder={t('properties.description_placeholder', 'Brief description...')}
                                                                className="glass-input w-full"
                                                                value={newAmenity.description}
                                                                onChange={(e) => setNewAmenity({ ...newAmenity, description: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Availability Schedule */}
                                                    <div className="bg-white/40 dark:bg-black/20 rounded-xl p-4 border border-white/10 dark:border-white/5 space-y-3">
                                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">
                                                            {t('properties.availability_schedule', 'Availability & Schedule')}
                                                        </h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                                                                    {t('properties.schedule_start', 'Opens At')}
                                                                </label>
                                                                <input
                                                                    type="time"
                                                                    className="glass-input w-full max-w-full box-border appearance-none min-h-[3rem]"
                                                                    value={newAmenity.schedule_start}
                                                                    onChange={(e) => setNewAmenity({ ...newAmenity, schedule_start: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                                                                    {t('properties.schedule_end', 'Closes At')}
                                                                </label>
                                                                <input
                                                                    type="time"
                                                                    className="glass-input w-full max-w-full box-border appearance-none min-h-[3rem]"
                                                                    value={newAmenity.schedule_end}
                                                                    onChange={(e) => setNewAmenity({ ...newAmenity, schedule_end: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="pt-2">
                                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1 block mb-2">
                                                                {t('properties.enabled_days', 'Enabled Days')}
                                                            </label>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => {
                                                                    const isDisabled = (newAmenity.disabled_days || []).includes(idx);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={idx}
                                                                            onClick={() => {
                                                                                const currentDisabled = newAmenity.disabled_days || [];
                                                                                const newDisabled = currentDisabled.includes(idx)
                                                                                    ? currentDisabled.filter(d => d !== idx)
                                                                                    : [...currentDisabled, idx];
                                                                                setNewAmenity({ ...newAmenity, disabled_days: newDisabled });
                                                                            }}
                                                                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${isDisabled
                                                                                ? 'bg-gray-200 text-gray-400 dark:bg-neutral-800 dark:text-gray-600'
                                                                                : 'bg-blue-500 text-white shadow-md'
                                                                                }`}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reservation Settings */}
                                                    <div className="bg-white/40 dark:bg-black/20 rounded-xl p-4 border border-white/10 dark:border-white/5 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">
                                                                {t('properties.reservation_rules', 'Reservation Rules')}
                                                            </h3>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    checked={newAmenity.is_reservable}
                                                                    onChange={(e) => setNewAmenity({ ...newAmenity, is_reservable: e.target.checked })}
                                                                />
                                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                    {t('properties.is_reservable', 'Reservable')}
                                                                </span>
                                                            </label>
                                                        </div>

                                                        {newAmenity.is_reservable && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                                                                        {t('properties.reservation_type', 'Unit Type')}
                                                                    </label>
                                                                    <select
                                                                        className="glass-input w-full"
                                                                        value={newAmenity.type}
                                                                        onChange={(e) => setNewAmenity({ ...newAmenity, type: e.target.value })}
                                                                    >
                                                                        <option value="hour">{t('properties.type_hour', 'By Hour')}</option>
                                                                        <option value="day">{t('properties.type_day', 'By Day')}</option>
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                                                                        {newAmenity.type === 'day' ? t('properties.max_days', 'Max Days/Month') : t('properties.max_hours', 'Max Hours/Month')}
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        className="glass-input w-full"
                                                                        value={newAmenity.type === 'day' ? newAmenity.max_days : newAmenity.max_hours}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (newAmenity.type === 'day') setNewAmenity({ ...newAmenity, max_days: val });
                                                                            else setNewAmenity({ ...newAmenity, max_hours: val });
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <button type="button" onClick={cancelEditAmenity} className="glass-button-secondary">
                                                            {t('common.cancel', 'Cancel')}
                                                        </button>
                                                        <button type="submit" disabled={isSavingAmenity} className="glass-button w-full sm:w-auto relative flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed">
                                                            <span className={isSavingAmenity ? 'invisible' : ''}>{editingAmenityId ? t('common.save_changes', 'Save Changes') : t('properties.create_amenity', 'Create Amenity')}</span>
                                                            {isSavingAmenity && (
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
                                    </div>
                                </div>
                            </ModalPortal>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {amenities.map(amenity => (
                                <div key={amenity.id} className="glass-card relative group p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{amenity.name}</h3>
                                        {amenity.is_reservable && (
                                            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-medium">
                                                {t('properties.reservable', 'Reservable')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                                        {amenity.description || <span className="italic text-gray-400">{t('common.no_description')}</span>}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-4 mt-auto">
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                <span>
                                                    {amenity.reservation_limits?.schedule_start} - {amenity.reservation_limits?.schedule_end}
                                                </span>
                                            </div>
                                            {amenity.is_reservable && (
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                                                    <span>
                                                        {amenity.reservation_limits?.type === 'hour'
                                                            ? `${amenity.reservation_limits?.max_hours_per_day}h max`
                                                            : `${amenity.reservation_limits?.max_days_per_month}d/mo max`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditAmenity(amenity)}
                                                className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title={t('common.edit')}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => confirmDelete('amenity', amenity.id)}
                                                className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {amenities.length === 0 && (
                                <div className="col-span-full">
                                    <GlassEmptyState
                                        title={t('properties.no_amenities', 'No Amenities Found')}
                                        description={t('properties.no_amenities_desc', 'Add common areas or amenities to your community.')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false, type: null, id: null })}
                    onConfirm={handleExecuteDelete}
                    title={t('common.delete_confirmation')}
                    message={t('common.delete_warning')}
                    isLoading={isDeleting}
                    isDangerous={true}
                />

                {/* Edit Unit Modal */}
                {editUnitModal.isOpen && editUnitModal.unit && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setEditUnitModal({ isOpen: false, unit: null })}></div>
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                                <div className="inline-block align-bottom glass-card p-0 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full overflow-hidden">
                                    <div className="px-6 py-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {t('properties.edit_unit', 'Edit Unit')} {editUnitModal.unit.unit_number}
                                        </h3>
                                        <button onClick={() => setEditUnitModal({ isOpen: false, unit: null })} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-md px-6 py-6">
                                        <form onSubmit={handleUpdateUnit} className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        {t('properties.tenant_name', 'Tenant Name')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="glass-input w-full"
                                                        value={editUnitModal.unit.tenant_name || ''}
                                                        onChange={(e) => setEditUnitModal({
                                                            ...editUnitModal,
                                                            unit: { ...editUnitModal.unit, tenant_name: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        {t('properties.tenant_email', 'Tenant Email')}
                                                    </label>
                                                    <input
                                                        type="email"
                                                        className="glass-input w-full"
                                                        value={editUnitModal.unit.tenant_email || ''}
                                                        onChange={(e) => setEditUnitModal({
                                                            ...editUnitModal,
                                                            unit: { ...editUnitModal.unit, tenant_email: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        {t('properties.tenant_phone', 'Tenant Phone')}
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        className="glass-input w-full"
                                                        value={editUnitModal.unit.tenant_phone || ''}
                                                        onChange={(e) => setEditUnitModal({
                                                            ...editUnitModal,
                                                            unit: { ...editUnitModal.unit, tenant_phone: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Unit Details</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.unit_type_label', 'Type')}
                                                        </label>
                                                        <select
                                                            className="glass-input w-full"
                                                            value={editUnitModal.unit.type}
                                                            onChange={(e) => setEditUnitModal({
                                                                ...editUnitModal,
                                                                unit: { ...editUnitModal.unit, type: e.target.value }
                                                            })}
                                                        >
                                                            <option value="apartment">{t('properties.unit_type.apartment', 'Apartment')}</option>
                                                            <option value="house">{t('properties.unit_type.house', 'House')}</option>
                                                            <option value="commercial">{t('properties.unit_type.commercial', 'Commercial')}</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.coefficient', 'Coefficient')}
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.0001"
                                                                    className="glass-input w-full pr-8"
                                                                    value={editUnitModal.unit.coefficient}
                                                                    onChange={(e) => setEditUnitModal({
                                                                        ...editUnitModal,
                                                                        unit: { ...editUnitModal.unit, coefficient: e.target.value }
                                                                    })}
                                                                />
                                                                {editUnitModal.unit.coefficientFormat === 'percentage' && (
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                                                                )}
                                                            </div>
                                                            <select
                                                                className="glass-input w-24"
                                                                value={editUnitModal.unit.coefficientFormat}
                                                                onChange={(e) => setEditUnitModal({
                                                                    ...editUnitModal,
                                                                    unit: { ...editUnitModal.unit, coefficientFormat: e.target.value }
                                                                })}
                                                            >
                                                                <option value="percentage">%</option>
                                                                <option value="decimal">Dec</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            {t('properties.parking_slots', 'Parking')}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="glass-input w-full"
                                                            value={editUnitModal.unit.parking_slots}
                                                            onChange={(e) => setEditUnitModal({
                                                                ...editUnitModal,
                                                                unit: { ...editUnitModal.unit, parking_slots: parseInt(e.target.value) || 0 }
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                                checked={editUnitModal.unit.has_storage}
                                                                onChange={(e) => setEditUnitModal({
                                                                    ...editUnitModal,
                                                                    unit: { ...editUnitModal.unit, has_storage: e.target.checked }
                                                                })}
                                                            />
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                {t('properties.has_storage', 'Has Storage Unit')}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 mt-6">
                                                <button type="button" onClick={() => setEditUnitModal({ isOpen: false, unit: null })} className="glass-button-secondary">
                                                    {t('common.cancel', 'Cancel')}
                                                </button>
                                                <button type="submit" disabled={isUpdatingUnit} className="glass-button w-full sm:w-auto relative flex justify-center items-center">
                                                    <span className={isUpdatingUnit ? 'invisible' : ''}>{t('common.save_changes', 'Save Changes')}</span>
                                                    {isUpdatingUnit && (
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
                            </div>
                        </div>
                    </ModalPortal>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Properties;
