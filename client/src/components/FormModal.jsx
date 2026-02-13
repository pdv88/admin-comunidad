import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';

/**
 * Standardized Form Modal component for Habiio Admin Comunidad.
 * Provides a consistent layout with header, scrollable body, and footer.
 */
const FormModal = ({
    isOpen,
    onClose,
    onSubmit,
    title,
    children,
    submitText,
    cancelText,
    isLoading = false,
    isSubmitDisabled = false,
    maxWidth = 'max-w-lg',
    maxWidthClass = '', // For custom widths if maxWidth enum isn't enough
    formId = 'standard-form'
}) => {
    const { t } = useTranslation();

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(e);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth={maxWidthClass || maxWidth}
        >
            <form id={formId} onSubmit={handleFormSubmit} className="flex flex-col h-full max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-neutral-700/50 shrink-0">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {title}
                    </h3>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto customer-scrollbar flex-1">
                    {children}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/5 shrink-0 border-t border-gray-200 dark:border-neutral-700/50">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                        disabled={isLoading}
                    >
                        {cancelText || t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isLoading}
                        disabled={isSubmitDisabled}
                    >
                        {submitText || t('common.submit', 'Submit')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default FormModal;
