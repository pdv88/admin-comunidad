import React from 'react';
import ModalPortal from './ModalPortal';

/**
 * Base Modal component providing the backdrop and glass card structure.
 * Use this for custom modal content that doesn't fit the standard FormModal pattern.
 */
const Modal = ({
    isOpen,
    onClose,
    children,
    maxWidth = 'max-w-lg',
    className = '',
    showCloseButton = true
}) => {
    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div
                    className={`glass-card w-full ${maxWidth} overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 ${className}`}
                >
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 transition-colors z-10"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    {children}
                </div>
            </div>
        </ModalPortal>
    );
};

export default Modal;
