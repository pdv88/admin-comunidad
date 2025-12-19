import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalPortal from './ModalPortal';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDangerous = false }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden transform transition-all">
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                            {title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            {message}
                        </p>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="py-2 px-4 inline-flex justify-center items-center gap-2 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-400 dark:hover:bg-neutral-700 dark:hover:text-white"
                        >
                            {cancelText || t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`py-2 px-4 inline-flex justify-center items-center gap-2 rounded-lg border border-transparent font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white transition-all text-sm ${
                                isDangerous 
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600' 
                                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-600'
                            }`}
                        >
                            {confirmText || t('common.confirm', 'Confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default ConfirmationModal;
