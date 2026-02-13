import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';

const BlockCard = ({
    block,
    users,
    onAddUnit,
    onAddStructure,
    onEditUnit,
    onDeleteBlock,
    onDeleteUnit,
    onAssignRep,
    assigningRepBlockId,
    t
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasChildren = block.children && block.children.length > 0;
    const hasUnits = block.units && block.units.length > 0;

    const getTypeColor = (type) => {
        switch (type) {
            case 'portal': return 'border-l-4 border-l-blue-500';
            case 'staircase': return 'border-l-4 border-l-purple-500';
            case 'tower': return 'border-l-4 border-l-orange-500';
            case 'level': return 'border-l-4 border-l-teal-500';
            default: return ''; // Standard block
        }
    };

    return (
        <div className={`glass-card mb-2 last:mb-0 transition-all duration-300 border-t-white/90 border-b-gray-300/80 border-r-gray-200/60 dark:border-t-white/20 dark:border-b-black/60 dark:border-r-white/5 ${getTypeColor(block.structure_type)}`}>
            {/* Header */}
            <div className={`bg-white/30 dark:bg-white/5 hover:bg-blue-50/90 dark:hover:bg-blue-900/40 px-3 py-2 border-b border-white/20 dark:border-neutral-700/30 flex justify-between items-center transition-colors rounded-t-2xl ${!isExpanded ? 'rounded-b-2xl border-b-0' : ''}`}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div>
                        <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                            {block.name}
                            {block.structure_type && block.structure_type !== 'block' && (
                                <span className="text-[10px] uppercase bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 font-medium">
                                    {t(`properties.types.${block.structure_type}`, block.structure_type)}
                                </span>
                            )}
                        </h3>
                    </div>
                </div>

                <div className="relative ml-2" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-56 z-[50] glass-card backdrop-blur-xl bg-white/40 dark:bg-neutral-900/80 p-1 flex flex-col gap-1 shadow-xl animate-in fade-in zoom-in-95 origin-top-right">
                            <button
                                onClick={() => { setShowMenu(false); onAddStructure(block.id); }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors flex items-center gap-2"
                            >
                                <span className="text-blue-500 font-bold">+</span> {t('properties.add_structure', 'Add Structure')}
                            </button>
                            <button
                                onClick={() => { setShowMenu(false); onAddUnit(block.id); }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors flex items-center gap-2"
                            >
                                <span className="text-emerald-500 font-bold">+</span> {t('properties.add_unit')}
                            </button>

                            {/* Separator */}
                            <div className="h-px bg-gray-100 dark:bg-white/10 my-0.5"></div>

                            {/* Representative Selector */}
                            <div className="px-3 py-1">
                                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">
                                    {t('properties.representative')}:
                                </label>
                                {assigningRepBlockId === block.id ? (
                                    <div className="flex items-center justify-center py-1">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full text-[10px] py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={block.representative_id || ''}
                                        onChange={(e) => onAssignRep(block.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={assigningRepBlockId !== null}
                                    >
                                        <option value="">{t('properties.none')}</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name || u.email || 'User'}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Separator */}
                            <div className="h-px bg-gray-100 dark:bg-white/10 my-0.5"></div>

                            <button
                                onClick={() => { setShowMenu(false); onDeleteBlock(block.id); }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center gap-2"
                            >
                                <span>&times;</span> {t('properties.delete_block', 'Delete Block')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Body */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-2">

                    {/* Units Section */}
                    {hasUnits && (
                        <div className={hasChildren ? "mb-2" : ""}>
                            <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('properties.units', 'Units')}</h4>
                            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                {block.units.map(unit => (
                                    <div key={unit.id} className="relative group text-center p-1 rounded-md bg-white/40 dark:bg-neutral-800/40 border border-white/20 dark:border-neutral-700/30 shadow-sm hover:bg-white/60 dark:hover:bg-neutral-700/60 transition-all duration-300">
                                        <button
                                            onClick={() => onDeleteUnit(unit.id)}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            &times;
                                        </button>
                                        <span className="block font-bold text-sm text-gray-800 dark:text-white">{unit.unit_number}</span>
                                        <div className="text-[10px] mt-0.5 truncate max-w-[100px] mx-auto text-left">
                                            {unit.unit_owners && unit.unit_owners.length > 0 && unit.unit_owners[0].profiles ? (
                                                <div title={t('properties.owner') + ': ' + unit.unit_owners[0].profiles.full_name}>
                                                    <span className="text-gray-500 font-semibold">{t('properties.owner').charAt(0)}: </span>
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                        {unit.unit_owners[0].profiles.full_name.split(' ')[0]}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic block text-center text-[8px]">
                                                    {t('properties.unoccupied', 'Empty')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onEditUnit(unit)}
                                            className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                                        >
                                            &#9998;
                                        </button>
                                        <span className="text-[8px] text-gray-500 uppercase block mt-0.5">
                                            {t(`properties.unit_type.${unit.type}`, unit.type)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Children Blocks (Recursive) */}
                    {hasChildren && (
                        <div className="pl-2 border-l border-gray-100 dark:border-gray-700/50">
                            {block.children.map(child => (
                                <BlockCard
                                    key={child.id}
                                    block={child}
                                    users={users}
                                    onAddUnit={onAddUnit}
                                    onAddStructure={onAddStructure}
                                    onEditUnit={onEditUnit}
                                    onDeleteBlock={onDeleteBlock}
                                    onDeleteUnit={onDeleteUnit}
                                    onAssignRep={onAssignRep}
                                    assigningRepBlockId={assigningRepBlockId}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!hasUnits && !hasChildren && (
                        <div className="flex justify-between items-center py-2">
                            <p className="text-gray-500 text-sm italic">{t('properties.empty_block', 'No units or sub-structures yet.')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

BlockCard.propTypes = {
    block: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        structure_type: PropTypes.string,
        representative_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        units: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            unit_number: PropTypes.string.isRequired,
            type: PropTypes.string,
            unit_owners: PropTypes.array
        })),
        children: PropTypes.array
    }).isRequired,
    users: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        full_name: PropTypes.string,
        email: PropTypes.string
    })).isRequired,
    onAddUnit: PropTypes.func.isRequired,
    onAddStructure: PropTypes.func.isRequired,
    onEditUnit: PropTypes.func.isRequired,
    onDeleteBlock: PropTypes.func.isRequired,
    onDeleteUnit: PropTypes.func.isRequired,
    onAssignRep: PropTypes.func.isRequired,
    assigningRepBlockId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    t: PropTypes.func.isRequired
};

export default BlockCard;
