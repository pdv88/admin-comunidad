import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import CampaignProgress from '../components/payments/CampaignProgress';
import DashboardLayout from '../components/DashboardLayout';
import ModalPortal from '../components/ModalPortal';

const Campaigns = () => {
    const { t } = useTranslation();
    const { user } = useAuth(); 
    const role = user?.profile?.roles?.name;
    const canCreate = role === 'admin' || role === 'president';
    
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('');
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Targeting State
    const [availableBlocks, setAvailableBlocks] = useState([]);
    const [targetType, setTargetType] = useState('all'); // 'all' or 'blocks'
    const [selectedBlocks, setSelectedBlocks] = useState([]); // Array of block IDs

    // Edit State
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        goal_amount: '',
        description: '',
        deadline: '',
        is_active: true
    });

    useEffect(() => {
        fetchCampaigns();
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/properties/blocks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAvailableBlocks(await res.json());
            }
        } catch (error) {
            console.error("Error fetching blocks:", error);
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
                    deadline: deadline || null,
                    target_type: targetType,
                    target_blocks: targetType === 'blocks' ? selectedBlocks : []
                })
            });

            if (!res.ok) throw new Error('Failed to create');

            setMessage(t('campaigns.success', 'Campaign created successfully!'));
            setName('');
            setGoal('');
            setDesc('');
            setDesc('');
            setDeadline('');
            setTargetType('all');
            setSelectedBlocks([]);
            setShowCreateForm(false);
            fetchCampaigns(); // Refresh list

        } catch (error) {
            console.error(error);
            setMessage(t('campaigns.error', 'Error creating campaign.'));
        } finally {
            setCreating(false);
        }
    };

    const handleEditClick = (campaign) => {
        setEditingCampaign(campaign);
        setEditForm({
            name: campaign.name,
            goal_amount: campaign.target_amount,
            description: campaign.description || '',
            deadline: campaign.deadline ? campaign.deadline.split('T')[0] : '',
            is_active: campaign.is_active
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/payments/campaigns/${editingCampaign.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    ...editForm,
                    deadline: editForm.deadline || null
                })
            });

            if (!res.ok) throw new Error('Failed to update');

            setMessage(t('campaigns.update_success', 'Campaign updated successfully!'));
            setEditingCampaign(null);
            fetchCampaigns();

        } catch (error) {
            console.error(error);
            setMessage(t('campaigns.update_error', 'Error updating campaign.'));
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('campaigns.title', 'Funding Campaigns')}</h1>
                    {canCreate && (
                        <button 
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="py-2 px-4 inline-flex justify-center items-center gap-2 rounded-lg border border-transparent font-semibold bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all text-sm"
                        >
                            {showCreateForm ? t('common.cancel', 'Cancel') : t('campaigns.create_btn', 'Create Campaign')}
                        </button>
                    )}
                </div>

                {/* Create Campaign Form */}
                {showCreateForm && (
                     <div className="glass-card p-6 animate-fade-in-down mb-6">
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

                         {/* Targeting Options */}
                         <div className="pt-2">
                             <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('campaigns.target_audience', 'Target Audience')}</label>
                             <div className="flex gap-4 mb-3">
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                         type="radio" 
                                         name="targetType" 
                                         value="all"
                                         checked={targetType === 'all'}
                                         onChange={() => setTargetType('all')}
                                         className="text-indigo-600 focus:ring-indigo-500"
                                     />
                                     <span className="text-sm dark:text-gray-300">{t('campaigns.target_all', 'All Community')}</span>
                                 </label>
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input 
                                         type="radio" 
                                         name="targetType" 
                                         value="blocks"
                                         checked={targetType === 'blocks'}
                                         onChange={() => setTargetType('blocks')}
                                         className="text-indigo-600 focus:ring-indigo-500"
                                     />
                                     <span className="text-sm dark:text-gray-300">{t('campaigns.target_blocks', 'Specific Blocks')}</span>
                                 </label>
                             </div>
 
                             {targetType === 'blocks' && (
                                 <div className="mt-2 p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700">
                                     <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t('campaigns.select_blocks', 'Select Blocks')}</label>
                                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                         {availableBlocks.map(block => (
                                             <label key={block.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded">
                                                 <input 
                                                     type="checkbox"
                                                     value={block.id}
                                                     checked={selectedBlocks.includes(block.id)}
                                                     onChange={(e) => {
                                                         if(e.target.checked) {
                                                             setSelectedBlocks([...selectedBlocks, block.id]);
                                                         } else {
                                                             setSelectedBlocks(selectedBlocks.filter(id => id !== block.id));
                                                         }
                                                     }}
                                                     className="rounded text-indigo-600 focus:ring-indigo-500"
                                                 />
                                                 <span className="text-sm text-gray-700 dark:text-gray-300">{block.name}</span>
                                             </label>
                                         ))}
                                     </div>
                                 </div>
                             )}
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
                )}

                {/* List of campaigns */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map(campaign => (
                         <div key={campaign.id} className="glass-card p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{campaign.name}</h3>
                                    <span className={`inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium ${campaign.is_active ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500' : 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-500'}`}>
                                        {campaign.is_active ? t('campaigns.active', 'Active') : t('campaigns.closed', 'Closed')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4 h-12 overflow-hidden text-ellipsis">
                                    {campaign.description || t('campaigns.no_desc', 'No description provided.')}
                                </p>
                                
                                <CampaignProgress 
                                    campaign={campaign} 
                                />

                                <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-neutral-500 mb-4">
                                    <span>{t('campaigns.collected', 'Collected')}: €{campaign.current_amount}</span>
                                    <span>{t('campaigns.goal', 'Goal')}: €{campaign.target_amount}</span>
                                </div>
                                {campaign.deadline && (
                                     <div className="text-xs text-gray-500 dark:text-neutral-400 mb-4 text-right">
                                        {t('campaigns.deadline_label', 'Deadline')}: {new Date(campaign.deadline).toLocaleDateString()}
                                     </div>
                                )}

                                {canCreate && (
                                    <button 
                                        onClick={() => handleEditClick(campaign)}
                                        className="w-full py-2 px-3 inline-flex justify-center items-center gap-2 rounded-lg border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-neutral-800 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-white dark:focus:ring-offset-gray-800"
                                    >
                                        {t('common.edit', 'Edit')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit Modal */}
                {editingCampaign && (
                    <ModalPortal>
                     <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingCampaign(null)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white dark:bg-neutral-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <div className="bg-white dark:bg-neutral-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                        {t('campaigns.edit_title', 'Edit Campaign')}
                                    </h3>
                                    <form onSubmit={handleUpdate} className="mt-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.name', 'Campaign Name')}</label>
                                            <input 
                                                type="text" 
                                                required 
                                                className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.goal', 'Goal Amount (€)')}</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                required 
                                                className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                                value={editForm.goal_amount}
                                                onChange={(e) => setEditForm({...editForm, goal_amount: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                             <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.description', 'Description')}</label>
                                             <textarea 
                                                className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                                rows="3"
                                                value={editForm.description}
                                                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                             ></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('campaigns.deadline', 'Deadline')} <span className="text-gray-400 font-normal">({t('campaigns.ongoing_hint', 'Leave empty for ongoing')})</span></label>
                                            <input 
                                                type="date" 
                                                className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                                                value={editForm.deadline}
                                                onChange={(e) => setEditForm({...editForm, deadline: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex items-center">
                                            <input 
                                                id="is_active" 
                                                name="is_active" 
                                                type="checkbox" 
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                checked={editForm.is_active}
                                                onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                                            />
                                            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                                {t('campaigns.is_active', 'Active Campaign')}
                                            </label>
                                        </div>
                                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                            <button 
                                                type="submit" 
                                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                                            >
                                                {t('common.save', 'Save Changes')}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setEditingCampaign(null)}
                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    </ModalPortal>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Campaigns;
