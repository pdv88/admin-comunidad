import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';

const Properties = () => {
    const [blocks, setBlocks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newBlock, setNewBlock] = useState('');
    const [newUnit, setNewUnit] = useState({ blockId: '', number: '', type: 'apartment' });
    const { t } = useTranslation();

    // Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null });

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
                 <div className="p-6">
                    <div>{t('properties.loading')}</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6">
                 {/* ... existing content ... */}
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('properties.title')}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Block */}
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                        <h2 className="font-bold mb-4 dark:text-white">{t('properties.add_block')}</h2>
                        <form onSubmit={handleCreateBlock}>
                            <input 
                                type="text" 
                                placeholder={t('properties.block_placeholder')} 
                                className="w-full mb-3 rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700 font-normal"
                                value={newBlock}
                                onChange={(e) => setNewBlock(e.target.value)}
                                required
                            />
                             <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">{t('properties.add_block_btn')}</button>
                        </form>
                    </div>

                    {/* Create Unit */}
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 lg:col-span-2">
                        <h2 className="font-bold mb-4 dark:text-white">{t('properties.add_unit')}</h2>
                        <form onSubmit={handleCreateUnit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <select 
                                className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
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
                                className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                value={newUnit.number}
                                onChange={(e) => setNewUnit({...newUnit, number: e.target.value})}
                                required
                            />
                            <select 
                                className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                value={newUnit.type}
                                onChange={(e) => setNewUnit({...newUnit, type: e.target.value})}
                            >
                                <option value="apartment">{t('properties.unit_type.apartment')}</option>
                                <option value="house">{t('properties.unit_type.house')}</option>
                                <option value="parking">{t('properties.unit_type.parking')}</option>
                                <option value="storage">{t('properties.unit_type.storage')}</option>
                            </select>
                            <button type="submit" className="bg-green-600 text-white py-2 rounded-lg">{t('properties.add_unit_btn')}</button>
                        </form>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('properties.current_structure')}</h2>
                    <div className="space-y-6">
                        {Array.isArray(blocks) && blocks.map(block => (
                            <div key={block.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                 <div className="bg-gray-50 dark:bg-neutral-700 px-6 py-3 border-b border-gray-200 dark:border-neutral-600 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 dark:text-white">{block.name}</h3>
                                    <div className="flex items-center gap-2">
                                         <span className="text-xs text-gray-500">{t('properties.representative')}:</span>
                                         <select 
                                            className="text-sm py-1 px-2 rounded border border-gray-300 dark:bg-neutral-800 dark:border-neutral-600"
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
                                                <div key={unit.id} className="relative group text-center p-2 bg-gray-100 dark:bg-neutral-900 rounded border border-gray-200 dark:border-neutral-700">
                                                    <button 
                                                        onClick={() => confirmDelete('unit', unit.id)}
                                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                                                        title={t('common.delete', 'Delete')}
                                                    >
                                                        &times;
                                                    </button>
                                                    <span className="block font-bold text-gray-800 dark:text-white">{unit.unit_number}</span>
                                                    <div className="text-xs mt-1 truncate max-w-[100px] mx-auto">
                                                        {unit.profiles && unit.profiles.length > 0 ? (
                                                            <span className="text-blue-600 dark:text-blue-400 font-medium" title={unit.profiles[0].full_name}>
                                                                {unit.profiles[0].full_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 italic">
                                                                {t('properties.unoccupied', 'Unoccupied')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-500 uppercase block mt-1">
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
        </DashboardLayout>
    );
};

export default Properties;
