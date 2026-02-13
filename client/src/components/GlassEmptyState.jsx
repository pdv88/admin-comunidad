import React from 'react';
import { useTranslation } from 'react-i18next';

const GlassEmptyState = ({ title, description, children }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative w-32 h-32 mb-6 group">
                {/* Back Layer - Folder/Box */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-3xl transform rotate-6 scale-90 blur-sm transition-all duration-500 group-hover:rotate-12 group-hover:scale-100"></div>

                {/* Middle Layer - Glass Sheet */}
                <div className="absolute inset-2 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl shadow-xl transform -rotate-3 transition-all duration-500 group-hover:rotate-0 flex items-center justify-center">
                    {/* Inner content of the glass sheet */}
                    <svg className="w-12 h-12 text-indigo-500/50 dark:text-indigo-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>

                {/* Floating Elements - Decorative */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-100/50 dark:bg-indigo-900/50 rounded-full blur-sm animate-pulse"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-purple-100/50 dark:bg-purple-900/50 rounded-full blur-sm animate-bounce delay-700"></div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {title || t('common.no_items', 'No Items Found')}
            </h3>

            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                {description || t('common.no_items_desc', 'There is no information to display at this time.')}
            </p>

            {children}
        </div>
    );
};

export default GlassEmptyState;
