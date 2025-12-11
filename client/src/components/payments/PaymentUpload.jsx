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
    
    // New state for payment categorization
    const [paymentType, setPaymentType] = useState('maintenance'); // 'maintenance' or 'campaign'
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');

    React.useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
        fetchCampaigns();
    }, [isAdmin]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
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

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter only active campaigns if needed, for now show all or let backend filter
                setCampaigns(data);
            }
        } catch (error) {
            console.error('Error fetching campaigns:', error);
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
                fileName: file ? file.name : null,
                campaign_id: paymentType === 'campaign' ? selectedCampaignId : null
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
            setPaymentType('maintenance');
            setSelectedCampaignId('');
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
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.category', 'Payment Category')}</label>
                    <div className="grid sm:grid-cols-2 gap-2">
                        <label htmlFor="payment-main" className={`flex p-3 w-full bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-400 cursor-pointer ${paymentType === 'maintenance' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
                            <input type="radio" name="payment-type" value="maintenance" id="payment-main" className="shrink-0 mt-0.5 border-gray-200 rounded-full text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800" checked={paymentType === 'maintenance'} onChange={() => setPaymentType('maintenance')} />
                            <span className="text-sm text-gray-500 ms-3 dark:text-gray-400">{t('payments.upload.type_maintenance', 'Monthly Maintenance')}</span>
                        </label>

                        <label htmlFor="payment-camp" className={`flex p-3 w-full bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-400 cursor-pointer ${paymentType === 'campaign' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
                            <input type="radio" name="payment-type" value="campaign" id="payment-camp" className="shrink-0 mt-0.5 border-gray-200 rounded-full text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800" checked={paymentType === 'campaign'} onChange={() => setPaymentType('campaign')} />
                            <span className="text-sm text-gray-500 ms-3 dark:text-gray-400">{t('payments.upload.type_campaign', 'Funding Campaign')}</span>
                        </label>
                    </div>
                </div>

                {paymentType === 'campaign' && (
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.select_campaign', 'Select Campaign')}</label>
                        <select 
                            className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            required
                        >
                            <option value="">{t('common.select', 'Select...')}</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
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
                        placeholder="e.g. Oct Fee"
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
