import React, { useEffect, useState } from 'react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // Wait for exit animation
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    if (!message && !isVisible) return null;

    const baseStyles = "fixed top-20 right-5 z-50 px-6 py-3 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 transform flex items-center gap-3 border";
    
    // Distinct styles for Success (Green) and Error (Red)
    const typeStyles = type === 'error' 
        ? "bg-red-500/20 border-red-200/50 text-red-700 dark:text-red-200 dark:border-red-500/30 dark:bg-red-500/10"
        : "bg-emerald-500/20 border-emerald-200/50 text-emerald-700 dark:text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10";

    // Animation classes
    const animationStyles = isVisible 
        ? "translate-y-0 opacity-100 scale-100" 
        : "-translate-y-4 opacity-0 scale-95";

    return (
        <div className={`${baseStyles} ${typeStyles} ${animationStyles}`}>
            {type === 'error' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            )}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={() => setIsVisible(false)} className="ml-2 hover:opacity-70">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

export default Toast;
