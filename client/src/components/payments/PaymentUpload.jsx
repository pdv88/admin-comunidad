import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';

import GlassSelect from '../GlassSelect';
import { useAuth } from '../../context/AuthContext';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import FormModal from '../FormModal';

const PaymentUpload = ({ onSuccess, onCancel, isAdmin, initialType, initialFeeId, initialCampaignId, initialAmount, initialUnitId }) => {
    const { user: currentUser, activeCommunity } = useAuth();
    const { t } = useTranslation();
    const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedCampaignId, setSelectedCampaignId] = useState(initialCampaignId || '');
    const [campaigns, setCampaigns] = useState([]);

    // New state for units
    const [userUnits, setUserUnits] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId || '');

    // New state for payment categorization
    const [paymentType, setPaymentType] = useState(initialType || 'maintenance'); // 'maintenance' or 'campaign'
    const [pendingFees, setPendingFees] = useState([]);
    const [filteredFees, setFilteredFees] = useState([]); // Filtered by selected unit
    const [selectedFeeId, setSelectedFeeId] = useState(initialFeeId || '');

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
            if (activeCommunity?.unit_owners) {
                const units = activeCommunity.unit_owners.map(uo => ({
                    id: uo.unit_id,
                    name: `${uo.units?.blocks?.name || 'Block'} - ${uo.units?.unit_number}`
                }));
                setUserUnits(units);

                // Logic to set default unit:
                // 1. If only 1 unit exists, select it.
                // 2. If initialUnitId is provided and valid, keep it (don't clear it).
                // 3. Otherwise, if multiple units and no valid initial selection, clear it logic is handled by NOT setting it here if we want to respect existing state, 
                // BUT we usually want to reset if user changes.
                // Since this runs on mount/updates, we should be careful.

                if (units.length === 1) {
                    setSelectedUnitId(units[0].id);
                } else if (initialUnitId && units.some(u => u.id === initialUnitId)) {
                    // Do nothing, respect initial state
                } else {
                    // Only clear if we are not in a pre-filled context for that unit?
                    // Actually, if we are switching users (admin), we WANT to clear.
                    // If we are just mounting component as resident, initialUnitId is set in state.
                    // So we just need to avoid overwriting it with ''.
                    if (!initialUnitId) setSelectedUnitId('');
                }
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
        // Don't auto-reset selectedFeeId here, it wipes initialFeeId on load.
        // We handle reset on manual unit change.
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
                // Controller returns wrapped object with data property
                setUsers(data.data || []);
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
        if (e) e.preventDefault();
        setLoading(true);
        setMessage('');

        // Validation: If user has units, they MUST select one (only for voluntary contributions)
        if (!selectedFeeId && userUnits.length > 0 && !selectedUnitId) {
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

            let res;

            if (selectedFeeId) {
                // FEE REGISTRATION MODE: Call maintenance API
                // Backend handles logic: admins mark as paid, neighbors create pending payment
                res = await fetch(`${API_URL}/api/maintenance/${selectedFeeId}/pay`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        notes,
                        base64Image,
                        fileName: file ? file.name : null,
                        payment_date: paymentDate
                    })
                });
            } else {
                // VOLUNTARY CONTRIBUTION MODE: Call payments API
                const payload = {
                    amount,
                    notes,
                    base64Image,
                    fileName: file ? file.name : null,
                    campaign_id: selectedCampaignId || null,
                    unit_id: selectedUnitId || null,
                    payment_date: paymentDate
                };

                // If admin and filtered user, send userId
                if (isAdmin && selectedUserId) {
                    payload.targetUserId = selectedUserId;
                }

                res = await fetch(`${API_URL}/api/payments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Upload failed');
            }

            setAmount('');
            setNotes('');
            setFile(null);
            setPaymentType('maintenance');
            setSelectedCampaignId('');
            setMessage(t('payments.success', 'Payment registered successfully'));
            if (onSuccess) onSuccess();

        } catch (error) {
            setMessage(error.message || t('payments.error', 'Error registering payment'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            isOpen={true}
            onClose={onCancel}
            onSubmit={handleSubmit}
            title={t('payments.upload.title', 'Register Payment')}
            submitText={t('payments.upload.submit', 'Submit Payment')}
            isLoading={loading}
        >
            <div className="space-y-4">

                {isAdmin && !initialFeeId && !initialUnitId && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.select_user', 'Register for User')}</label>
                        <GlassSelect
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            options={[
                                { value: '', label: t('payments.upload.myself', 'Myself / Current User') },
                                ...users.map(u => ({
                                    value: u.id,
                                    label: `${u.full_name} ${u.unit_owners?.length > 0 ? `(${u.unit_owners[0].units?.unit_number})` : ''}`
                                }))
                            ]}
                            placeholder={t('common.select_user', 'Select User (Optional)')}
                        />
                        <p className="text-xs text-gray-400 mt-1">{t('payments.upload.user_hint', 'Leave empty to register for yourself.')}</p>
                    </div>
                )}

                {/* Unit Selection - Hide if initialUnitId provided or no units */}


                {!initialType && (
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.category', 'Payment Category')}</label>
                        <div className="grid sm:grid-cols-2 gap-2">
                            <label className={`flex items-center p-3 w-full backdrop-blur-md rounded-xl border transition-all ${paymentType === 'maintenance' ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-white/30 dark:bg-neutral-800/40 border-white/20 dark:border-white/5 hover:bg-white/40'} ${initialType ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name="payment-type"
                                    value="maintenance"
                                    className="hidden"
                                    checked={paymentType === 'maintenance'}
                                    onChange={() => !initialType && setPaymentType('maintenance')}
                                    disabled={!!initialType}
                                />
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentType === 'maintenance' ? 'border-blue-500' : 'border-gray-400'}`}>
                                    {paymentType === 'maintenance' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('payments.upload.type_maintenance', 'Monthly Maintenance')}</span>
                            </label>

                            <label className={`flex items-center p-3 w-full backdrop-blur-md rounded-xl border transition-all ${paymentType === 'campaign' ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-white/30 dark:bg-neutral-800/40 border-white/20 dark:border-white/5 hover:bg-white/40'} ${initialType ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name="payment-type"
                                    value="campaign"
                                    className="hidden"
                                    checked={paymentType === 'campaign'}
                                    onChange={() => !initialType && setPaymentType('campaign')}
                                    disabled={!!initialType}
                                />
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${paymentType === 'campaign' ? 'border-blue-500' : 'border-gray-400'}`}>
                                    {paymentType === 'campaign' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('payments.upload.type_campaign', 'Funding Campaign')}</span>
                            </label>
                        </div>
                    </div>
                )}



                {paymentType === 'maintenance' && !isAdmin && !initialFeeId && (
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
                                    ...filteredFees.map(fee => {
                                        const dateLabel = /^\d{4}-\d{2}/.test(fee.period)
                                            ? new Date(fee.period + (fee.period.length === 7 ? '-01' : '') + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                                            : fee.period;

                                        return {
                                            value: fee.id,
                                            label: `${dateLabel} - ${getCurrencySymbol(activeCommunity?.communities?.currency)}${fee.amount}`
                                        };
                                    })
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

                {paymentType === 'campaign' && !initialCampaignId && (
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





                {/* Amount - Input if variable, Display if fixed */}
                {!initialAmount ? (
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.amount', 'Amount')}</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="glass-input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">{t('payments.upload.amount', 'Amount to Pay')}</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white">{getCurrencySymbol(activeCommunity?.communities?.currency)}{amount}</p>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('payments.upload.date', 'Payment Date')}</label>
                    <input
                        type="date"
                        required
                        className="glass-input"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
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
            </div>
        </FormModal>
    );
};

export default PaymentUpload;
