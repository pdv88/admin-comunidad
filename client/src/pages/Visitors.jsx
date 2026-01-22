import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import ModalPortal from '../components/ModalPortal';
import GlassSelect from '../components/GlassSelect';
import StatusBadge from '../components/StatusBadge';

const Visitors = () => {
    const { t } = useTranslation();
    const { token, user, activeCommunity, hasAnyRole } = useAuth();
    const isAdmin = hasAnyRole(['admin', 'president', 'security', 'concierge']);

    const [activeTab, setActiveTab] = useState('my'); // 'my', 'all', 'providers'
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    
    // Form State
    const [newVisit, setNewVisit] = useState({
        visitor_name: '',
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: '12:00',
        type: 'guest',
        unit_id: '',
        notes: ''
    });

    const [availableUnits, setAvailableUnits] = useState([]);

    useEffect(() => {
        if (activeCommunity?.community_id && token) {
            fetchVisits();
            if (isAdmin) {
                fetchUnits();
            } else {
                 // Populate units for residents from activeCommunity context
                 if (activeCommunity?.unit_owners?.length > 0) {
                      const units = activeCommunity.unit_owners.map(uo => ({
                          id: uo.unit_id,
                          name: uo.units?.name || (uo.units?.block_id ? `${uo.units.blocks?.name} - ${uo.units.name}` : uo.units?.name) || 'My Unit'
                      }));
                      setAvailableUnits(units);
                      
                      // Auto-select if only one
                      if (units.length === 1) {
                          setNewVisit(prev => ({ ...prev, unit_id: units[0].id }));
                      }
                 }
            }
        }
    }, [activeCommunity, activeTab, isAdmin, token]);

    const fetchUnits = async () => {
        try {
             // Re-using the properties/blocks endpoint which returns the hierarchy
             const res = await axios.get(`${API_URL}/api/properties/blocks`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-community-id': activeCommunity?.community_id
                }
             });
             
             if (res.data) {
                const units = [];
                res.data.forEach(b => {
                    if (b.units) {
                         b.units.forEach(u => units.push({
                            id: u.id,
                            name: `${b.name} - ${u.unit_number}`,
                            raw: u
                         }));
                    }
                });
                setAvailableUnits(units);
             }
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/visitors`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-community-id': activeCommunity?.community_id
                }
            });
            
            let data = res.data;

            // Client-side filtering if needed (though backend handles security)
            // 'providers' tab filter
            if (activeTab === 'providers') {
                data = data.filter(v => ['provider', 'service', 'delivery'].includes(v.type));
            } else if (activeTab === 'all') {
                // Show all (except maybe strictly providers if we want to separate them? Admin usually wants to see everything mixed or filtered)
                // Let's keep 'all' as truly ALL.
            } else if (activeTab === 'my') {
                 // For residents, backend only returns "my".
                 // For admins, "my" should filter to their personal visits if any?
                 if (isAdmin) {
                     data = data.filter(v => v.created_by === user.id);
                 }
            }

            setVisits(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching visits', error);
            setLoading(false);
        }
    };

    const handleCreateVisit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/api/visitors`, newVisit, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-community-id': activeCommunity?.community_id
                }
            });
            setModalOpen(false);
            fetchVisits();
            // Reset form
            setNewVisit({
                visitor_name: '',
                visit_date: new Date().toISOString().split('T')[0],
                visit_time: '12:00',
                type: 'guest',
                unit_id: '',
                notes: ''
            });
        } catch (error) {
            console.error('Error creating visit:', error);
            alert('Failed to register visit');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('visitors.title', 'Visitors & Access')}</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage guest access and providers</p>
                    </div>
                </div>

                {/* Tabs & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex bg-white/30 backdrop-blur-md border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10 p-1 rounded-full w-fit">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'my' ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400' : 'text-gray-600 hover:bg-white/20 dark:text-gray-300'}`}
                        >
                            {t('visitors.my_visitors', 'My Visitors')}
                        </button>
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400' : 'text-gray-600 hover:bg-white/20 dark:text-gray-300'}`}
                                >
                                    {t('visitors.all_visitors', 'All Visitors')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('providers')}
                                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'providers' ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400' : 'text-gray-600 hover:bg-white/20 dark:text-gray-300'}`}
                                >
                                    {t('visitors.providers', 'Providers')}
                                </button>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={() => setModalOpen(true)}
                        className="glass-button bg-blue-600 text-white flex items-center gap-2"
                    >
                        <span>+</span> {t('visitors.register_btn', 'Register Visitor')}
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visits.map(visit => (
                        <div key={visit.id} className="glass-card p-6 group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(visit.status)} uppercase tracking-wider`}>
                                        {t(`visitors.statuses.${visit.status}`, visit.status)}
                                    </span>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mt-2">{visit.visitor_name}</h3>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize flex items-center gap-1">
                                        {visit.type === 'provider' ? '🚚' : '👤'} {t(`visitors.types.${visit.type}`, visit.type)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {new Date(visit.visit_date).getDate()}
                                    </p>
                                    <p className="text-xs text-gray-500 uppercase">
                                        {new Date(visit.visit_date).toLocaleDateString(undefined, { month: 'short' })}
                                        {visit.visit_time && ` - ${visit.visit_time}`}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                                {visit.units && (
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                        <span>{visit.units.name} {visit.units.blocks?.name ? `(${visit.units.blocks.name})` : ''}</span>
                                    </div>
                                )}
                                {visit.notes && (
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-gray-400 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        <span className="italic">{visit.notes}</span>
                                    </div>
                                )}
                            </div>

                            <button className="w-full py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition font-medium text-sm flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                                {t('visitors.share_code', 'Share Access Code')}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Modal */}
                {modalOpen && (
                    <ModalPortal>
                         <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setModalOpen(false)}></div>
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                                <div className="inline-block align-bottom glass-card p-0 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full overflow-hidden">
                                    <div className="px-6 py-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {t('visitors.form.title', 'Register Visit')}
                                        </h3>
                                        <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-500 text-2xl">&times;</button>
                                    </div>
                                    
                                    <div className="px-6 py-6 bg-white/50 dark:bg-black/40 backdrop-blur-md">
                                        <form onSubmit={handleCreateVisit} className="space-y-4">
                                            {/* Type Selection */}
                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('visitors.type', 'Type')}</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['guest', 'family', 'delivery', 'moving'].map(type => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setNewVisit({...newVisit, type})}
                                                            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${newVisit.type === type ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                                        >
                                                            {t(`visitors.types.${type}`, type)}
                                                        </button>
                                                    ))}
                                                    {isAdmin && ['provider', 'service'].map(type => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setNewVisit({...newVisit, type})}
                                                            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${newVisit.type === type ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                                        >
                                                            {t(`visitors.types.${type}`, type)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Generic Info */}
                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('visitors.visitor_name', 'Visitor Name')}</label>
                                                <input 
                                                    type="text" 
                                                    className="glass-input w-full" 
                                                    value={newVisit.visitor_name}
                                                    onChange={e => setNewVisit({...newVisit, visitor_name: e.target.value})}
                                                    required 
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('visitors.date', 'Date')}</label>
                                                    <input 
                                                        type="date" 
                                                        className="glass-input w-full"
                                                        value={newVisit.visit_date}
                                                        onChange={e => setNewVisit({...newVisit, visit_date: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('visitors.time', 'Time')}</label>
                                                    <input 
                                                        type="time" 
                                                        className="glass-input w-full"
                                                        value={newVisit.visit_time}
                                                        onChange={e => setNewVisit({...newVisit, visit_time: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Unit Selection (Admin or Resident with units) */}
                                            {(isAdmin || availableUnits.length > 0) && !['provider', 'service'].includes(newVisit.type) && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('visitors.unit', 'Unit')}</label>
                                                    <GlassSelect 
                                                        value={newVisit.unit_id}
                                                        onChange={e => setNewVisit({...newVisit, unit_id: e.target.value})}
                                                        options={[
                                                            { value: '', label: t('common.select', 'Select Unit') },
                                                            ...availableUnits.map(u => ({ value: u.id, label: u.name }))
                                                        ]}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Leave empty if general visit.</p>
                                                </div>
                                            )}

                                            <div>
                                                 <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('visitors.notes', 'Notes')}</label>
                                                 <textarea 
                                                    className="glass-input w-full h-20 resize-none"
                                                    value={newVisit.notes}
                                                    onChange={e => setNewVisit({...newVisit, notes: e.target.value})}
                                                    placeholder="Vehicle plate, purpose of visit..."
                                                ></textarea>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-white/20 dark:border-white/10">
                                                <button type="button" onClick={() => setModalOpen(false)} className="glass-button-secondary">
                                                    {t('common.cancel', 'Cancel')}
                                                </button>
                                                <button type="submit" className="glass-button w-full sm:w-auto">
                                                    {t('visitors.form.create', 'Register')}
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

export default Visitors;
