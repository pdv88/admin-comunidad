import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const DrillDownUnitSelector = ({
    blocks,
    selectedUnitId,
    onSelectUnit
}) => {
    const { t } = useTranslation();
    const [currentParentId, setCurrentParentId] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: t('properties.hierarchy.root', 'Root') }]);

    // Find children blocks of current level
    const childBlocks = blocks.filter(b => b.parent_id === currentParentId);

    // Find units of current level (if valid block)
    // If currentParentId is null (root), typically no units directly attached (unless logic changes), 
    // usually units are in blocks.
    const currentBlock = blocks.find(b => b.id === currentParentId);
    const currentUnits = currentBlock?.units || [];

    const handleNavigate = (block) => {
        setCurrentParentId(block.id);
        setBreadcrumbs(prev => [...prev, { id: block.id, name: block.name }]);
    };

    const handleBreadcrumbClick = (index) => {
        const target = breadcrumbs[index];
        setCurrentParentId(target.id);
        setBreadcrumbs(prev => prev.slice(0, index + 1));
    };

    return (
        <div className="flex flex-col h-[300px] bg-white/20 dark:bg-neutral-900/20 rounded-xl border border-gray-200/50 dark:border-neutral-700/50 overflow-hidden backdrop-blur-sm">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 p-3 bg-gray-50/50 dark:bg-neutral-800/50 border-b border-gray-200/50 dark:border-neutral-700/50 overflow-x-auto text-sm shrink-0">
                {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id || 'root'}>
                        {idx > 0 && <span className="text-gray-400">/</span>}
                        <button
                            type="button"
                            onClick={() => handleBreadcrumbClick(idx)}
                            className={`whitespace-nowrap hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${idx === breadcrumbs.length - 1 ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            {crumb.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {childBlocks.length === 0 && currentUnits.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm italic">
                        {t('common.no_items', 'No items found')}
                    </div>
                ) : (
                    <>
                        {/* Blocks (Folders) */}
                        {childBlocks.map(block => (
                            <div
                                key={block.id}
                                onClick={() => handleNavigate(block)}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/40 dark:hover:bg-neutral-800/40 border border-transparent hover:border-gray-200/50 dark:hover:border-neutral-700/50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{block.name}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                            {t(`properties.types.${block.structure_type}`, block.structure_type)}
                                        </span>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </div>
                        ))}

                        {/* Units (Files) */}
                        {currentUnits.map(unit => (
                            <div
                                key={unit.id}
                                onClick={() => onSelectUnit(unit.id)}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedUnitId === unit.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'hover:bg-white/40 dark:hover:bg-neutral-800/40 border-transparent hover:border-gray-200/50 dark:hover:border-neutral-700/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedUnitId === unit.id ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${selectedUnitId === unit.id ? 'text-blue-800 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {t('properties.unit_number', 'Unit')} {unit.unit_number}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                            {unit.unit_type ? t(`properties.unit_type.${unit.unit_type}`, unit.unit_type) : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedUnitId === unit.id
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                    {selectedUnitId === unit.id && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default DrillDownUnitSelector;
