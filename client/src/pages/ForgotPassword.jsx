import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                 setMessage(t('auth.check_email'));
            } else {
                throw new Error(data.error || 'Failed to send reset email');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-white dark:bg-neutral-900 border border-t border-gray-200 shadow-sm rounded-xl py-4 sm:px-7 dark:border-neutral-700 h-[100dvh] items-center justify-center">
            <div className="mt-5 w-full max-w-md p-6 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
                <div className="text-center">
                    <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">{t('auth.forgot_pass_title')}</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
                        {t('auth.remember_pass')}
                        <Link className="text-blue-600 decoration-2 hover:underline font-medium dark:text-blue-500 ml-1" to="/login">
                            {t('auth.signin_here')}
                        </Link>
                    </p>
                </div>

                <div className="mt-5">
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm mb-2 dark:text-white">{t('auth.email')}</label>
                                <div className="relative">
                                    <input 
                                        type="email" 
                                        id="email" 
                                        className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('auth.enter_email_placeholder')}
                                    />
                                </div>
                                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                                {message && <p className="text-xs text-green-600 mt-2">{message}</p>}
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">
                                {loading ? t('auth.sending') : t('auth.reset_pass_btn')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
