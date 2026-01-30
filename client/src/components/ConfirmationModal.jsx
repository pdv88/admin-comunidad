import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalPortal from './ModalPortal';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDangerous = false, inputConfirmation = null, isLoading = false }) => {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = React.useState('');

    React.useEffect(() => {
        if (isOpen) setInputValue('');
    }, [isOpen]);

    if (!isOpen) return null;

    const isConfirmDisabled = inputConfirmation && inputValue !== inputConfirmation;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="glass-card max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95">
                    <div className="p-6">
                        <h3 className={`text-xl font-bold mb-2 ${isDangerous ? 'text-red-600 dark:text-red-500' : 'text-gray-800 dark:text-white'}`}>
                            {title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {message}
                        </p>

                        {inputConfirmation && (
                            <div className="mt-4">
                                <label className="block text-sm text-gray-500 mb-1">
                                    {t('common.type_to_confirm', 'Please type "{{word}}" to confirm:', { word: inputConfirmation })}
                                </label>
                                <input
                                    type="text"
                                    className="glass-input w-full"
                                    placeholder={inputConfirmation}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/5">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="glass-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelText || t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isConfirmDisabled || isLoading}
                            className={`relative ${isDangerous
                                ? 'glass-button-danger'
                                : 'glass-button'
                                }`}
                        >
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            ) : null}
                            <span className={isLoading ? 'invisible' : ''}>
                                {confirmText || t('common.confirm', 'Confirm')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default ConfirmationModal;
