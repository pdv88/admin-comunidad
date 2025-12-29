import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import Header from '../assets/components/Header';
import Footer from '../assets/components/Footer';
import Toast from '../components/Toast';

const UpdatePassword = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const { user } = useAuth(); // If session is established from URL
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    // Supabase JS client handles the hash fragment automatically and persists session.
    // So if the user clicks the link, they land here, and useAuth() should eventually match the user.
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setToast({ message: '', type: 'success' });

        try {
            const res = await fetch(`${API_URL}/api/auth/update-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` // We need the token 
                },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                 setToast({ message: t('update_password.success_login', 'Password updated! Redirecting to login...'), type: 'success' });
                 setTimeout(() => navigate('/login'), 2000);
            } else {
                throw new Error(t('update_password.error'));
            }
        } catch (error) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex flex-col min-h-screen">
            <Toast 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast({ ...toast, message: '' })} 
            />
            <Header />

            <main className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-md p-6 bg-white/40 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg dark:bg-neutral-900/40 dark:border-neutral-700">
                        <div className="text-center">
                            <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">{t('update_password.title')}</h1>
                        </div>
                        
                        <div className="mt-5">
                            <form onSubmit={handleUpdate}>
                                <div className="grid gap-y-4">
                                    <div>
                                        <input 
                                            type="password" 
                                            placeholder={t('update_password.placeholder')} 
                                            className="py-3 px-4 block w-full bg-white/30 shadow-2xl backdrop-blur-md border-gray-200 rounded-full text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600" 
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] text-white text-sm font-semibold rounded-full hover:shadow-lg hover:bg-right active:scale-95 transition-all duration-500 py-3 px-6 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {loading ? t('update_password.updating') : t('update_password.btn')}
                                    </button>
                                    
                                    
                                </div>
                            </form>
                        </div>
                    </div>
                </main>

                <Footer />
        </div>
    );
};

export default UpdatePassword;
