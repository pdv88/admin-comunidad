import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import GlassSelect from './GlassSelect';
import ModalPortal from './ModalPortal';

const HierarchicalUnitSelector = ({ blocks: initialBlocks, activeCommunity, onSelectUnit, onCancel, onStructureChange }) => {
    const { t } = useTranslation();
    const [currentParentId, setCurrentParentId] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: t('properties.hierarchy.root', 'Root') }]);
    const [localBlocks, setLocalBlocks] = useState(initialBlocks || []);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [isCreating, setIsCreating] = useState(false); // 'block' | 'unit' | false
    const [newItem, setNewItem] = useState({ name: '', type: 'block', unit_number: '', unit_type: 'apartment', coefficient: '', coefficientFormat: 'decimal', parking_slots: 0, has_storage: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Update local state if props change
    useEffect(() => {
        setLocalBlocks(initialBlocks || []);
    }, [initialBlocks]);

    // Filter items based on current level
    useEffect(() => {
        const childrenBlocks = localBlocks.filter(b => b.parent_id === currentParentId);

        // Find current block to get its units
        const currentBlock = currentParentId ? localBlocks.find(b => b.id === currentParentId) : null;
        const childrenUnits = currentBlock?.units || [];

        setDisplayedItems([
            ...childrenBlocks.map(b => ({ ...b, itemType: 'block' })),
            ...childrenUnits.map(u => ({ ...u, itemType: 'unit' }))
        ]);
    }, [currentParentId, localBlocks]);

    const handleNavigate = (block) => {
        setCurrentParentId(block.id);
        setBreadcrumbs(prev => [...prev, { id: block.id, name: block.name }]);
    };

    const handleBreadcrumbClick = (index) => {
        const target = breadcrumbs[index];
        setCurrentParentId(target.id);
        setBreadcrumbs(prev => prev.slice(0, index + 1));
    };

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Community-ID': activeCommunity.community_id
            };

            let res, data;

            if (isCreating === 'unit') {
                // Calculate coefficient based on format
                let finalCoefficient = newItem.coefficient;
                if (newItem.coefficient && newItem.coefficientFormat === 'percentage') {
                    finalCoefficient = parseFloat(newItem.coefficient) / 100;
                }

                res = await fetch(`${API_URL}/api/properties/units`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        block_id: currentParentId,
                        unit_number: newItem.unit_number,
                        type: newItem.unit_type || 'apartment',
                        coefficient: finalCoefficient,
                        parking_slots: newItem.parking_slots || 0,
                        has_storage: newItem.has_storage || false
                    })
                });
            } else {
                res = await fetch(`${API_URL}/api/properties/blocks`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        parent_id: currentParentId,
                        name: newItem.name,
                        structure_type: newItem.type
                    })
                });
            }

            data = await res.json();

            if (res.ok) {
                // Determine what to do next
                if (isCreating === 'unit') {
                    // Update the parent block's units array in localBlocks
                    setLocalBlocks(prev => prev.map(b => {
                        if (b.id === currentParentId) {
                            return {
                                ...b,
                                units: [...(b.units || []), data]
                            };
                        }
                        return b;
                    }));
                } else {
                    // If block created, add to localBlocks
                    setLocalBlocks(prev => [...prev, { ...data, units: [] }]);
                }

                setIsCreating(false);
                setNewItem({ name: '', type: 'block', unit_number: '', unit_type: 'apartment', coefficient: '', coefficientFormat: 'decimal', parking_slots: 0, has_storage: false });

                // Notify parent to refresh structure
                if (onStructureChange) {
                    setTimeout(() => onStructureChange(), 100);
                }
            } else {
                setError(data.error || 'Error creating item');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[300px] bg-transparent">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 p-2 bg-gray-50/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-t-lg overflow-x-auto text-sm border-b border-gray-200/50 dark:border-neutral-700/50">
                {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id || 'root'}>
                        {idx > 0 && <span className="text-gray-400">/</span>}
                        <button
                            type="button"
                            onClick={() => handleBreadcrumbClick(idx)}
                            className={`whitespace-nowrap hover:text-indigo-600 dark:hover:text-indigo-400 ${idx === breadcrumbs.length - 1 ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            {crumb.id === null ? t('properties.hierarchy.root', 'Inicio') : crumb.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {displayedItems.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm italic">
                        {t('common.no_items', 'No items found')}
                    </div>
                )}

                {displayedItems.map(item => (
                    <div
                        key={`${item.itemType}-${item.id}`}
                        onClick={() => item.itemType === 'block' ? handleNavigate(item) : onSelectUnit(item.id)}
                        className={`
                            flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border backdrop-blur-sm
                            ${item.itemType === 'block'
                                ? 'bg-white/40 dark:bg-neutral-800/40 border-gray-200/50 dark:border-neutral-700/50 hover:bg-white/60 dark:hover:bg-neutral-700/60'
                                : 'bg-indigo-50/40 dark:bg-indigo-900/20 border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`p-1.5 rounded-md ${item.itemType === 'block' ? 'bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-gray-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'}`}>
                                {item.itemType === 'block' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                )}
                            </span>
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {item.itemType === 'block' ? item.name : `${t(`properties.unit_type.${item.type || 'apartment'}`, t('user_management.table.unit'))} ${item.unit_number}`}
                                </span>
                                {item.itemType === 'block' && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                        {t(`properties.types.${item.structure_type}`, item.structure_type)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {item.itemType === 'block' && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer / Actions */}
            <div className="p-2 border-t border-gray-200/50 dark:border-neutral-700/50 flex gap-2">
                <button
                    type="button"
                    onClick={() => setIsCreating('block')}
                    className={`glass-button-secondary py-2.5 px-4 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    {t('properties.add_sub_block', 'Add Block')}
                </button>

                {/* Only show 'Add Unit' if inside a block (currentParentId exists) */}
                {currentParentId && (
                    <button
                        type="button"
                        onClick={() => setIsCreating('unit')}
                        className="glass-button-secondary py-2.5 px-4 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        {t('properties.add_unit', 'Add Unit')}
                    </button>
                )}
            </div>

            {/* Creation Modal */}
            {isCreating && (
                <ModalPortal>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="glass-card w-full max-w-lg p-6 animate-fade-in">
                            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
                                {isCreating === 'unit' ? t('properties.add_unit', 'Add Unit') : t('properties.add_sub_block', 'Add Block')}
                            </h3>

                            {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

                            <div
                                className="space-y-4"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleCreate();
                                    }
                                }}
                            >
                                {isCreating === 'block' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('properties.structure_name', 'Name')}</label>
                                            <input
                                                type="text"
                                                placeholder={t('properties.structure_name', 'e.g., Staircase A')}
                                                className="glass-input w-full"
                                                value={newItem.name}
                                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                                autoFocus
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('properties.structure_type', 'Type')}</label>
                                            <GlassSelect
                                                value={newItem.type}
                                                onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                                options={[
                                                    { value: 'block', label: t('properties.types.block') },
                                                    { value: 'portal', label: t('properties.types.portal') },
                                                    { value: 'staircase', label: t('properties.types.staircase') },
                                                    { value: 'tower', label: t('properties.types.tower') },
                                                    { value: 'level', label: t('properties.types.level') }
                                                ]}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('properties.unit_number', 'Unit Number')}</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., 101"
                                                    className="glass-input w-full"
                                                    value={newItem.unit_number}
                                                    onChange={e => setNewItem({ ...newItem, unit_number: e.target.value })}
                                                    required
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('properties.unit_type_label', 'Type')}</label>
                                                <select
                                                    className="glass-input w-full h-[42px]"
                                                    value={newItem.unit_type || 'apartment'}
                                                    onChange={e => setNewItem({ ...newItem, unit_type: e.target.value })}
                                                >
                                                    <option value="apartment">{t('properties.unit_type.apartment', 'Apartment')}</option>
                                                    <option value="house">{t('properties.unit_type.house', 'House')}</option>
                                                    <option value="commercial">{t('properties.unit_type.commercial', 'Commercial')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('properties.coefficient', 'Coefficient')}</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        className="glass-input flex-1"
                                                        value={newItem.coefficient}
                                                        onChange={e => setNewItem({ ...newItem, coefficient: e.target.value })}
                                                    />
                                                    <select
                                                        className="glass-input w-20"
                                                        value={newItem.coefficientFormat}
                                                        onChange={e => setNewItem({ ...newItem, coefficientFormat: e.target.value })}
                                                    >
                                                        <option value="decimal">Dec</option>
                                                        <option value="percentage">%</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('properties.parking_slots', 'Parking Slots')}</label>
                                                <input
                                                    type="number"
                                                    className="glass-input w-full"
                                                    value={newItem.parking_slots}
                                                    onChange={e => setNewItem({ ...newItem, parking_slots: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                                            <input
                                                type="checkbox"
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                                checked={newItem.has_storage}
                                                onChange={e => setNewItem({ ...newItem, has_storage: e.target.checked })}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-neutral-300">{t('properties.has_storage', 'Has Storage')}</span>
                                        </label>
                                    </>
                                )}

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-neutral-700">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="glass-button-secondary py-2 px-6"
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCreate()}
                                        disabled={loading}
                                        className="glass-button py-2 px-6 min-w-[100px]"
                                    >
                                        {loading ? t('common.saving', 'Saving...') : t('common.create', 'Create')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};

export default HierarchicalUnitSelector;

