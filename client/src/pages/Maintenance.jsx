import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import ConfirmationModal from '../components/ConfirmationModal';
import PaymentUpload from '../components/payments/PaymentUpload';
import PaymentReviewModal from '../components/payments/PaymentReviewModal';
import ModalPortal from '../components/ModalPortal';
import GlassLoader from '../components/GlassLoader';

const Maintenance = () => {
    const { t } = useTranslation();
    const { user, activeCommunity, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState('community'); // 'community' | 'personal'

    // Admin Generation State
    const [genPeriod, setGenPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [genAmount, setGenAmount] = useState('50');
    const [generating, setGenerating] = useState(false);
    const [genMessage, setGenMessage] = useState('');
    const [message, setMessage] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [feeToDelete, setFeeToDelete] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState(null);

    const handleReviewClick = (fee) => {
        setSelectedReviewId(fee.payment_id);
        setReviewModalOpen(true);
    };

    const handlePayClick = (fee) => {
        setSelectedFeeForPayment(fee);
        setPaymentModalOpen(true);
    };

    const handleDeleteClick = (fee) => {
        setFeeToDelete(fee);
        setDeleteModalOpen(true);
    };

    const handleResendEmail = async (fee) => {
        try {
            setMessage(t('maintenance.sending_email', 'Sending email...'));
            const res = await fetch(`${API_URL}/api/maintenance/${fee.id}/email`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Community-ID': activeCommunity.community_id
                }
            });

            const data = await res.json();
            if (res.ok) {
                setMessage(t('maintenance.email_sent', 'Email sent successfully'));
            } else {
                setMessage(t('maintenance.email_error', `Error: ${data.error}`));
            }
        } catch (error) {
            console.error(error);
            setMessage('Network error');
        }
    };

    const handleConfirmDelete = async () => {
        if (!feeToDelete) return;
        
        try {
            const res = await fetch(`${API_URL}/api/maintenance/${feeToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                setMessage(t('maintenance.delete_success', 'Fee deleted successfully'));
                fetchFees();
            } else {
                const data = await res.json();
                setMessage(t('maintenance.delete_error', `Error deleting: ${data.error}`));
            }
        } catch (error) {
            console.error("Delete error:", error);
            setMessage('Network error');
        } finally {
            setDeleteModalOpen(false);
            setFeeToDelete(null);
        }
    };

    useEffect(() => {
        if (!authLoading && activeCommunity) {
            const rawRole = activeCommunity?.roles;
            // Handle Supabase returning array (1-to-many inference) or object (1-to-1)
            const roleName = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;
            
            console.log("Maintenance: Role Check", { 
                roleName, 
                rawRole, 
                isAdminCalc: ['admin', 'president', 'treasurer'].includes(roleName) 
            });

            const adminRole = ['admin', 'president', 'treasurer'].includes(roleName);
            setIsAdmin(adminRole);
            
            const hasUnits = activeCommunity?.unit_owners?.length > 0;

            // If not admin and trying to view community, force personal
            if (!adminRole && activeTab === 'community') {
                console.log("Maintenance: Unauthorized for community view, switching to personal.");
                setActiveTab('personal');
            }

            // If admin but NO units, force community (cannot view personal)
            if (adminRole && !hasUnits && activeTab === 'personal') {
                 console.log("Maintenance: Admin has no units, switching to community view.");
                 setActiveTab('community');
            }
        }
    }, [activeCommunity, user, authLoading, activeTab]); // Added activeTab to dependency array to catch state changes

    // Fetch when relevant state changes (tab or admin status)
    useEffect(() => {
        if (activeCommunity) {
            fetchFees();
        }
    }, [activeTab, isAdmin, activeCommunity]);

    // Auto-clear messages
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 10000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        if (genMessage) {
            const timer = setTimeout(() => setGenMessage(''), 10000);
            return () => clearTimeout(timer);
        }
    }, [genMessage]);

    const fetchFees = async () => {
        if (!activeCommunity) return;

        setLoading(true);
        try {
            // Calculate role immediately to avoid state lag from useEffect
            const rawRole = activeCommunity?.roles;
            const roleName = Array.isArray(rawRole) ? rawRole[0]?.name : rawRole?.name;
            const isUserAdmin = ['admin', 'president', 'treasurer'].includes(roleName);

            // Ensure UI state matches (optional sync)
            if (isUserAdmin !== isAdmin) setIsAdmin(isUserAdmin);

            // Logic explicitly checks calculated values
            // Use isUserAdmin instead of potentially stale isAdmin state
            const endpoint = (isUserAdmin && activeTab === 'community') 
                ? `${API_URL}/api/maintenance/status` 
                : `${API_URL}/api/maintenance/my-statement`;

            const res = await fetch(endpoint);

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
        setGenMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/maintenance/generate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ period: `${genPeriod}-01`, amount: parseFloat(genAmount) })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.count === 0) {
                    setGenMessage(t('maintenance.warning_gen_zero', 'Warning: No new fees generated. All occupied units may already be billed for this period.'));
                } else {
                    setGenMessage(t('maintenance.success_gen', `Success: Generated ${data.count} fees successfully.`));
                }
                fetchFees();
            } else {
                setGenMessage(t('maintenance.error_gen', `Error: ${data.error}`));
            }
        } catch (error) {
            console.error(error);
            setGenMessage('Network error');
        } finally {
            setGenerating(false);
        }
    };

    const getStatusColor = (status, paymentId) => {
        if (status === 'pending' && paymentId) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        switch(status) {
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const hasUnits = activeCommunity?.unit_owners?.length > 0;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {t('maintenance.title', 'Maintenance Fees')}
                    </h1>
                    
                    {/* Tab Switcher for Admins (Only if they have units) */}
                    {isAdmin && hasUnits && (
                        <div className="p-1 rounded-full flex items-center backdrop-blur-md bg-white/30 border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10">
                            <button
                                onClick={() => setActiveTab('community')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                                    activeTab === 'community'
                                        ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                        : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'
                                }`}
                            >
                                {t('maintenance.tab_community', 'Community Management')}
                            </button>
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                                    activeTab === 'personal'
                                        ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                        : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'
                                }`}
                            >
                                {t('maintenance.tab_personal', 'My Statement')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Admin Generator Section */}
                {isAdmin && activeTab === 'community' && (
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t('maintenance.generate_title', 'Generate Monthly Fees')}</h2>
                        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('maintenance.period', 'Billing Period')}</label>
                                <input 
                                    type="month" 
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

                        {genMessage && <p className={`mt-2 text-sm ${
                            genMessage.includes('Error') ? 'text-red-500' : 
                            genMessage.includes('Warning') ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-500'
                        }`}>{genMessage}</p>}
                    </div>
                )}

                {/* Fee List */}
                <div className="glass-card p-6">
                     <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
                        {isAdmin ? t('maintenance.community_status', 'Community Status') : t('maintenance.history', 'Payment History')}
                     </h2>
                    
                    {message && <p className={`mb-4 text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}


                    {loading ? (
                        <GlassLoader />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="glass-table">
                                <thead>
                                    <tr>
                                        <th>{t('maintenance.period', 'Period')}</th>
                                        <th>{t('maintenance.unit', 'Unit')}</th>
                                        {isAdmin && activeTab === 'community' && <th>{t('maintenance.owner', 'Owner')}</th>}
                                        <th>{t('maintenance.amount', 'Amount')}</th>
                                        <th>{t('maintenance.status', 'Status')}</th>
                                        <th className="text-right">{t('common.actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fees.map(fee => (
                                        <tr key={fee.id}>
                                            <td className="text-gray-900 dark:text-white">
                                                {new Date(fee.period + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', timeZone: 'UTC' })}
                                            </td>
                                            <td className="text-gray-500 dark:text-neutral-400">
                                                {(fee.block_name || fee.units?.blocks?.name) ? `${fee.block_name || fee.units?.blocks?.name} - ` : ''}
                                                {fee.unit_number || fee.units?.unit_number}
                                            </td>
                                            {isAdmin && activeTab === 'community' && (
                                                <td className="text-gray-500 dark:text-neutral-400">
                                                    {fee.owner_name}
                                                </td>
                                            )}
                                            <td className="text-gray-900 dark:text-white">
                                                {fee.amount}
                                            </td>
                                            <td>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(fee.status, fee.payment_id)}`}>
                                                    {(fee.status === 'pending' && fee.payment_id) 
                                                        ? t('maintenance.statuses.processing', 'Processing') 
                                                        : (t(`maintenance.statuses.${fee.status}`, fee.status))}
                                                </span>
                                            </td>
                                            <td className="text-right font-medium">
                                                {/* Resend Email Button (Admin Community View) */}
                                                {isAdmin && activeTab === 'community' && (
                                                    <button
                                                        onClick={() => handleResendEmail(fee)}
                                                        className="mr-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 transition-colors inline-flex items-center"
                                                        title={t('maintenance.resend_email', 'Resend Email')}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Review Button (Admin Community View + Pending + HAS payment_id) */}
                                                {isAdmin && activeTab === 'community' && fee.status === 'pending' && fee.payment_id && (
                                                    <button
                                                        onClick={() => handleReviewClick(fee)}
                                                        className="mr-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center"
                                                        title={t('maintenance.review', 'Review Payment')}
                                                    >
                                                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                                        {t('common.review', 'Review')}
                                                    </button>
                                                )}

                                                {/* Record Payment Button (Admin Community View + Pending + NO payment_id) */}
                                                {isAdmin && activeTab === 'community' && fee.status === 'pending' && !fee.payment_id && (
                                                    <button
                                                        onClick={() => handlePayClick(fee)}
                                                        className="mr-2 inline-flex items-center px-3 py-1 text-xs font-medium rounded-full shadow-lg backdrop-blur-md bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-500/30 transition-all"
                                                        title={t('maintenance.record_payment', 'Record Payment')}
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {t('maintenance.register', 'Register')}
                                                    </button>
                                                )}

                                                {/* Delete Button (Admin Community View) - Only if NO payment registered */}
                                                {isAdmin && activeTab === 'community' && !fee.payment_id && (
                                                    <button
                                                        onClick={() => handleDeleteClick(fee)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                        title={t('common.delete', 'Delete')}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Pay Button (My Statement View + Pending/Overdue + NO payment_id) */}
                                                {activeTab !== 'community' && (fee.status === 'pending' || fee.status === 'overdue') && !fee.payment_id && (
                                                    <button
                                                        onClick={() => handlePayClick(fee)}
                                                        className="inline-flex items-center px-4 py-1.5 text-xs font-medium rounded-full shadow-lg backdrop-blur-md bg-green-600/80 hover:bg-green-600 border border-green-500/50 text-white transition-all transform hover:scale-105"
                                                    >
                                                        {t('maintenance.pay', 'Pay')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {fees.length === 0 && <p className="text-center py-4 text-gray-500">{t('maintenance.no_records', 'No records found.')}</p>}
                        </div>
                    )}
                </div>

                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('maintenance.delete_title', 'Delete Maintenance Fee')}
                    message={t('maintenance.delete_confirm', 'Are you sure you want to delete this fee? This action cannot be undone.')}
                    confirmText={t('common.delete', 'Delete')}
                    isDangerous={true}
                />

                {/* Payment Upload Modal */}
                {paymentModalOpen && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-lg">
                                <PaymentUpload 
                                    onSuccess={() => {
                                        setPaymentModalOpen(false);
                                        fetchFees(); // Refresh status
                                        setMessage(t('payment.success', 'Payment uploaded successfully'));
                                    }} 
                                    onCancel={() => setPaymentModalOpen(false)}
                                    // Pass pre-filled data
                                    initialType="maintenance"
                                    initialFeeId={selectedFeeForPayment?.id}
                                    initialAmount={selectedFeeForPayment?.amount}
                                    initialUnitId={selectedFeeForPayment?.unit_id} // If available in fee object? Yes, usually.
                                    isAdmin={isAdmin} // In this context, even admins pay as residents
                                />
                            </div>
                        </div>
                    </ModalPortal>
                )}

                <PaymentReviewModal
                    isOpen={reviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    paymentId={selectedReviewId}
                    onConfirm={() => {
                        setMessage(t('maintenance.payment_confirmed', 'Payment confirmed successfully'));
                        fetchFees();
                    }}
                    onReject={() => {
                        setMessage(t('maintenance.payment_rejected', 'Payment rejected'));
                        fetchFees();
                    }}
                />
            </div>
        </DashboardLayout>
    );
};

export default Maintenance;
