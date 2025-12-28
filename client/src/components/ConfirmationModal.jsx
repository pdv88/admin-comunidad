import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalPortal from './ModalPortal';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDangerous = false, inputConfirmation = null }) => {
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
                            className="glass-button-secondary"
                        >
                            {cancelText || t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isConfirmDisabled}
                            className={`py-2 px-4 inline-flex justify-center items-center gap-2 rounded-lg border border-transparent font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white transition-all text-sm ${
                                isDangerous 
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed' 
                                : 'glass-button disabled:opacity-50 disabled:cursor-not-allowed'
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
