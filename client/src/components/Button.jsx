import React from 'react';

/**
 * Standardized Button component for Habiio Admin Comunidad.
 * Follows the "Modern Glass" design language.
 */
const Button = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost'
    isLoading = false,
    disabled = false,
    className = '',
    icon: Icon = null,
    ...props
}) => {
    const baseStyles = "relative inline-flex justify-center items-center gap-x-2 text-center text-sm font-semibold rounded-full transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none py-2.5 px-5 shadow-lg";

    const variants = {
        primary: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] text-white hover:shadow-blue-500/30 hover:bg-right shadow-blue-500/20",
        secondary: "bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-200 border border-gray-200/50 dark:border-neutral-700/50 shadow-sm hover:shadow-md",
        danger: "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 bg-[length:200%_auto] text-white hover:shadow-red-500/30 hover:bg-right shadow-red-500/20",
        ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-neutral-400 shadow-none hover:shadow-none py-2 px-3 border-none",
    };

    const currentVariant = variants[variant] || variants.primary;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`${baseStyles} ${currentVariant} ${className}`}
            {...props}
        >
            {/* Loader */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}

            {/* Content */}
            <span className={`inline-flex items-center gap-x-2 ${isLoading ? 'invisible' : ''}`}>
                {Icon && <Icon className="shrink-0" size={18} />}
                {children}
            </span>
        </button>
    );
};

export default Button;
