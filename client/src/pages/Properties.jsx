import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';
import ModalPortal from '../components/ModalPortal';
import GlassLoader from '../components/GlassLoader';

const Properties = () => {
    const [blocks, setBlocks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newBlock, setNewBlock] = useState('');
    const [newUnit, setNewUnit] = useState({ blockId: '', number: '', type: 'apartment' });
    const { t } = useTranslation();

    // Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null });
    const [editUnitModal, setEditUnitModal] = useState({ isOpen: false, unit: null });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [blocksRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/api/properties/blocks`),
                fetch(`${API_URL}/api/properties/users`)
            ]);
            setUsers((await usersRes.json()).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
            
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
                fetchData();
            }
        } catch (error) {
            console.error(error);
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
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssignRep = async (blockId, userId) => {
        try {
            const res = await fetch(`${API_URL}/api/properties/blocks/${blockId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ representative_id: userId || null })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error(error);
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
            } else {
                alert(t('common.error_occurred'));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const confirmDelete = (type, id) => {
        setDeleteModal({ isOpen: true, type, id });
    };

    const handleExecuteDelete = async () => {
        const { type, id } = deleteModal;
        if (!type || !id) return;

        const endpoint = type === 'block' 
            ? `${API_URL}/api/properties/blocks/${id}` 
            : `${API_URL}/api/properties/units/${id}`;

        try {
            const res = await fetch(endpoint, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchData();
                setDeleteModal({ isOpen: false, type: null, id: null });
            } else {
                alert(t('common.error_occurred', 'An error occurred'));
            }
        } catch (error) {
            console.error(error);
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
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                 {/* ... existing content ... */}
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('properties.title')}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Block */}
                    <div className="glass-card p-6">
                        <h2 className="font-bold mb-4 dark:text-white">{t('properties.add_block')}</h2>
                        <form onSubmit={handleCreateBlock}>
                            <input 
                                type="text" 
                                placeholder={t('properties.block_placeholder')} 
                                className="glass-input mb-3"
                                value={newBlock}
                                onChange={(e) => setNewBlock(e.target.value)}
                                required
                            />
                             <button type="submit" className="glass-button w-full">{t('properties.add_block_btn')}</button>
                        </form>
                    </div>

                    {/* Create Unit */}
                    <div className="glass-card p-6 lg:col-span-2">
                        <h2 className="font-bold mb-4 dark:text-white">{t('properties.add_unit')}</h2>
                        <form onSubmit={handleCreateUnit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <select 
                                className="glass-input"
                                value={newUnit.blockId}
                                onChange={(e) => setNewUnit({...newUnit, blockId: e.target.value})}
                                required
                            >
                                <option value="">{t('properties.select_block')}</option>
                                {Array.isArray(blocks) && blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                             <input 
                                type="text" 
                                placeholder={t('properties.unit_placeholder')} 
                                className="glass-input"
                                value={newUnit.number}
                                onChange={(e) => setNewUnit({...newUnit, number: e.target.value})}
                                required
                            />
                            <select 
                                className="glass-input"
                                value={newUnit.type}
                                onChange={(e) => setNewUnit({...newUnit, type: e.target.value})}
                            >
                                <option value="apartment">{t('properties.unit_type.apartment')}</option>
                                <option value="house">{t('properties.unit_type.house')}</option>
                                <option value="parking">{t('properties.unit_type.parking')}</option>
                                <option value="storage">{t('properties.unit_type.storage')}</option>
                            </select>
                            <button type="submit" className="glass-button bg-gradient-to-r from-emerald-500 to-teal-500 border-none shadow-emerald-500/20">{t('properties.add_unit_btn')}</button>
                        </form>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('properties.current_structure')}</h2>
                    <div className="space-y-6">
                        {Array.isArray(blocks) && blocks.map(block => (
                            <div key={block.id} className="glass-card overflow-hidden">
                                 <div className="bg-white/30 dark:bg-white/5 px-6 py-3 border-b border-white/20 dark:border-neutral-700/30 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 dark:text-white">{block.name}</h3>
                                    <div className="flex items-center gap-2">
                                         <span className="text-xs text-gray-500">{t('properties.representative')}:</span>
                                         <select 
                                            className="ml-2 text-sm py-1 px-3 rounded-lg border-none bg-white/40 dark:bg-neutral-800/40 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500/50"
                                            value={block.representative_id || ''}
                                            onChange={(e) => handleAssignRep(block.id, e.target.value)}
                                         >
                                            <option value="">{t('properties.none')}</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email || 'User'}</option>
                                            ))}
                                         </select>
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
