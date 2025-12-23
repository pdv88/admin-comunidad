import React from 'react';

const GlassLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[50vh] w-full">
            <div className="relative flex items-center justify-center">
                {/* Outer spinning ring */}
                <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-blue-500 animate-spin"></div>
                
                {/* Inner pulsing circle */}
                <div className="absolute w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm animate-pulse shadow-lg border border-white/40"></div>
            </div>
            <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading...</p>
        </div>
    );
};

export default GlassLoader;
