import React from 'react';

const GlassSkeleton = ({ className = '', height = 'h-full', width = 'w-full' }) => {
    return (
        <div className={`glass-card relative overflow-hidden ${height} ${width} ${className} border-white/20 dark:border-white/5`}>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/5"></div>
        </div>
    );
};

export default GlassSkeleton;
