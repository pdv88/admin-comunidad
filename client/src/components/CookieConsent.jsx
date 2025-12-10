import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const CookieConsent = () => {
    const [showBanner, setShowBanner] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            setShowBanner(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'true');
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:bg-neutral-900 dark:border-neutral-700">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-neutral-400">
                    <p>
                        {t('cookies.message', 'We use cookies to improve your experience and to analyze our traffic. To find out more, please read our Privacy Policy.')}
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={handleAccept}
                        className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {t('cookies.accept', 'Accept')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
