import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import Header from '../assets/components/Header';
import Footer from '../assets/components/Footer';
import AnimatedBackground from '../assets/components/AnimatedBackground';

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
        <div className="relative min-h-screen bg-white dark:bg-neutral-900 overflow-hidden selection:bg-indigo-500 selection:text-white">
            <AnimatedBackground />

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header />

                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-md p-6 bg-white/40 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg dark:bg-neutral-900/40 dark:border-neutral-700">
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
                                                className="py-3 px-4 block w-full bg-white/30 shadow-2xl backdrop-blur-md border-gray-200 rounded-full text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" 
                                                required 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder={t('auth.enter_email_placeholder')}
                                            />
                                        </div>
                                        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                                        {message && <p className="text-xs text-green-600 mt-2">{message}</p>}
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={loading} 
                                        className="w-full inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] text-white text-sm font-semibold rounded-full hover:shadow-lg hover:bg-right active:scale-95 transition-all duration-500 py-3 px-6 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {loading ? t('auth.sending') : t('auth.reset_pass_btn')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
};

export default ForgotPassword;
