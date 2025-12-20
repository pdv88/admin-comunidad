import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

const Maintenance = () => {
    const { t } = useTranslation();
    const { user, activeCommunity } = useAuth();
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    // Admin Generation State
    const [genPeriod, setGenPeriod] = useState(new Date().toISOString().slice(0, 7) + '-01'); // YYYY-MM-01
    const [genAmount, setGenAmount] = useState('50');
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const role = activeCommunity?.roles?.name;
        setIsAdmin(['admin', 'president', 'treasurer'].includes(role));
        if (activeCommunity) fetchFees();
    }, [user, activeCommunity]);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const role = activeCommunity?.roles?.name;
            const endpoint = ['admin', 'president', 'treasurer'].includes(role) 
                ? `${API_URL}/api/maintenance/status` 
                : `${API_URL}/api/maintenance/my-statement`;

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-community-id': activeCommunity.id }
            });

            if (res.ok) {
                setFees(await res.json());
            }
        } catch (error) {
            console.error("Error fetching fees:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/maintenance/generate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-community-id': activeCommunity.id
                },
                body: JSON.stringify({ period: genPeriod, amount: parseFloat(genAmount) })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage(t('maintenance.success_gen', `Generated ${data.count} fees successfully.`));
                fetchFees();
            } else {
                setMessage(t('maintenance.error_gen', `Error: ${data.error}`));
            }
        } catch (error) {
            console.error(error);
            setMessage('Network error');
        } finally {
            setGenerating(false);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {isAdmin ? t('maintenance.admin_title', 'Maintenance Fee Management') : t('maintenance.resident_title', 'My Maintenance Fees')}
                    </h1>
                </div>

                {/* Admin Generator Section */}
                {isAdmin && (
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t('maintenance.generate_title', 'Generate Monthly Fees')}</h2>
                        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('maintenance.period', 'Billing Period')}</label>
                                <input 
                                    type="date" 
                                    className="glass-input"
                                    value={genPeriod}
                                    onChange={(e) => setGenPeriod(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('maintenance.amount', 'Amount')}</label>
                                <input 
                                    type="number" 
                                    className="glass-input"
                                    value={genAmount}
                                    onChange={(e) => setGenAmount(e.target.value)}
                                    required
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={generating}
                                className="glass-button bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                {generating ? t('common.processing', 'Generating...') : t('maintenance.generate_btn', 'Generate Bills')}
                            </button>
                        </form>
                        {message && <p className={`mt-2 text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                    </div>
                )}

                {/* Fee List */}
                <div className="glass-card p-6">
                     <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
                        {isAdmin ? t('maintenance.community_status', 'Community Status') : t('maintenance.history', 'Payment History')}
                     </h2>
                    
                    {loading ? (
                        <p className="text-gray-500">{t('common.loading', 'Loading...')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                                <thead className="bg-gray-50 dark:bg-neutral-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-400">{t('maintenance.period', 'Period')}</th>
                                        {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-400">{t('maintenance.unit', 'Unit')}</th>}
                                        {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-400">{t('maintenance.owner', 'Owner')}</th>}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-400">{t('maintenance.amount', 'Amount')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-neutral-400">{t('maintenance.status', 'Status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-neutral-900 dark:divide-neutral-700">
                                    {fees.map(fee => (
                                        <tr key={fee.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {new Date(fee.period).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-400">
                                                    {(fee.block_name || fee.units?.blocks?.name) ? `${fee.block_name || fee.units?.blocks?.name} - ` : ''}
                                                    {fee.unit_number || fee.units?.unit_number}
                                                </td>
                                            )}
                                            {isAdmin && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-400">
                                                    {fee.owner_name}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {fee.amount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status)}`}>
                                                    {fee.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {fees.length === 0 && <p className="text-center py-4 text-gray-500">{t('maintenance.no_records', 'No records found.')}</p>}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Maintenance;
