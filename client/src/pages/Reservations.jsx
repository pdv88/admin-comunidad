import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import GlassLoader from '../components/GlassLoader';
import Toast from '../components/Toast';
import ModalPortal from '../components/ModalPortal';

const Reservations = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [activeReservations, setActiveReservations] = useState([]);
    const [historyReservations, setHistoryReservations] = useState([]);
    const [selectedDateReservations, setSelectedDateReservations] = useState([]);

    const { user, hasAnyRole, hasRole } = useAuth();
    const isAdmin = hasAnyRole(['admin', 'president', 'secretary']);
    const isVocal = hasRole('vocal');

    const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'block', 'community'

    // Pagination & Filters State
    const [activePage, setActivePage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [activeTotalCount, setActiveTotalCount] = useState(0);
    const [historyTotalCount, setHistoryTotalCount] = useState(0);
    const [filters, setFilters] = useState({
        status: '',
        amenityId: '',
        startDate: '',
        endDate: '',
        search: ''
    });

    const [toast, setToast] = useState({ message: '', type: 'success' });

    // Booking Modal
    const [bookingModal, setBookingModal] = useState({ isOpen: false });
    const [newBooking, setNewBooking] = useState({
        amenityId: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: '',
        targetUserId: ''
    });

    // Admin Action State
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchData();
        // Fetch current user details for ID comparison
        // User is now coming from AuthContext
    }, [isAdmin, activeTab, activePage, historyPage, filters]); // Re-fetch on all changes

    // Fetch reservations for the selected date in the booking modal to check for overlaps accurately
    useEffect(() => {
        if (newBooking.amenityId && newBooking.date) {
            fetchSelectedDateReservations();
        } else {
            setSelectedDateReservations([]);
        }
    }, [newBooking.amenityId, newBooking.date]);

    const fetchSelectedDateReservations = async () => {
        try {
            const params = new URLSearchParams({
                amenityId: newBooking.amenityId,
                startDate: newBooking.date,
                endDate: newBooking.date,
                limit: 100 // Assume no more than 100 in a day for an amenity
            });
            const res = await fetch(`${API_URL}/api/amenities/reservations?${params.toString()}`);
            const data = await res.json();
            setSelectedDateReservations(data.data || []);
        } catch (error) {
            console.error("Error fetching date reservations:", error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const backendType = activeTab === 'personal' ? 'my' : activeTab;

            const commonParams = {
                type: backendType,
                limit: itemsPerPage,
                ...filters
            };

            // Clean empty filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete commonParams[key];
            });

            const activeParams = new URLSearchParams({ ...commonParams, page: activePage, time_range: 'upcoming' });
            const historyParams = new URLSearchParams({ ...commonParams, page: historyPage, time_range: 'past' });

            const promises = [
                fetch(`${API_URL}/api/amenities`),
                fetch(`${API_URL}/api/amenities/reservations?${activeParams.toString()}`),
                fetch(`${API_URL}/api/amenities/reservations?${historyParams.toString()}`)
            ];

            if (isAdmin) {
                promises.push(fetch(`${API_URL}/api/properties/users`));
            }

            const results = await Promise.all(promises);

            const amenitiesData = await results[0].json();
            const activeRes = await results[1].json();
            const historyRes = await results[2].json();
            const usersData = isAdmin ? await results[3].json() : [];

            setAmenities(Array.isArray(amenitiesData) ? amenitiesData : []);
            setActiveReservations(activeRes.data || []);
            setActiveTotalCount(activeRes.count || 0);
            setHistoryReservations(historyRes.data || []);
            setHistoryTotalCount(historyRes.count || 0);
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
            console.error(error);
            setToast({ message: 'Error fetching data', type: 'error' });
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    const handleCreateBooking = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/amenities/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amenity_id: newBooking.amenityId,
                    date: newBooking.date,
                    start_time: newBooking.startTime,
                    end_time: newBooking.endTime,
                    notes: newBooking.notes,
                    target_user_id: newBooking.targetUserId // Added
                })
            });

            if (res.ok) {
                setBookingModal({ isOpen: false });
                setNewBooking({ amenityId: '', date: '', startTime: '', endTime: '', notes: '', targetUserId: '' });
                fetchData();
                setToast({ message: 'Reservation created successfully', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Error creating reservation', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error creating reservation', type: 'error' });
        }
    };

    const handleUpdateStatus = async (id, status, adminNotes = '') => {
        setProcessingId(id);
        try {
            const res = await fetch(`${API_URL}/api/amenities/reservations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, admin_notes: adminNotes })
            });

            if (res.ok) {
                fetchData();
                setToast({ message: `Reservation ${status}`, type: 'success' });
            } else {
                setToast({ message: 'Error updating reservation', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error updating reservation', type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setActivePage(1);
        setHistoryPage(1);
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            amenityId: '',
            startDate: '',
            endDate: '',
            search: ''
        });
        setActivePage(1);
        setHistoryPage(1);
    };

    const hasActiveFilters = Object.values(filters).some(val => val !== '');

    // Filter Logic for Local Display (only if no server filters active)
    // If filters are active, we show a unified list?
    // User wants separate pagination, so we keep them separate.
    const pendingReservations = activeReservations.filter(r => r.status === 'pending');
    const upcomingReservations = activeReservations.filter(r => r.status === 'approved');
    const pastReservationsList = historyReservations;

    if (initialLoading) {
        return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: '' })}
            />
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('reservations.title', 'Reservations')}</h1>
                    <button
                        onClick={() => setBookingModal({ isOpen: true })}
                        className="glass-button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        {t('reservations.new_booking', 'New Reservation')}
                    </button>
                </div>

                {/* Tab Switcher & Filter Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                    {(isAdmin || isVocal) && (
                        <div className="flex p-1 rounded-full items-center backdrop-blur-md bg-white/30 border border-white/40 shadow-sm dark:bg-neutral-800/40 dark:border-white/10 w-fit">
                            <button
                                onClick={() => { setActiveTab('personal'); setActivePage(1); setHistoryPage(1); }}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'personal'
                                    ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'
                                    }`}
                            >
                                {t('reservations.tab_personal', 'My Reservations')}
                            </button>
                            {isVocal && (
                                <button
                                    onClick={() => { setActiveTab('block'); setActivePage(1); setHistoryPage(1); }}
                                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'block'
                                        ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                        : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {t('reservations.tab_block', 'Block')}
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => { setActiveTab('community'); setActivePage(1); setHistoryPage(1); }}
                                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'community'
                                        ? 'bg-white text-blue-600 shadow-md dark:bg-neutral-700 dark:text-blue-400'
                                        : 'text-gray-600 hover:bg-white/20 dark:text-gray-300 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {t('reservations.tab_community', 'Community')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Filter Bar */}
                <div className="glass-card p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('user_management.search_placeholder', 'Search...')}
                                className="glass-input pl-10"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <select
                            className="glass-input"
                            value={filters.amenityId}
                            onChange={(e) => handleFilterChange('amenityId', e.target.value)}
                        >
                            <option value="">{t('reservations.all_amenities', 'All Amenities')}</option>
                            {amenities.filter(a => a.is_reservable).map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>

                        <select
                            className="glass-input"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">{t('reservations.all_statuses', 'All Statuses')}</option>
                            <option value="pending">{t('reservations.statuses.pending')}</option>
                            <option value="approved">{t('reservations.statuses.approved')}</option>
                            <option value="rejected">{t('reservations.statuses.rejected')}</option>
                            <option value="cancelled">{t('reservations.statuses.cancelled')}</option>
                        </select>

                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="glass-input text-xs"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                            <input
                                type="date"
                                className="glass-input text-xs"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={clearFilters}
                                className="glass-button-secondary w-full"
                            >
                                {t('common.clear', 'Clear')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Sections */}
                {loading ? (
                    <div className="glass-card">
                        <GlassLoader />
                    </div>
                ) : (
                    <>
                        {loading && activeReservations.length === 0 && historyReservations.length === 0 ? (
                            <div className="glass-card">
                                <GlassLoader />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Pending Approvals */}
                                {pendingReservations.length > 0 && (
                                    <div className="glass-card p-6">
                                        <h2 className="font-bold mb-4 text-orange-600 dark:text-orange-400">{t('reservations.pending_approvals', 'Pending Approvals')}</h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                                        <th className="pb-3 px-2">Amenity</th>
                                                        <th className="pb-3 px-2">Date/Time</th>
                                                        <th className="pb-3 px-2">Resident</th>
                                                        <th className="pb-3 px-2">Unit</th>
                                                        <th className="pb-3 px-2">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingReservations.map(r => (
                                                        <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="py-3 px-2 font-medium">{r.amenities?.name}</td>
                                                            <td className="py-3 px-2">
                                                                {r.date} <br />
                                                                <span className="text-xs text-gray-500">{r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}</span>
                                                            </td>
                                                            <td className="py-3 px-2">{r.profiles?.full_name}</td>
                                                            <td className="py-3 px-2">{r.units?.unit_number} ({r.units?.blocks?.name})</td>
                                                            <td className="py-3 px-2 flex space-x-2">
                                                                {isAdmin && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleUpdateStatus(r.id, 'approved')}
                                                                            disabled={!!processingId}
                                                                            className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm hover:bg-green-200"
                                                                        >
                                                                            {t('common.approve', 'Approve')}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUpdateStatus(r.id, 'rejected')}
                                                                            disabled={!!processingId}
                                                                            className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm hover:bg-red-200"
                                                                        >
                                                                            {t('common.reject', 'Reject')}
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {user?.id === r.user_id && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                                                        disabled={!!processingId}
                                                                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-200"
                                                                    >
                                                                        {t('common.cancel', 'Cancel')}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Upcoming Schedule */}
                                <div className="glass-card p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="font-bold dark:text-white">{t('reservations.upcoming', 'Upcoming Reservations')}</h2>
                                    </div>
                                    {upcomingReservations.length === 0 ? (
                                        <p className="text-gray-500">{t('reservations.no_upcoming', 'No upcoming reservations.')}</p>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                                            <th className="pb-3 px-2">{t('reservations.amenity', 'Amenity')}</th>
                                                            <th className="pb-3 px-2">{t('reservations.date_time', 'Date/Time')}</th>
                                                            <th className="pb-3 px-2">{t('reservations.resident', 'Resident')}</th>
                                                            <th className="pb-3 px-2">{t('reservations.status', 'Status')}</th>
                                                            <th className="pb-3 px-2">{t('common.actions', 'Actions')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {upcomingReservations.map(r => (
                                                            <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="py-3 px-2 font-medium text-blue-600 dark:text-blue-400">{r.amenities?.name}</td>
                                                                <td className="py-3 px-2">
                                                                    {new Date(r.date + 'T12:00:00').toLocaleDateString()} <br />
                                                                    <span className="text-xs text-gray-500">{r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}</span>
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    {r.profiles?.full_name} <br />
                                                                    <span className="text-xs text-gray-500">
                                                                        {r.units?.blocks?.name ? `${r.units.blocks.name} - ` : ''}{r.units?.unit_number}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full capitalize">{t(`reservations.statuses.${r.status}`, r.status)}</span>
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    {r.user_id === user?.id && (
                                                                        <button
                                                                            onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                                                            disabled={!!processingId}
                                                                            className="text-xs text-red-500 hover:text-red-700 bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-900/30 px-2 py-1 rounded transition-colors"
                                                                        >
                                                                            {t('common.cancel', 'Cancel')}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Active Pagination */}
                                            {activeTotalCount > itemsPerPage && (
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                    <span className="text-xs text-gray-500">
                                                        {t('common.showing', 'Showing')} {((activePage - 1) * itemsPerPage) + 1} - {Math.min(activePage * itemsPerPage, activeTotalCount)} {t('common.of', 'of')} {activeTotalCount}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setActivePage(prev => Math.max(prev - 1, 1))}
                                                            disabled={activePage === 1}
                                                            className="px-2 py-1 text-xs border rounded disabled:opacity-50 dark:border-neutral-700"
                                                        >
                                                            {t('common.previous', 'Previous')}
                                                        </button>
                                                        <button
                                                            onClick={() => setActivePage(prev => Math.min(prev + 1, Math.ceil(activeTotalCount / itemsPerPage)))}
                                                            disabled={activePage >= Math.ceil(activeTotalCount / itemsPerPage)}
                                                            className="px-2 py-1 text-xs border rounded disabled:opacity-50 dark:border-neutral-700"
                                                        >
                                                            {t('common.next', 'Next')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Past Reservations (History) */}
                                <div className="glass-card p-6 animate-fadeIn">
                                    <h2 className="font-bold mb-4 text-gray-600 dark:text-gray-400">{t('reservations.past', 'Past Reservations & History')}</h2>
                                    {pastReservationsList.length === 0 ? (
                                        <p className="text-gray-500">{t('reservations.no_past', 'No past reservations.')}</p>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                                            <th className="pb-3 px-2">{t('reservations.amenity', 'Amenity')}</th>
                                                            <th className="pb-3 px-2">{t('reservations.date_time', 'Date/Time')}</th>
                                                            <th className="pb-3 px-2">{t('reservations.resident', 'Resident')}</th>
                                                            <th className="pb-3 px-2">{t('reservations.status', 'Status')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pastReservationsList.map(r => (
                                                            <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="py-3 px-2 font-medium">{r.amenities?.name}</td>
                                                                <td className="py-3 px-2">
                                                                    {r.date} <br />
                                                                    <span className="text-xs text-gray-500">{r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}</span>
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    {r.profiles?.full_name} <br />
                                                                    <span className="text-xs text-gray-500">
                                                                        {r.units?.blocks?.name ? `${r.units.blocks.name} - ` : ''}{r.units?.unit_number}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${(r.status === 'completed' || r.status === 'approved') ? 'bg-green-100 text-green-800' :
                                                                        r.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                                                            'bg-red-100 text-red-800'
                                                                        }`}>{t(`reservations.statuses.${r.status}`, r.status)}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* History Pagination */}
                                            {historyTotalCount > itemsPerPage && (
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                    <span className="text-xs text-gray-500">
                                                        {t('common.showing', 'Showing')} {((historyPage - 1) * itemsPerPage) + 1} - {Math.min(historyPage * itemsPerPage, historyTotalCount)} {t('common.of', 'of')} {historyTotalCount}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                                                            disabled={historyPage === 1}
                                                            className="px-2 py-1 text-xs border rounded disabled:opacity-50 dark:border-neutral-700"
                                                        >
                                                            {t('common.previous', 'Previous')}
                                                        </button>
                                                        <button
                                                            onClick={() => setHistoryPage(prev => Math.min(prev + 1, Math.ceil(historyTotalCount / itemsPerPage)))}
                                                            disabled={historyPage >= Math.ceil(historyTotalCount / itemsPerPage)}
                                                            className="px-2 py-1 text-xs border rounded disabled:opacity-50 dark:border-neutral-700"
                                                        >
                                                            {t('common.next', 'Next')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Booking Modal */}
            {
                bookingModal.isOpen && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setBookingModal({ isOpen: false })}></div>
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                                <div className="inline-block align-bottom glass-card p-0 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full overflow-hidden">
                                    <form onSubmit={handleCreateBooking} className="px-4 pt-5 pb-4 sm:p-6 bg-white/50 dark:bg-black/40 backdrop-blur-md">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('reservations.request_booking', 'Request Reservation')}</h3>

                                        <div className="space-y-4">
                                            {/* Admin: Select User */}
                                            {isAdmin && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reservations.reserve_for_resident', 'Reserve for Resident (Optional)')}</label>
                                                    <select
                                                        className="glass-input w-full"
                                                        value={newBooking.targetUserId || ''}
                                                        onChange={e => setNewBooking({ ...newBooking, targetUserId: e.target.value })}
                                                    >
                                                        <option value="">{t('reservations.myself', 'Myself')} ({user?.email})</option>
                                                        {users.map(u => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.full_name} ({u.email})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-gray-500 mt-1">{t('reservations.admin_note', 'If selected, limits will apply to this user.')}</p>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reservations.amenity', 'Amenity')}</label>
                                                <select
                                                    className="glass-input w-full"
                                                    value={newBooking.amenityId}
                                                    onChange={e => setNewBooking({ ...newBooking, amenityId: e.target.value, startTime: '', endTime: '' })}
                                                    required
                                                >
                                                    <option value="">{t('reservations.select_amenity', 'Select Amenity...')}</option>
                                                    {amenities.filter(a => a.is_reservable).map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reservations.date', 'Date')}</label>
                                                <div className="custom-datepicker-wrapper">
                                                    <DatePicker
                                                        selected={newBooking.date ? new Date(newBooking.date + 'T12:00:00') : null}
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setNewBooking({ ...newBooking, date: '', startTime: '', endTime: '' });
                                                                return;
                                                            }
                                                            const year = date.getFullYear();
                                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                                            const day = String(date.getDate()).padStart(2, '0');
                                                            const dateStr = `${year}-${month}-${day}`;

                                                            const amenity = amenities.find(a => a.id === newBooking.amenityId);
                                                            const type = amenity?.reservation_limits?.type || 'hour';

                                                            if (type === 'day') {
                                                                const s = amenity?.reservation_limits?.schedule_start || '06:00';
                                                                const e = amenity?.reservation_limits?.schedule_end || '23:00';
                                                                setNewBooking({ ...newBooking, date: dateStr, startTime: s, endTime: e });
                                                            } else {
                                                                setNewBooking({ ...newBooking, date: dateStr, startTime: '', endTime: '' });
                                                            }
                                                        }}
                                                        minDate={new Date()}
                                                        filterDate={(date) => {
                                                            if (!newBooking.amenityId) return true;
                                                            const amenity = amenities.find(a => a.id === newBooking.amenityId);
                                                            const allowed = amenity?.reservation_limits?.allowed_days;
                                                            if (allowed && Array.isArray(allowed)) {
                                                                return allowed.includes(date.getDay());
                                                            }
                                                            return true;
                                                        }}
                                                        excludeDates={(() => {
                                                            if (!newBooking.amenityId) return [];
                                                            const amenity = amenities.find(a => a.id === newBooking.amenityId);
                                                            const exceptions = amenity?.reservation_limits?.exception_days || [];
                                                            return exceptions.map(d => {
                                                                const [y, m, day] = d.split('-').map(Number);
                                                                return new Date(y, m - 1, day);
                                                            });
                                                        })()}
                                                        placeholderText={t('reservations.select_date', 'Select Date')}
                                                        className="glass-input w-full"
                                                        dateFormat="yyyy-MM-dd"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Time Slots Grid */}
                                            {newBooking.amenityId && newBooking.date && (() => {
                                                const amenity = amenities.find(a => a.id === newBooking.amenityId);
                                                const type = amenity?.reservation_limits?.type || 'hour';

                                                if (type === 'day') {
                                                    const isBooked = selectedDateReservations.some(r =>
                                                        r.amenity_id === newBooking.amenityId &&
                                                        r.date === newBooking.date &&
                                                        ['approved', 'pending'].includes(r.status)
                                                    );

                                                    if (isBooked) {
                                                        return (
                                                            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm text-center">
                                                                {t('reservations.already_booked', 'This date is already booked.')}
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm text-center font-medium">
                                                            {t('reservations.full_day', 'Full Day Reservation')} ({amenity?.reservation_limits?.schedule_start || '06:00'} - {amenity?.reservation_limits?.schedule_end || '23:00'})
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('reservations.available_slots', 'Available Time Slots')}</label>
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                                            {(() => {
                                                                const limits = amenity?.reservation_limits || {};

                                                                if (limits.allowed_days) {
                                                                    const [y, m, d] = newBooking.date.split('-').map(Number);
                                                                    const day = new Date(y, m - 1, d).getDay();
                                                                    if (!limits.allowed_days.includes(day)) return <p className="col-span-full text-gray-500 text-center text-sm">{t('reservations.closed', 'Closed')}</p>;
                                                                }
                                                                if (limits.exception_days?.includes(newBooking.date)) {
                                                                    return <p className="col-span-full text-red-500 text-center text-sm font-medium">{t('reservations.holiday_closed', 'Closed for Holiday/Maintenance')}</p>;
                                                                }

                                                                const startHour = parseInt((limits.schedule_start || '06:00').split(':')[0]);
                                                                const endHourRaw = parseInt((limits.schedule_end || '23:00').split(':')[0]);
                                                                const endHour = endHourRaw <= startHour ? endHourRaw + 24 : endHourRaw;

                                                                const slots = [];
                                                                const dayReservations = selectedDateReservations.filter(r =>
                                                                    r.amenity_id === newBooking.amenityId &&
                                                                    r.date === newBooking.date &&
                                                                    ['approved', 'pending'].includes(r.status)
                                                                );

                                                                for (let h = startHour; h < endHour; h++) {
                                                                    const currentH = h % 24;
                                                                    const nextH = (h + 1) % 24;
                                                                    const timeStr = `${currentH.toString().padStart(2, '0')}:00`;
                                                                    const nextTimeStr = `${nextH.toString().padStart(2, '0')}:00`;

                                                                    const isBooked = dayReservations.some(r => {
                                                                        return (r.start_time <= timeStr && r.end_time > timeStr);
                                                                    });

                                                                    const isPast = new Date().toISOString().split('T')[0] === newBooking.date &&
                                                                        h <= new Date().getHours();

                                                                    slots.push({ time: timeStr, end: nextTimeStr, disabled: isBooked || isPast });
                                                                }

                                                                if (slots.length === 0) return <p className="col-span-full text-gray-500 text-center text-sm">{t('reservations.no_slots', 'No slots available')}</p>;

                                                                return slots.map(slot => (
                                                                    <button
                                                                        key={slot.time}
                                                                        type="button"
                                                                        disabled={slot.disabled}
                                                                        onClick={() => setNewBooking({ ...newBooking, startTime: slot.time, endTime: slot.end })}
                                                                        className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${newBooking.startTime === slot.time ? 'bg-blue-600 text-white shadow-md transform scale-105' : slot.disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-white/50 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 border border-transparent hover:border-blue-200'}`}
                                                                    >
                                                                        {slot.time}
                                                                    </button>
                                                                ));
                                                            })()}
                                                        </div>
                                                        {/* Selected summary */}
                                                        {newBooking.startTime && (
                                                            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium text-center">
                                                                Selected: {newBooking.startTime} - {newBooking.endTime}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                                                <textarea
                                                    className="glass-input w-full rounded-2xl"
                                                    value={newBooking.notes}
                                                    onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}
                                                    rows="2"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                            <button
                                                type="submit"
                                                className="w-full glass-button justify-center border border-transparent shadow-sm px-4 py-2 text-base font-bold sm:col-start-2 sm:text-sm"
                                            >
                                                {t('reservations.request', 'Request')}
                                            </button>
                                            <button
                                                type="button"
                                                className="mt-3 w-full glass-button-secondary justify-center border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:col-start-1 sm:text-sm"
                                                onClick={() => setBookingModal({ isOpen: false })}
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )
            }
        </DashboardLayout >
    );
};

export default Reservations;
