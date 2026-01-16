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
    const [users, setUsers] = useState([]); // Added users state
    const [amenities, setAmenities] = useState([]);
    const [reservations, setReservations] = useState([]);

    const { user, hasAnyRole } = useAuth();
    const isAdmin = hasAnyRole(['admin', 'president']);
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
    }, [isAdmin]); // Re-fetch if admin status changes (though usually static)

    const fetchData = async () => {
        try {
            setLoading(true);
            const promises = [
                fetch(`${API_URL}/api/amenities`),
                fetch(`${API_URL}/api/amenities/reservations`)
            ];
            
            if (isAdmin) {
                promises.push(fetch(`${API_URL}/api/properties/users`));
            }

            const results = await Promise.all(promises);
            
            const amenitiesData = await results[0].json();
            const reservationsData = await results[1].json();
            const usersData = isAdmin ? await results[2].json() : [];

            setAmenities(Array.isArray(amenitiesData) ? amenitiesData : []);
            setReservations(Array.isArray(reservationsData) ? reservationsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
            console.error(error);
            setToast({ message: 'Error fetching data', type: 'error' });
        } finally {
            setLoading(false);
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

    // Filter Logic
    // Pending (Admin View)
    const pendingReservations = reservations.filter(r => r.status === 'pending');
    // Approved/Upcoming
    const upcomingReservations = reservations.filter(r => r.status === 'approved' && new Date(r.date) >= new Date().setHours(0,0,0,0));

    if (loading) {
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
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('reservations.title', 'Reservations')}</h1>
                    <button 
                        onClick={() => setBookingModal({ isOpen: true })}
                        className="glass-button bg-blue-600 text-white"
                    >
                        {t('reservations.new_booking', '+ New Reservation')}
                    </button>
                </div>

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
                                                {r.date} <br/> 
                                                <span className="text-xs text-gray-500">{r.start_time.slice(0,5)} - {r.end_time.slice(0,5)}</span>
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
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(r.id, 'rejected')}
                                                            disabled={!!processingId}
                                                            className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm hover:bg-red-200"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {user?.id === r.user_id && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                                        disabled={!!processingId}
                                                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-200"
                                                    >
                                                        Cancel
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
                    <h2 className="font-bold mb-4 dark:text-white">{t('reservations.upcoming', 'Upcoming Reservations')}</h2>
                    {upcomingReservations.length === 0 ? (
                        <p className="text-gray-500">No upcoming reservations.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingReservations.map(r => (
                                <div key={r.id} className="bg-white/50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-blue-600 dark:text-blue-400">{r.amenities?.name}</span>
                                        <div className="flex gap-2">
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full capitalize">{r.status}</span>
                                            {r.user_id === user?.id && (
                                                <button 
                                                onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                                disabled={!!processingId}
                                                className="text-xs text-red-500 hover:text-red-700 bg-white dark:bg-neutral-800 border border-red-200 px-2 rounded"
                                                title="Cancel Reservation"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
                                        {new Date(r.date).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        {r.start_time.slice(0,5)} - {r.end_time.slice(0,5)}
                                    </div>
                                    <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                                        Reserved by: {r.profiles?.full_name} ({r.units?.unit_number})
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Booking Modal */}
            {bookingModal.isOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setBookingModal({ isOpen: false })}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                            <div className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <form onSubmit={handleCreateBooking} className="bg-white dark:bg-neutral-800 px-4 pt-5 pb-4 sm:p-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('reservations.request_booking', 'Request Reservation')}</h3>
                                    
                                    <div className="space-y-4">
                                        {/* Admin: Select User */}
                                        {isAdmin && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reserve for Resident (Optional)</label>
                                                <select 
                                                    className="glass-input w-full"
                                                    value={newBooking.targetUserId || ''}
                                                    onChange={e => setNewBooking({...newBooking, targetUserId: e.target.value})}
                                                >
                                                    <option value="">Myself ({user?.email})</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.full_name} ({u.email})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">If selected, limits will apply to this user.</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amenity</label>
                                            <select 
                                                className="glass-input w-full"
                                                value={newBooking.amenityId}
                                                onChange={e => setNewBooking({...newBooking, amenityId: e.target.value, startTime: '', endTime: ''})}
                                                required
                                            >
                                                <option value="">Select Amenity...</option>
                                                {amenities.filter(a => a.is_reservable).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                            <div className="custom-datepicker-wrapper">
                                                <DatePicker 
                                                    selected={newBooking.date ? new Date(newBooking.date + 'T12:00:00') : null} 
                                                    onChange={(date) => {
                                                        if (!date) {
                                                            setNewBooking({...newBooking, date: '', startTime: '', endTime: ''});
                                                            return;
                                                        }
                                                        // Format manually to YYYY-MM-DD to avoid timezone shifts
                                                        const year = date.getFullYear();
                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                        const day = String(date.getDate()).padStart(2, '0');
                                                        const dateStr = `${year}-${month}-${day}`;
                                                        
                                                        // Check Amenity Type
                                                        const amenity = amenities.find(a => a.id === newBooking.amenityId);
                                                        const type = amenity?.reservation_limits?.type || 'hour';
                                                        
                                                        if (type === 'day') {
                                                            const s = amenity?.reservation_limits?.schedule_start || '06:00';
                                                            const e = amenity?.reservation_limits?.schedule_end || '23:00';
                                                            setNewBooking({...newBooking, date: dateStr, startTime: s, endTime: e});
                                                        } else {
                                                            setNewBooking({...newBooking, date: dateStr, startTime: '', endTime: ''});
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
                                                    placeholderText="Select Date"
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
                                            
                                            // If daily, no slots shown, just confirmation
                                            if (type === 'day') {
                                                const isBooked = reservations.some(r => 
                                                    r.amenity_id === newBooking.amenityId && 
                                                    r.date === newBooking.date && 
                                                    ['approved', 'pending'].includes(r.status)
                                                );
                                                
                                                if (isBooked) {
                                                     return (
                                                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm text-center">
                                                            This date is already booked.
                                                        </div>
                                                     );
                                                }

                                                return (
                                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm text-center font-medium">
                                                        Full Day Reservation ({amenity?.reservation_limits?.schedule_start || '06:00'} - {amenity?.reservation_limits?.schedule_end || '23:00'})
                                                    </div>
                                                );
                                            }

                                            // EXISTING HOURLY LOGIC
                                            return (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Time Slots</label>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                                    {(() => {
                                                        const limits = amenity?.reservation_limits || {};
                                                        
                                                        // Check if closed first
                                                        if (limits.allowed_days) {
                                                                const [y, m, d] = newBooking.date.split('-').map(Number);
                                                                const day = new Date(y, m - 1, d).getDay();
                                                                if (!limits.allowed_days.includes(day)) return <p className="col-span-full text-gray-500 text-center text-sm">Closed</p>;
                                                        }
                                                        if (limits.exception_days?.includes(newBooking.date)) {
                                                            return <p className="col-span-full text-red-500 text-center text-sm font-medium">Closed for Holiday/Maintenance</p>;
                                                        }

                                                        const startHour = parseInt((limits.schedule_start || '06:00').split(':')[0]);
                                                        const endHourRaw = parseInt((limits.schedule_end || '23:00').split(':')[0]);
                                                        // Handle overnight (e.g. Start 13:00, End 01:00) -> Loop until 25 (01:00 next day)
                                                        const endHour = endHourRaw <= startHour ? endHourRaw + 24 : endHourRaw;
                                                        
                                                        const slots = [];

                                                        // Get existing bookings for this day/amenity
                                                        const dayReservations = reservations.filter(r => 
                                                            r.amenity_id === newBooking.amenityId && 
                                                            r.date === newBooking.date && 
                                                            ['approved', 'pending'].includes(r.status)
                                                        );

                                                        for (let h = startHour; h < endHour; h++) {
                                                            const currentH = h % 24;
                                                            const nextH = (h + 1) % 24;

                                                            const timeStr = `${currentH.toString().padStart(2, '0')}:00`;
                                                            const nextTimeStr = `${nextH.toString().padStart(2, '0')}:00`;
                                                            
                                                            // Check overlap
                                                            // Simple overlap: if a reservation starts at this hour or covers it.
                                                            // Res: 10:00 - 12:00. Slots 10:00 (blocked), 11:00 (blocked).
                                                            const isBooked = dayReservations.some(r => {
                                                                return (r.start_time <= timeStr && r.end_time > timeStr); // Strict inequality for end time?
                                                                // r.start < slotEnd && r.end > slotStart
                                                                // slot: timeStr to nextTimeStr
                                                            });
                                                            
                                                            // Check past time if today
                                                            const isPast = new Date().toISOString().split('T')[0] === newBooking.date && 
                                                                            h <= new Date().getHours();

                                                            slots.push({ time: timeStr, end: nextTimeStr, disabled: isBooked || isPast, reason: isBooked ? 'Booked' : 'Past' });
                                                        }

                                                        if (slots.length === 0) return <p className="col-span-full text-gray-500 text-center text-sm">No slots available</p>;

                                                        return slots.map(slot => (
                                                            <button
                                                                key={slot.time}
                                                                type="button"
                                                                disabled={slot.disabled}
                                                                onClick={() => setNewBooking({...newBooking, startTime: slot.time, endTime: slot.end})}
                                                                className={`
                                                                    py-2 px-1 rounded-lg text-sm font-medium transition-all
                                                                    ${newBooking.startTime === slot.time 
                                                                        ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                                                                        : slot.disabled 
                                                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
                                                                            : 'bg-white/50 dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 border border-transparent hover:border-blue-200'}
                                                                `}
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
                                                className="glass-input w-full"
                                                value={newBooking.notes}
                                                onChange={e => setNewBooking({...newBooking, notes: e.target.value})}
                                                rows="2"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                        <button 
                                            type="submit" 
                                            className="w-full glass-button justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium sm:col-start-2 sm:text-sm"
                                        >
                                            Request
                                        </button>
                                        <button 
                                            type="button" 
                                            className="mt-3 w-full glass-button-secondary justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:col-start-1 sm:text-sm"
                                            onClick={() => setBookingModal({ isOpen: false })}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </DashboardLayout>
    );
};

export default Reservations;
