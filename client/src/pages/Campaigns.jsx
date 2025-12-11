import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import CampaignProgress from '../components/payments/CampaignProgress';
import DashboardLayout from '../components/DashboardLayout';

const Campaigns = () => {
    const { t } = useTranslation();
    const { user } = useAuth(); // We can check role here if needed, but the Route is protected/Sidebar handles visibility
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('');
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    name,
                    goal_amount: goal,
                    description: desc,
                    deadline: deadline || null
                })
            });

            if (!res.ok) throw new Error('Failed to create');

            setMessage(t('campaigns.success', 'Campaign created successfully!'));
            setName('');
            setGoal('');
            setDesc('');
            setDeadline('');
            fetchCampaigns(); // Refresh list

        } catch (error) {
            console.error(error);
            setMessage(t('campaigns.error', 'Error creating campaign.'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('campaigns.title', 'Funding Campaigns')}</h1>

                {/* Create Campaign Form (Admin/President only normally, but this page is restricted) */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t('campaigns.create_title', 'Create New Campaign')}</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.name', 'Campaign Name')}</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.goal', 'Goal Amount (€)')}</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.description', 'Description')}</label>
                             <textarea 
                                className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                rows="2"
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                             ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.deadline', 'Deadline')} <span className="text-gray-400 font-normal">({t('common.optional', 'Optional')})</span></label>
                            <input 
                                type="date" 
                                className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                        </div>
                        
                        {message && <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}

                        <button 
                            type="submit" 
                            disabled={creating}
                            className="py-2 px-4 inline-flex justify-center items-center gap-2 rounded-lg border border-transparent font-semibold bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all text-sm disabled:opacity-50"
                        >
                            {creating ? t('common.loading', 'Loading...') : t('campaigns.create_btn', 'Create Campaign')}
                        </button>
                    </form>
                </div>

                {/* List of Campaigns */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map(campaign => (
                        <div key={campaign.id} className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{campaign.name}</h3>
                                    {campaign.is_active ? (
                                        <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500">Active</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-500">Closed</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4 h-12 overflow-hidden text-ellipsis">
                                    {campaign.description || t('campaigns.no_desc', 'No description provided.')}
                                </p>
                                
                                <CampaignProgress 
                                    current={campaign.current_amount} 
                                    target={campaign.goal_amount} 
                                />
                                
                                <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-neutral-500">
                                    <span>{t('campaigns.collected', 'Collected')}: €{campaign.current_amount}</span>
                                    <span>{t('campaigns.goal', 'Goal')}: €{campaign.goal_amount}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {campaigns.length === 0 && !loading && (
                         <div className="col-span-full text-center py-10 text-gray-500 dark:text-neutral-400">
                            {t('campaigns.empty', 'No campaigns found.')}
                         </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Campaigns;
