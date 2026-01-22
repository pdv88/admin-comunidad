import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';
import ModalPortal from '../components/ModalPortal';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';

const Properties = () => {
    const [blocks, setBlocks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newBlock, setNewBlock] = useState('');
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
    const [newUnit, setNewUnit] = useState({ blockId: '', number: '', type: 'apartment' });
    
    // Loading state for assigning representative
    const [assigningRepBlockId, setAssigningRepBlockId] = useState(null);

    const [toast, setToast] = useState({ message: '', type: 'success' });
    const { t } = useTranslation();

    // Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null });

    const [editUnitModal, setEditUnitModal] = useState({ isOpen: false, unit: null });
    const [amenityModalOpen, setAmenityModalOpen] = useState(false);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [unitModalOpen, setUnitModalOpen] = useState(false);

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
                });
                setBlocks(blocksData);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBlock = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/properties/blocks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBlock })
            });

            if (res.ok) {
                setNewBlock('');
                setBlockModalOpen(false);
                fetchData();
                setToast({ message: t('properties.block_created', 'Block created successfully'), type: 'success' });
            } else {
                setToast({ message: t('common.error', 'Error creating block'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('common.error', 'Error creating block'), type: 'error' });
        }
    };

    const handleCreateUnit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/properties/units`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    block_id: newUnit.blockId, 
                    unit_number: newUnit.number,
                    type: newUnit.type
                })
            });

            if (res.ok) {
                setNewUnit({ blockId: '', number: '', type: 'apartment' });
                setUnitModalOpen(false);
                fetchData();
                setToast({ message: t('properties.unit_created', 'Unit created successfully'), type: 'success' });
            } else {
                 setToast({ message: t('common.error', 'Error creating unit'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('common.error', 'Error creating unit'), type: 'error' });
        }
    };

    const handleCreateAmenity = async (e) => {
        e.preventDefault();
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
                setToast({ message: editingAmenityId ? 'Amenity updated successfully' : 'Amenity created successfully', type: 'success' });
            } else {
                setToast({ message: 'Error saving amenity', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: 'Error saving amenity', type: 'error' });
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
        setEditUnitModal({
            isOpen: true,
            unit: { ...unit } // Copy unit data
        });
    };

    const handleUpdateUnit = async (e) => {
        e.preventDefault();
        try {
            const { id, tenant_name, tenant_email, tenant_phone } = editUnitModal.unit;
            const res = await fetch(`${API_URL}/api/properties/units/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_name, tenant_email, tenant_phone })
            });
            if (res.ok) {
                fetchData();
                setEditUnitModal({ isOpen: false, unit: null });
                setToast({ message: t('properties.update_success', 'Tenant info updated'), type: 'success' });
            } else {
                setToast({ message: t('common.error_occurred', 'An error occurred'), type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: t('common.error_occurred', 'An error occurred'), type: 'error' });
        }
    };

    const confirmDelete = (type, id) => {
        setDeleteModal({ isOpen: true, type, id });
    };



    const handleExecuteDelete = async () => {
        const { type, id } = deleteModal;
        if (!type || !id) return;

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
                                    onClick={() => setBlockModalOpen(true)}
                                    className="glass-button bg-blue-600 text-white flex items-center gap-2"
                                >
                                    <span>+</span> {t('properties.add_block')}
                                </button>
                                <button 
                                    onClick={() => setUnitModalOpen(true)}
                                    className="glass-button bg-gradient-to-r from-emerald-500 to-teal-500 border-none shadow-emerald-500/20 flex items-center gap-2"
                                >
                                    <span>+</span> {t('properties.add_unit')}
                                </button>
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
                                <div className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                                    <div className="px-6 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {t('properties.add_block')}
                                        </h3>
                                        <button onClick={() => setBlockModalOpen(false)} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                                    </div>
                                    <div className="bg-white dark:bg-neutral-800 px-6 py-6">
                                        <form onSubmit={handleCreateBlock}>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('properties.block_name', 'Block Name')}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder={t('properties.block_placeholder')} 
                                                    className="glass-input w-full"
                                                    value={newBlock}
                                                    onChange={(e) => setNewBlock(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3 mt-6">
                                                <button type="button" onClick={() => setBlockModalOpen(false)} className="glass-button-secondary">
                                                    {t('common.cancel', 'Cancel')}
                                                </button>
                                                <button type="submit" className="glass-button w-full sm:w-auto">
                                                    {t('properties.add_block_btn')}
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
                                <div className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                    <div className="px-6 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {t('properties.add_unit')}
                                        </h3>
                                        <button onClick={() => setUnitModalOpen(false)} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                                    </div>
                                    <div className="bg-white dark:bg-neutral-800 px-6 py-6">
                                        <form onSubmit={handleCreateUnit} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('properties.select_block')}
                                                </label>
                                                <select 
                                                    className="glass-input w-full"
                                                    value={newUnit.blockId}
                                                    onChange={(e) => setNewUnit({...newUnit, blockId: e.target.value})}
                                                    required
                                                >
                                                    <option value="">{t('properties.select_block')}</option>
                                                    {Array.isArray(blocks) && blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('properties.unit_number', 'Unit Number')}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder={t('properties.unit_placeholder')} 
                                                    className="glass-input w-full"
                                                    value={newUnit.number}
                                                    onChange={(e) => setNewUnit({...newUnit, number: e.target.value})}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('properties.unit_type_label', 'Type')}
                                                </label>
                                                <select 
                                                    className="glass-input w-full"
                                                    value={newUnit.type}
                                                    onChange={(e) => setNewUnit({...newUnit, type: e.target.value})}
                                                >
                                                    <option value="apartment">{t('properties.unit_type.apartment')}</option>
                                                    <option value="house">{t('properties.unit_type.house')}</option>
                                                    <option value="parking">{t('properties.unit_type.parking')}</option>
                                                    <option value="storage">{t('properties.unit_type.storage')}</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-end gap-3 mt-6">
                                                <button type="button" onClick={() => setUnitModalOpen(false)} className="glass-button-secondary">
                                                    {t('common.cancel', 'Cancel')}
                                                </button>
                                                <button type="submit" className="glass-button bg-gradient-to-r from-emerald-500 to-teal-500 border-none shadow-emerald-500/20 w-full sm:w-auto">
                                                    {t('properties.add_unit_btn')}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )}

                <div className="mt-8">
                    {/* List content starts here... */}
                    <div className="space-y-6">
                        {Array.isArray(blocks) && blocks.map(block => (
                            <div key={block.id} className="glass-card overflow-hidden">
                                 <div className="bg-white/30 dark:bg-white/5 px-6 py-3 border-b border-white/20 dark:border-neutral-700/30 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 dark:text-white">{block.name}</h3>
                                    <div className="flex items-center gap-2">
                                         <span className="text-xs text-gray-500">{t('properties.representative')}:</span>
                                         {assigningRepBlockId === block.id ? (
                                             <div className="ml-2 flex items-center justify-center w-6 h-6">
                                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                             </div>
                                         ) : (
                                             <select 
                                                className="ml-2 text-sm py-1 px-3 rounded-lg border-none bg-white/40 dark:bg-neutral-800/40 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/50"
                                                value={block.representative_id || ''}
                                                onChange={(e) => handleAssignRep(block.id, e.target.value)}
                                                disabled={assigningRepBlockId !== null}
                                             >
                                                <option value="">{t('properties.none')}</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name || u.email || 'User'}</option>
                                                ))}
                                             </select>
                                         )}
                                    </div>
                                </div>
                                <div className="p-6">
                                    {block.units && block.units.length > 0 ? (
                                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                            {block.units.map(unit => (
                                                <div key={unit.id} className="relative group text-center p-2 rounded-xl bg-white/40 dark:bg-neutral-800/40 border border-white/20 dark:border-neutral-700/30 shadow-sm hover:bg-white/60 dark:hover:bg-neutral-700/60 transition-all duration-300">
                                                    <button 
                                                        onClick={() => confirmDelete('unit', unit.id)}
                                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                                                        title={t('common.delete', 'Delete')}
                                                        aria-label={t('common.delete', 'Delete')}
                                                    >
                                                        &times;
                                                    </button>
                                                    <span className="block font-bold text-gray-800 dark:text-white">{unit.unit_number}</span>
                                                    <div className="text-xs mt-1 truncate max-w-[100px] mx-auto text-left">
                                                        {unit.unit_owners && unit.unit_owners.length > 0 && unit.unit_owners[0].profiles ? (
                                                            <div title={t('properties.owner') + ': ' + unit.unit_owners[0].profiles.full_name}>
                                                                <span className="text-gray-500 font-semibold">{t('properties.owner')}: </span>
                                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                                    {unit.unit_owners[0].profiles.full_name.split(' ')[0]}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic block text-center">
                                                                {t('properties.unoccupied', 'Unoccupied')}
                                                            </span>
                                                        )}
                                                        {unit.tenant_name && (
                                                            <div title={t('properties.tenant') + ': ' + unit.tenant_name}>
                                                                <span className="text-gray-500 font-semibold">{t('properties.tenant')}: </span>
                                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                                    {unit.tenant_name.split(' ')[0]} 
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => handleEditUnit(unit)}
                                                        className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                                                        title={t('common.edit', 'Edit')}
                                                        aria-label={t('common.edit', 'Edit')}
                                                    >
                                                        &#9998;
                                                    </button>
                                                    <span className="text-xs text-gray-500 uppercase">
                                                        {t(`properties.unit_type.${unit.type}`) !== `properties.unit_type.${unit.type}` ? t(`properties.unit_type.${unit.type}`) : unit.type}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <p className="text-gray-500 text-sm">{t('properties.no_units')}</p>
                                            <button 
                                                onClick={() => confirmDelete('block', block.id)}
                                                className="text-red-500 text-xs hover:underline"
                                            >
                                                {t('properties.delete_block', 'Delete Block')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                </>
                ) : (
                <div className="space-y-6">
                    {/* Top Bar with Create Button */ }


                    {/* Amenity Form Modal */}
                    {amenityModalOpen && (
                        <ModalPortal>
                             <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={cancelEditAmenity}></div>
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
                                                            placeholder="e.g. Swimming Pool, BBQ Area" 
                                                            className="glass-input w-full"
                                                            value={newAmenity.name}
                                                            onChange={(e) => setNewAmenity({...newAmenity, name: e.target.value})}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                                                            {t('properties.description', 'Description')}
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Brief description..." 
                                                            className="glass-input w-full"
                                                            value={newAmenity.description}
                                                            onChange={(e) => setNewAmenity({...newAmenity, description: e.target.value})}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Availability Schedule */}
                                                <div className="bg-white/40 dark:bg-black/20 rounded-xl p-4 border border-white/10 dark:border-white/5 space-y-3">
                                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">
                                                        {t('properties.availability', 'Availability')}
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {/* Time Range */}
                                                        <div className="grid grid-cols-2 gap-4 max-w-md">
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('properties.opening_time', 'Opening Time')}</label>
                                                                <input 
                                                                    type="time" 
                                                                    className="glass-input w-full py-1"
                                                                    value={newAmenity.schedule_start || '06:00'}
                                                                    onChange={(e) => setNewAmenity({...newAmenity, schedule_start: e.target.value})}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('properties.closing_time', 'Closing Time')}</label>
                                                                <input 
                                                                    type="time" 
                                                                    className="glass-input w-full py-1"
                                                                    value={newAmenity.schedule_end || '23:00'}
                                                                    onChange={(e) => setNewAmenity({...newAmenity, schedule_end: e.target.value})}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Allowed Days */}
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                                                                {t('properties.open_days', 'Open Days')}
                                                            </label>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                                                    <label key={day} className="cursor-pointer relative">
                                                                        <input 
                                                                            type="checkbox"
                                                                            className="sr-only peer"
                                                                            checked={!newAmenity.disabled_days?.includes(idx)}
                                                                            onChange={(e) => {
                                                                                const dayIndex = idx;
                                                                                let current = newAmenity.disabled_days || [];
                                                                                if (e.target.checked) {
                                                                                    // Remove from disabled (enable it)
                                                                                    current = current.filter(d => d !== dayIndex);
                                                                                } else {
                                                                                    // Add to disabled
                                                                                    current = [...current, dayIndex];
                                                                                }
                                                                                setNewAmenity({...newAmenity, disabled_days: current});
                                                                            }}
                                                                        />
                                                                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 border border-transparent peer-checked:bg-blue-100 peer-checked:text-blue-600 peer-checked:border-blue-200 dark:peer-checked:bg-blue-900/30 dark:peer-checked:text-blue-400 transition-all text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700">
                                                                            {day.slice(0, 1)}
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Exception Days */}
                                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                                                                {t('properties.exception_days', 'Exception Days (Closed)')}
                                                            </label>
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {(newAmenity.exception_days || []).map((date, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-2 py-1 rounded text-xs border border-red-100 dark:border-red-900/30">
                                                                        <span>{date}</span>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                                const newDays = [...(newAmenity.exception_days || [])];
                                                                                newDays.splice(idx, 1);
                                                                                setNewAmenity({...newAmenity, exception_days: newDays});
                                                                            }}
                                                                            className="hover:text-red-800 font-bold ml-1"
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="date" 
                                                                    className="glass-input py-1 text-sm w-auto"
                                                                    id="exception-date-input"
                                                                />
                                                                <button 
                                                                    type="button" 
                                                                    className="glass-button-secondary py-1 px-3 text-sm"
                                                                    onClick={() => {
                                                                        const input = document.getElementById('exception-date-input');
                                                                        if (input && input.value) {
                                                                            if (!newAmenity.exception_days?.includes(input.value)) {
                                                                                setNewAmenity({
                                                                                    ...newAmenity, 
                                                                                    exception_days: [...(newAmenity.exception_days || []), input.value].sort()
                                                                                });
                                                                            }
                                                                            input.value = '';
                                                                        }
                                                                    }}
                                                                >
                                                                    {t('common.add', 'Add')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Settings Panel */}
                                                <div className="bg-white/40 dark:bg-black/20 rounded-xl p-4 border border-white/10 dark:border-white/5 space-y-4">
                                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">
                                                        {t('properties.settings', 'Configuration')}
                                                    </h3>
                                                    
                                                    {/* Reservable Toggle */}
                                                    <div className="flex flex-wrap items-center gap-8">
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <div className="relative inline-flex items-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="sr-only peer"
                                                                    checked={newAmenity.is_reservable}
                                                                    onChange={(e) => setNewAmenity({...newAmenity, is_reservable: e.target.checked})}
                                                                />
                                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                                                                {t('properties.reservable', 'Reservable')}
                                                            </span>
                                                        </label>

                                                        {/* Reservation Type */}
                                                        {newAmenity.is_reservable && (
                                                            <div className="flex items-center gap-4 animate-fadeIn">
                                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('properties.type', 'Type')}:</label>
                                                                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setNewAmenity({...newAmenity, type: 'hour'})}
                                                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${newAmenity.type === 'hour' ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                    >
                                                                        {t('properties.hourly', 'Hourly')}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setNewAmenity({...newAmenity, type: 'day'})}
                                                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${newAmenity.type === 'day' ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                    >
                                                                        {t('properties.daily', 'Daily')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Max Hours or Max Days */}
                                                        {newAmenity.is_reservable && (
                                                            <div className="flex items-center gap-3 animate-fadeIn">
                                                                <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>
                                                                <div className="flex flex-col">
                                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                                        {newAmenity.type === 'day' ? t('properties.max_days_month', 'Max Days/Month') : t('properties.max_hours_day', 'Max Hours/Day')}
                                                                    </label>
                                                                    <div className="flex items-center gap-2">
                                                                        <input 
                                                                            type="number" 
                                                                            className="glass-input w-20 py-1 text-center"
                                                                            value={(newAmenity.type === 'day' ? newAmenity.max_days : newAmenity.max_hours) || 0}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (newAmenity.type === 'day') {
                                                                                    setNewAmenity({...newAmenity, max_days: val});
                                                                                } else {
                                                                                    setNewAmenity({...newAmenity, max_hours: val});
                                                                                }
                                                                            }}
                                                                            min="0"
                                                                        />
                                                                        <span className="text-xs text-gray-400">
                                                                            {newAmenity.type === 'day' ? t('common.days', 'days') : t('common.hours', 'hrs')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-3 pt-4 border-t border-white/20 dark:border-white/10">
                                                    <button type="button" onClick={cancelEditAmenity} className="glass-button-secondary">
                                                        {t('common.cancel', 'Cancel')}
                                                    </button>
                                                    <button type="submit" className="glass-button px-8">
                                                        {editingAmenityId ? t('properties.update_amenity', 'Update Amenity') : t('properties.create_amenity', 'Create Amenity')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </ModalPortal>
                    )}

                    {/* Amenities List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {amenities.map(amenity => (
                            <div key={amenity.id} className="glass-card p-6 relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg dark:text-white">{amenity.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleEditAmenity(amenity)}
                                            className="text-gray-400 hover:text-blue-500 transition-colors"
                                            title={t('common.edit', 'Edit')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => confirmDelete('amenity', amenity.id)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-3">{amenity.description || 'No description'}</p>
                                
                                {/* Open Days Display */}
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <span>
                                        {(() => {
                                            const days = amenity.reservation_limits?.allowed_days;
                                            if (!days || days.length === 7) return t('properties.every_day', 'Every Day');
                                            if (days.length === 0) return t('properties.closed', 'Closed');
                                            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                            // Sort days just in case
                                            return days.slice().sort((a,b)=>a-b).map(d => dayNames[d]).join(', ');
                                        })()}
                                    </span>
                                    {amenity.reservation_limits?.schedule_start && (
                                        <span className="ml-1 opacity-75">
                                            ({amenity.reservation_limits.schedule_start.slice(0,5)} - {amenity.reservation_limits.schedule_end.slice(0,5)})
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {amenity.is_reservable ? (
                                        <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                            {t('properties.reservable', 'Reservable')}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                            {t('properties.not_reservable', 'Not Reservable')}
                                        </span>
                                    )}
                                    {amenity.is_reservable && (
                                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            {amenity.reservation_limits?.type === 'day' 
                                                ? t('properties.limit_days', {count: amenity.reservation_limits.max_days_per_month})
                                                : t('properties.limit_hours', {count: amenity.reservation_limits?.max_hours_per_day || 0})
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleExecuteDelete}
                title={deleteModal.type === 'block' ? t('properties.delete_block', 'Delete Block') : t('properties.delete_unit', 'Delete Unit')}
                message={deleteModal.type === 'block' ? t('properties.confirm_delete_block', 'Are you sure you want to delete this block? This action cannot be undone.') : t('properties.confirm_delete_unit', 'Are you sure you want to delete this unit? This action cannot be undone.')}
                isDangerous={true}
                confirmText={t('common.delete', 'Delete')}
            />

            {/* Edit Unit/Tenant Modal */}
            {editUnitModal.isOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditUnitModal({ isOpen: false, unit: null })}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-neutral-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                    {t('properties.edit_tenant_info', 'Edit Tenant Info')} - {editUnitModal.unit.unit_number}
                                </h3>
                                <form onSubmit={handleUpdateUnit} className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('properties.tenant_name', 'Tenant Name')}</label>
                                        <input 
                                            type="text" 
                                            className="glass-input"
                                            value={editUnitModal.unit.tenant_name || ''}
                                            onChange={e => setEditUnitModal({ ...editUnitModal, unit: { ...editUnitModal.unit, tenant_name: e.target.value } })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('properties.tenant_email', 'Tenant Email')}</label>
                                        <input 
                                            type="email" 
                                            className="glass-input"
                                            value={editUnitModal.unit.tenant_email || ''}
                                            onChange={e => setEditUnitModal({ ...editUnitModal, unit: { ...editUnitModal.unit, tenant_email: e.target.value } })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('properties.tenant_phone', 'Tenant Phone')}</label>
                                        <input 
                                            type="text" 
                                            className="glass-input"
                                            value={editUnitModal.unit.tenant_phone || ''}
                                            onChange={e => setEditUnitModal({ ...editUnitModal, unit: { ...editUnitModal.unit, tenant_phone: e.target.value } })}
                                        />
                                    </div>
                                    <div className="flex justify-end pt-4 space-x-3">
                                        <button 
                                            type="button" 
                                            className="glass-button-secondary"
                                            onClick={() => setEditUnitModal({ isOpen: false, unit: null })}
                                        >
                                            {t('common.cancel', 'Cancel')}
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="glass-button"
                                        >
                                            {t('common.save', 'Save')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </DashboardLayout>
    );
};

export default Properties;
