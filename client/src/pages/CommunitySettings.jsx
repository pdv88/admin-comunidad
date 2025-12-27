import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

import DashboardLayout from '../components/DashboardLayout';
import GlassLoader from '../components/GlassLoader';

const CommunitySettings = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [community, setCommunity] = useState({
        name: '',
        address: '',
        bank_details: [] // Array of { bank_name, account_number, etc }
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage('');
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        fetchCommunity();
    }, []);

    const fetchCommunity = async () => {
        try {
            const res = await fetch(`${API_URL}/api/communities/my`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Ensure bank_details is an array if null
                setCommunity({ 
                    ...data, 
                    bank_details: Array.isArray(data.bank_details) ? data.bank_details : [] 
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch(`${API_URL}/api/communities/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(community)
            });

            if (res.ok) {
                setMessage(t('community_settings.success'));
            } else {
                setMessage(t('community_settings.error'));
            }
        } catch (error) {
            setMessage(t('community_settings.error_prefix') + error.message);
        } finally {
            setSaving(false);
        }
    };

    const addBankAccount = () => {
        setCommunity(prev => ({
            ...prev,
            bank_details: [...prev.bank_details, { bank_name: '', account_number: '', account_holder: '' }]
        }));
    };

    const removeBankAccount = (index) => {
        setCommunity(prev => {
            const newBanks = [...prev.bank_details];
            newBanks.splice(index, 1);
            return { ...prev, bank_details: newBanks };
        });
    };

    const updateBankAccount = (index, field, value) => {
        setCommunity(prev => {
            const newBanks = [...prev.bank_details];
            newBanks[index] = { ...newBanks[index], [field]: value };
            return { ...prev, bank_details: newBanks };
        });
    };

    if (loading) {
        return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('community_settings.title')}</h1>
                </div>
                
                <div className="glass-card p-6 rounded-xl">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('community_settings.name')}
                                </label>
                                <input
                                    type="text"
                                    className="glass-input w-full"
                                    value={community.name}
                                    onChange={(e) => setCommunity({ ...community, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('community_settings.address')}
                                </label>
                                <input
                                    type="text"
                                    className="glass-input w-full"
                                    value={community.address}
                                    onChange={(e) => setCommunity({ ...community, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold dark:text-white">{t('community_settings.bank_accounts')}</h2>
                                <button 
                                    type="button" 
                                    onClick={addBankAccount}
                                    className="glass-button-secondary py-2 px-4 text-xs"
                                >
                                    {t('community_settings.add_account')}
                                </button>
                            </div>

                            {community.bank_details.length === 0 && (
                                <p className="text-sm text-gray-500 italic">{t('community_settings.no_accounts')}</p>
                            )}

                            <div className="space-y-4">
                                {community.bank_details.map((bank, index) => (
                                    <div key={index} className="bg-gray-50/50 dark:bg-neutral-800/50 p-4 rounded-lg relative group border border-gray-100 dark:border-gray-700/50 transition-all hover:bg-white/40 dark:hover:bg-neutral-800">
                                        <button
                                            type="button"
                                            onClick={() => removeBankAccount(index)}
                                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title={t('common.delete')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">{t('community_settings.bank_name')}</label>
                                                <input
                                                    type="text"
                                                    className="glass-input w-full text-sm"
                                                    placeholder={t('community_settings.placeholders.bank_name')}
                                                    value={bank.bank_name}
                                                    onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">{t('community_settings.account_number')}</label>
                                                <input
                                                    type="text"
                                                    className="glass-input w-full text-sm"
                                                    placeholder={t('community_settings.placeholders.account_number')}
                                                    value={bank.account_number}
                                                    onChange={(e) => updateBankAccount(index, 'account_number', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">{t('community_settings.account_holder')}</label>
                                                <input
                                                    type="text"
                                                    className="glass-input w-full text-sm"
                                                    placeholder={t('community_settings.placeholders.account_holder')}
                                                    value={bank.account_holder}
                                                    onChange={(e) => updateBankAccount(index, 'account_holder', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                            {message && <span className={`text-sm ${message.includes('Error') || message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{message}</span>}
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="glass-button"
                            >
                                {saving ? t('community_settings.saving') : t('community_settings.save')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CommunitySettings;
