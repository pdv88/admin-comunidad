import React from 'react';
import { useTranslation } from 'react-i18next';
import ModalPortal from './ModalPortal';

import Button from './Button';

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
                        <Button
                            onClick={onClose}
                            variant="secondary"
                            disabled={isLoading}
                        >
                            {cancelText || t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            onClick={onConfirm}
                            variant={isDangerous ? 'danger' : 'primary'}
                            isLoading={isLoading}
                            disabled={isConfirmDisabled}
                        >
                            {confirmText || t('common.confirm', 'Confirm')}
                        </Button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default ConfirmationModal;
