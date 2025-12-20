import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';

import GlassSelect from '../GlassSelect';
import { useAuth } from '../../context/AuthContext';

const PaymentUpload = ({ onSuccess, onCancel, isAdmin }) => {
    const { user: currentUser, activeCommunity } = useAuth();
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [campaigns, setCampaigns] = useState([]);
    
    // New state for units
    const [userUnits, setUserUnits] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState('');
    
    // New state for payment categorization
    const [paymentType, setPaymentType] = useState('maintenance'); // 'maintenance' or 'campaign'
    const [pendingFees, setPendingFees] = useState([]);
    const [filteredFees, setFilteredFees] = useState([]); // Filtered by selected unit
    const [selectedFeeId, setSelectedFeeId] = useState('');

    React.useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
        fetchCampaigns();
        fetchPendingFees();
    }, [isAdmin, selectedUserId]); // Refetch if admin changes selected user

    // Effect to determine available units based on selection
    React.useEffect(() => {
        // If Admin selected a User
        if (isAdmin && selectedUserId) {
            const user = users.find(u => u.id === selectedUserId);
            if (user && user.unit_owners) {
                // Flatten unit_owners to units
                const units = user.unit_owners.map(uo => ({
                    id: uo.unit_id,
                    name: `${uo.units?.blocks?.name || 'Block'} - ${uo.units?.unit_number}`
                }));
                setUserUnits(units);
                if (units.length === 1) setSelectedUnitId(units[0].id);
                else setSelectedUnitId('');
            } else {
                setUserUnits([]);
            }
        } 
        // If Admin selected 'Myself' (empty string) OR NOT Admin (Resident)
        else {
            // Use activeCommunity units
            if (activeCommunity?.unit_owners) {
                 const units = activeCommunity.unit_owners.map(uo => ({
                    id: uo.unit_id,
                    name: `${uo.units?.blocks?.name || 'Block'} - ${uo.units?.unit_number}`
                }));
                setUserUnits(units);
                if (units.length === 1) setSelectedUnitId(units[0].id);
                else setSelectedUnitId('');
            }
        }
    }, [selectedUserId, isAdmin, users, activeCommunity]);

    // Effect to filter fees when unit changes
    React.useEffect(() => {
        if (selectedUnitId && pendingFees.length > 0) {
            setFilteredFees(pendingFees.filter(f => f.unit_id === selectedUnitId));
        } else {
            setFilteredFees([]);
        }
        setSelectedFeeId(''); // Reset selection when unit changes
    }, [selectedUnitId, pendingFees]);

    const fetchPendingFees = async () => {
        try {
            const token = localStorage.getItem('token');
            const targetUser = selectedUserId || 'me'; // If admin selected someone, use that, else 'me' (handled by backend or we filter?)
            // Actually, existing endpoint /api/maintenance/my-statement returns for 'me'.
            // If admin is selecting for another user, we might need a specific endpoint or filter.
            // For now, let's assume this component is mostly used by Residents for themselves.
            // If Admin uses it, they might just want to upload a generic payment or we need to support 'get fees for user X'.
            // Let's stick to "My Statement" for now. If Admin selects a user, we skip this optimization or add endpoint later?
            // Wait, if Resident is paying, they MUST see their fees.
            
            // Just use the existing endpoint which uses user context.
            // If admin, this might return Admin's fees? Yes.
            // LIMITATION: Admin uploading for User won't see User's specific pending fees yet unless we update backend.
            // WORKAROUND: For this iteration, let's just show 'my' fees if not admin, or generic if admin.
            // OR: We can use the /maintenance/status endpoint filtered by user if admin.
            
            // Let's try simple path:
             const res = await fetch(`${API_URL}/api/maintenance/my-statement`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter only 'pending' or 'overdue'
                setPendingFees(data.filter(f => f.status === 'pending' || f.status === 'overdue'));
            }
        } catch (error) {
            console.error('Error fetching fees:', error);
        }
    };

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

        // Validation: If user has units, they MUST select one
        if (userUnits.length > 0 && !selectedUnitId) {
            setMessage(t('payments.upload.error_unit_required', 'Please select a specific unit for this payment.'));
            setLoading(false);
            return;
        }

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
                campaign_id: paymentType === 'campaign' ? selectedCampaignId : null,
                monthly_fee_id: paymentType === 'maintenance' ? selectedFeeId : null,
                unit_id: selectedUnitId || null
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
        <div className="glass-card p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">{t('payments.upload.title', 'Register Payment')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {isAdmin && (
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.user_select', 'Select User (Admin)')}</label>
                        <GlassSelect 
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            options={[
                                { value: '', label: t('payments.upload.myself', 'Myself') },
                                ...users.map(u => ({ value: u.id, label: u.full_name || u.email }))
                            ]}
                            placeholder={t('payments.upload.user_select', 'Select User')}
                        />
                    </div>
                )}

                {/* Unit Selection - Show if User has units */}
                {userUnits.length > 0 && (
                     <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.unit_select', 'Select Unit')} <span className="text-red-500">*</span></label>
                        <GlassSelect 
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            options={[
                                { value: '', label: t('common.select', 'Select Unit...') },
                                ...userUnits.map(u => ({ value: u.id, label: u.name }))
                            ]}
                            placeholder={t('payments.upload.unit_select', 'Select Unit')}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {t('payments.upload.multi_unit_hint', 'If your transfer covers multiple units, please register separate payments for each.')}
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.category', 'Payment Category')}</label>
                    <div className="grid sm:grid-cols-2 gap-2">
                        <label className={`flex items-center p-3 w-full backdrop-blur-md rounded-xl border cursor-pointer transition-all ${paymentType === 'maintenance' ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-white/30 dark:bg-neutral-800/40 border-white/20 dark:border-white/5 hover:bg-white/40'}`}>
                            <input type="radio" name="payment-type" value="maintenance" className="hidden" checked={paymentType === 'maintenance'} onChange={() => setPaymentType('maintenance')} />
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentType === 'maintenance' ? 'border-blue-500' : 'border-gray-400'}`}>
                                {paymentType === 'maintenance' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('payments.upload.type_maintenance', 'Monthly Maintenance')}</span>
                        </label>

                        <label className={`flex items-center p-3 w-full backdrop-blur-md rounded-xl border cursor-pointer transition-all ${paymentType === 'campaign' ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-white/30 dark:bg-neutral-800/40 border-white/20 dark:border-white/5 hover:bg-white/40'}`}>
                            <input type="radio" name="payment-type" value="campaign" className="hidden" checked={paymentType === 'campaign'} onChange={() => setPaymentType('campaign')} />
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentType === 'campaign' ? 'border-blue-500' : 'border-gray-400'}`}>
                                {paymentType === 'campaign' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('payments.upload.type_campaign', 'Funding Campaign')}</span>
                        </label>
                    </div>
                </div>



                {paymentType === 'maintenance' && !isAdmin && (
                    <div>
                         <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.select_fee', 'Select Pending Month (Optional)')}</label>
                         
                         {selectedUnitId ? (
                             <GlassSelect
                                value={selectedFeeId}
                                onChange={(e) => {
                                    setSelectedFeeId(e.target.value);
                                    const fee = filteredFees.find(f => f.id === e.target.value);
                                    if (fee) setAmount(String(fee.amount)); 
                                }}
                                options={[
                                    { value: '', label: t('common.select_or_general', 'General Payment / Balance') },
                                    ...filteredFees.map(fee => ({
                                        value: fee.id,
                                        label: `${new Date(fee.period).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} - ${fee.amount}€`
                                    }))
                                ]}
                                placeholder={t('common.select', 'Select Fee')}
                             />
                         ) : (
                            <div className="text-sm text-gray-500 italic p-2 border border-dashed border-gray-300 rounded-lg">
                                {t('payments.upload.select_unit_first', 'Select a unit to see pending fees.')}
                            </div>
                         )}
                         <p className="text-xs text-gray-400 mt-1">{t('payments.upload.fee_hint', 'Selecting a month links this payment to that debt.')}</p>
                    </div>
                )}

                {paymentType === 'campaign' && (
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.select_campaign', 'Select Campaign')}</label>
                         <GlassSelect 
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            options={[
                                { value: '', label: t('common.select', 'Select...') },
                                ...campaigns.map(c => ({ value: c.id, label: c.name }))
                            ]}
                            placeholder={t('common.select', 'Select Campaign')}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.amount', 'Amount (€)')}</label>
                    <input 
                        type="number" 
                        step="0.01"
                        required
                        className="glass-input"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.notes', 'Notes (Optional)')}</label>
                    <input 
                        type="text" 
                        className="glass-input"
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
                        className="block w-full text-sm text-gray-500 file:me-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 glass-input p-1 pl-1"
                    />
                </div>

                {message && <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-400'}`}>{message}</p>}

                <div className="flex gap-3 pt-2">
                    {onCancel && (
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="glass-button-secondary flex-1"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="glass-button flex-1"
                    >
                        {loading ? t('common.loading', 'Loading...') : t('payments.upload.submit', 'Submit Payment')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PaymentUpload;
