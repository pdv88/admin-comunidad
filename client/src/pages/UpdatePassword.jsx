import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// We need a direct client here to handle the url fragment token if the context didn't catch it yet
// or just rely on the AuthContext if it auto-detects session from URL. 
// Supabase client auto-detects #access_token in URL and sets session.

const UpdatePassword = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { user } = useAuth(); // If session is established from URL
    const navigate = useNavigate();
    
    // Supabase JS client handles the hash fragment automatically and persists session.
    // So if the user clicks the link, they land here, and useAuth() should eventually match the user.
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // We assume we are logged in now via the magic link
            // We need the supabase client from context or initialized one. 
            // Ideally we should export the supabase client instance from a file to reuse it.
            // For now, let's assume we can fetch it or use a simple fetch to backend? 
            // No, password update is usually done via client SDK `auth.updateUser`.
            
            // Let's rely on backend? Or simpler: use client SDK if we had it exposed.
            // Since we built backend-heavy, let's make a backend endpoint or use context?
            // Actually, we haven't exposed the supabase client to the components directly.
            // Let's make a backend endpoint for "/api/auth/update-password" 
            
            const res = await fetch('http://localhost:5000/api/auth/update-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` // We need the token 
                },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                 setMessage('Password updated successfully. Redirecting...');
                 setTimeout(() => navigate('/app/dashboard'), 2000);
            } else {
                throw new Error('Failed to update password');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-white dark:bg-neutral-900 h-screen items-center justify-center">
            <div className="w-full max-w-md p-6 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
                <h1 className="text-2xl font-bold dark:text-white mb-4">Set New Password</h1>
                <form onSubmit={handleUpdate}>
                    <input 
                        type="password" 
                        placeholder="New Password" 
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
                        {loading ? 'Updating...' : 'Set Password'}
                    </button>
                    {message && <p className="mt-4 text-center text-sm dark:text-white">{message}</p>}
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
