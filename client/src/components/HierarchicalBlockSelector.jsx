import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const HierarchicalBlockSelector = ({
    blocks,
    selectedBlocks,
    onToggleBlock
}) => {
    const { t } = useTranslation();
    const [currentParentId, setCurrentParentId] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: t('properties.hierarchy.root', 'Root') }]);

    const displayedBlocks = blocks.filter(b => b.parent_id === currentParentId);

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

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {displayedBlocks.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm italic">
                        {t('common.no_items', 'No sub-blocks found')}
                    </div>
                ) : (
                    displayedBlocks.map(block => (
                        <div
                            key={block.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/40 dark:hover:bg-neutral-800/40 border border-transparent hover:border-gray-200/50 dark:hover:border-neutral-700/50 transition-all group"
                        >
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <input
                                    type="checkbox"
                                    checked={selectedBlocks.includes(block.id)}
                                    onChange={() => onToggleBlock(block.id)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{block.name}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                        {t(`properties.types.${block.structure_type}`, block.structure_type)}
                                    </span>
                                </div>
                            </label>

                            <button
                                type="button"
                                onClick={() => handleNavigate(block)}
                                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                                title={t('common.view_details', 'Drill down')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HierarchicalBlockSelector;
