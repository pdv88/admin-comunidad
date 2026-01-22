import React from 'react';

const StatusBadge = ({ status, colorClass, children }) => {
    // If colorClass is provided, use it. Otherwise, default logic could go here or be handled by parent.
    // For now, flexible component.
    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${colorClass}`}>
            {children || status}
        </span>
    );
};

export default StatusBadge;
