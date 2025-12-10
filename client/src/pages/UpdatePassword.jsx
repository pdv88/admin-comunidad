import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

const UpdatePassword = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { user } = useAuth(); // If session is established from URL
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    // Supabase JS client handles the hash fragment automatically and persists session.
    // So if the user clicks the link, they land here, and useAuth() should eventually match the user.
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

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
                 setMessage(t('update_password.success'));
                 setTimeout(() => navigate('/app/dashboard'), 2000);
            } else {
                throw new Error(t('update_password.error'));
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-white dark:bg-neutral-900 h-screen items-center justify-center">
            <div className="w-full max-w-md p-6 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
                <h1 className="text-2xl font-bold dark:text-white mb-4">{t('update_password.title')}</h1>
                <form onSubmit={handleUpdate}>
                    <input 
                        type="password" 
                        placeholder={t('update_password.placeholder')} 
                        className="w-full mb-4 rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
                    >
                        {loading ? t('update_password.updating') : t('update_password.btn')}
                    </button>
                    {message && <p className="mt-4 text-center text-sm dark:text-white">{message}</p>}
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
