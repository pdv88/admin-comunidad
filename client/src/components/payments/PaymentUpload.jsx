import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';

const PaymentUpload = ({ onSuccess, isAdmin }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');

    React.useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            // Assuming listUsers endpoint exists and is accessible.
            // If users.controller.js listUsers is protected for admins, we can use it.
            const res = await fetch(`${API_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            
            // Convert file to base64
            let base64Image = null;
            if (file) {
                 base64Image = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            const payload = {
                amount,
                notes,
                base64Image,
                fileName: file ? file.name : null
            };

            // If admin and filtered user, send userId
            if (isAdmin && selectedUserId) {
                payload.targetUserId = selectedUserId;
            }

            const res = await fetch(`${API_URL}/api/payments`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Upload failed');

            setAmount('');
            setNotes('');
            setFile(null);
            setSelectedUserId('');
            setMessage(t('payments.success', 'Payment registered successfully'));
            if (onSuccess) onSuccess();

        } catch (error) {
            setMessage(t('payments.error', 'Error registering payment'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">{t('payments.upload.title', 'Register Payment')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {isAdmin && (
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.user_select', 'Select User (Admin)')}</label>
                        <select 
                            className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="">{t('payments.upload.myself', 'Myself')}</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name || u.email}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.amount', 'Amount (€)')}</label>
                    <input 
                        type="number" 
                        step="0.01"
                        required
                        className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.notes', 'Notes (Optional)')}</label>
                    <input 
                        type="text" 
                        className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Monthly fee Oct"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.receipt', 'Receipt (Image)')} <span className="text-gray-400 font-normal">({t('common.optional', 'Optional')})</span></label>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 dark:file:bg-indigo-500 dark:hover:file:bg-indigo-400"
                    />
                </div>

                {message && <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {loading ? t('common.loading', 'Loading...') : t('payments.upload.submit', 'Submit Payment')}
                </button>
            </form>
        </div>
    );
};

export default PaymentUpload;
