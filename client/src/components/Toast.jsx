import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

    const baseStyles = "fixed bottom-5 right-5 z-[9999] px-6 py-3 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 transform flex items-center gap-3 border";

    // Distinct styles for Success (Green), Error (Red), and Warning (Yellow)
    let typeStyles;
    switch (type) {
        case 'error':
            typeStyles = "bg-red-500/20 border-red-200/50 text-red-900 dark:text-red-100 dark:border-red-500/30 dark:bg-red-500/10";
            break;
        case 'warning':
            typeStyles = "bg-amber-500/20 border-amber-200/50 text-amber-900 dark:text-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10";
            break;
        default:
            typeStyles = "bg-emerald-500/20 border-emerald-200/50 text-emerald-900 dark:text-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10";
    }

    // Animation classes
    const animationStyles = isVisible
        ? "translate-y-0 opacity-100 scale-100"
        : "translate-y-4 opacity-0 scale-95";

    return createPortal(
        <div className={`${baseStyles} ${typeStyles} ${animationStyles}`}>
            {type === 'error' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {type === 'warning' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            )}
            {(type === 'success' || !['error', 'warning'].includes(type)) && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            )}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={() => setIsVisible(false)} className="ml-2 hover:opacity-70">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>,
        document.body
    );
};

export default Toast;
