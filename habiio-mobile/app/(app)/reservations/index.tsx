import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, RefreshControl, ActivityIndicator,
    TouchableOpacity, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/constants/Config';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassSelect } from '@/components/ui/GlassSelect';

interface Amenity {
    id: string;
    name: string;
    is_reservable: boolean;
    reservation_limits?: {
        type?: 'hour' | 'day';
        schedule_start?: string;
        schedule_end?: string;
        allowed_days?: number[];
        exception_days?: string[];
    };
}

interface Reservation {
    id: number;
    amenity_id: string;
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    notes?: string;
    amenities?: { name: string };
    profiles?: { full_name: string };
    units?: { unit_number: string; block_id?: string; blocks?: { id: string; name: string } };
}

export default function ReservationsScreen() {
    const { user, hasRole, logout, activeCommunity } = useAuth();
    const navigation = useNavigation();

    if (!user) return null;

    // State
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Modal State
    const [bookingModal, setBookingModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Booking Form
    const [newBooking, setNewBooking] = useState({
        amenityId: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: '',
        targetUserId: ''
    });

    // Role checks
    const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('president');
    const isVocal = hasRole('vocal');
    const canReserveForOthers = isAdmin || isVocal;
    const canSeeAll = isAdmin;

    // Get blocks that vocal is assigned to
    const vocalBlocks = activeCommunity?.roles
        ?.filter((r: any) => r.name === 'vocal' && r.block_id)
        .map((r: any) => r.block_id) || [];

    // Filter users based on role - only users with units can have reservations
    const getFilteredUsers = () => {
        // Only include users that have a unit assigned
        const usersWithUnits = users.filter((u: any) => u.unit_id);

        if (isAdmin) {
            // Admins can reserve for anyone with a unit
            return usersWithUnits;
        }
        if (isVocal && vocalBlocks.length > 0) {
            // Vocals can only reserve for users in their assigned blocks who have units
            return usersWithUnits.filter((u: any) => vocalBlocks.includes(u.block_id));
        }
        // Regular residents - no user selection (only themselves)
        return [];
    };

    const filteredUsers = getFilteredUsers();

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            setSessionExpired(false);
            const [amenitiesRes, reservationsRes] = await Promise.all([
                axios.get(`${API_URL}/api/amenities`),
                axios.get(`${API_URL}/api/amenities/reservations`)
            ]);

            setAmenities(Array.isArray(amenitiesRes.data) ? amenitiesRes.data : []);
            setReservations(Array.isArray(reservationsRes.data) ? reservationsRes.data : []);

            // Fetch users for admins and vocals
            if (canReserveForOthers) {
                const usersRes = await axios.get(`${API_URL}/api/properties/users`);
                setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error);
            if (error.response?.status === 401) {
                setSessionExpired(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [canReserveForOthers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Tab State
    type Tab = 'my' | 'block' | 'all';
    const [activeTab, setActiveTab] = useState<Tab>('my');

    // Filter Logic based on Active Tab
    const getTabFilteredReservations = (list: Reservation[]) => {
        if (activeTab === 'my') {
            // Show only my reservations
            return list.filter(r => r.user_id === user?.id);
        }
        if (activeTab === 'block' && isVocal) {
            // Show reservations for blocks I manage
            return list.filter(r => r.units?.block_id && vocalBlocks.includes(r.units.block_id));
        }
        if (activeTab === 'all' && canSeeAll) {
            // Show all reservations
            return list;
        }
        return list; // Fallback
    };

    // Apply filters
    const filteredList = getTabFilteredReservations(reservations);

    // Split into categories
    const pendingReservations = filteredList.filter(r => r.status === 'pending');
    const upcomingReservations = filteredList.filter(r =>
        r.status === 'approved' && new Date(r.date + 'T12:00:00') >= new Date(new Date().setHours(0, 0, 0, 0))
    );
    const pastReservations = filteredList.filter(r =>
        (r.status === 'approved' && new Date(r.date + 'T12:00:00') < new Date(new Date().setHours(0, 0, 0, 0))) ||
        ['rejected', 'cancelled'].includes(r.status)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Render Tabs
    const renderTabs = () => (
        <View style={{ marginBottom: 8 }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 }}
            >
                <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'rgba(229,231,235,0.5)', padding: 4, borderRadius: 9999, alignItems: 'center' }}>
                    {/* Everyone sees My Reservations */}
                    <TouchableOpacity
                        onPress={() => setActiveTab('my')}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 6,
                            borderRadius: 9999,
                            backgroundColor: activeTab === 'my' ? 'white' : 'transparent',
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'my' ? '#2563eb' : '#6b7280' }}>My Reservations</Text>
                    </TouchableOpacity>

                    {/* Only Vocals see Block Reservations */}
                    {isVocal && (
                        <TouchableOpacity
                            onPress={() => setActiveTab('block')}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 6,
                                borderRadius: 9999,
                                backgroundColor: activeTab === 'block' ? 'white' : 'transparent',
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'block' ? '#2563eb' : '#6b7280' }}>Block Reservations</Text>
                        </TouchableOpacity>
                    )}

                    {/* Admins see All Reservations */}
                    {canSeeAll && (
                        <TouchableOpacity
                            onPress={() => setActiveTab('all')}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 6,
                                borderRadius: 9999,
                                backgroundColor: activeTab === 'all' ? 'white' : 'transparent',
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'all' ? '#2563eb' : '#6b7280' }}>All Reservations</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );

    // Handle status update
    const handleUpdateStatus = async (id: number, status: string) => {
        setProcessingId(id);
        try {
            await axios.put(`${API_URL}/api/amenities/reservations/${id}`, { status });
            fetchData();
            Alert.alert('Success', `Reservation ${status}`);
        } catch (error: any) {
            if (error.response?.status === 401) {
                setSessionExpired(true);
            } else {
                Alert.alert('Error', 'Failed to update reservation');
            }
        } finally {
            setProcessingId(null);
        }
    };

    // Handle booking creation
    const handleCreateBooking = async () => {
        if (!newBooking.amenityId || !newBooking.date || !newBooking.startTime) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        try {
            await axios.post(`${API_URL}/api/amenities/reservations`, {
                amenity_id: newBooking.amenityId,
                date: newBooking.date,
                start_time: newBooking.startTime,
                end_time: newBooking.endTime,
                notes: newBooking.notes,
                target_user_id: newBooking.targetUserId || undefined
            });
            setBookingModal(false);
            resetBookingForm();
            fetchData();
            Alert.alert('Success', 'Reservation requested successfully');
        } catch (error: any) {
            if (error.response?.status === 401) {
                setSessionExpired(true);
            } else {
                Alert.alert('Error', error.response?.data?.error || 'Failed to create reservation');
            }
        }
    };

    const resetBookingForm = () => {
        setNewBooking({
            amenityId: '',
            date: '',
            startTime: '',
            endTime: '',
            notes: '',
            targetUserId: ''
        });
    };

    // Generate time slots
    const getTimeSlots = () => {
        if (!newBooking.amenityId || !newBooking.date) return [];

        const amenity = amenities.find(a => a.id === newBooking.amenityId);
        if (!amenity) return [];

        const limits = amenity.reservation_limits || {};
        const type = limits.type || 'hour';

        // Full day reservation
        if (type === 'day') {
            const isBooked = reservations.some(r =>
                r.amenity_id === newBooking.amenityId &&
                r.date === newBooking.date &&
                ['approved', 'pending'].includes(r.status)
            );
            return isBooked ? [] : [{
                time: limits.schedule_start || '06:00',
                end: limits.schedule_end || '23:00',
                fullDay: true,
                disabled: false
            }];
        }

        // Hourly slots
        const startHour = parseInt((limits.schedule_start || '06:00').split(':')[0]);
        const endHourRaw = parseInt((limits.schedule_end || '23:00').split(':')[0]);
        const endHour = endHourRaw <= startHour ? endHourRaw + 24 : endHourRaw;

        const dayReservations = reservations.filter(r =>
            r.amenity_id === newBooking.amenityId &&
            r.date === newBooking.date &&
            ['approved', 'pending'].includes(r.status)
        );

        const slots = [];
        const today = new Date().toISOString().split('T')[0];
        const currentHour = new Date().getHours();

        for (let h = startHour; h < endHour; h++) {
            const currentH = h % 24;
            const nextH = (h + 1) % 24;
            const timeStr = `${currentH.toString().padStart(2, '0')}:00`;
            const nextTimeStr = `${nextH.toString().padStart(2, '0')}:00`;

            const isBooked = dayReservations.some(r =>
                r.start_time <= timeStr && r.end_time > timeStr
            );
            const isPast = newBooking.date === today && h <= currentHour;

            slots.push({
                time: timeStr,
                end: nextTimeStr,
                disabled: isBooked || isPast,
                fullDay: false
            });
        }

        return slots;
    };

    // Safe drawer open
    const openDrawer = () => {
        try {
            navigation.dispatch(DrawerActions.openDrawer());
        } catch (e) {
            console.warn('Could not open drawer:', e);
        }
    };

    // Render Header
    const renderHeader = () => (
        <View className="flex-row justify-between items-center px-4 py-4 bg-white shadow-sm z-10">
            <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={openDrawer} activeOpacity={0.7}>
                    <Ionicons name="menu" size={28} color="#111827" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Reservations</Text>
            </View>
            <GlassButton
                title="New"
                icon="add"
                onPress={() => setBookingModal(true)}
                style={{ transform: [{ scale: 0.9 }] }}
            />
        </View>
    );

    // Render Pending Card
    const renderPendingCard = (r: Reservation) => (
        <GlassCard key={r.id} className="mx-4 mb-3 p-4" variant="inner">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="font-bold text-blue-600">{r.amenities?.name}</Text>
                    <Text className="text-sm text-gray-600">{r.date}</Text>
                    <Text className="text-xs text-gray-500">{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</Text>
                </View>
                <View className="bg-orange-100 px-2 py-1 rounded-full">
                    <Text className="text-orange-700 text-xs font-medium">Pending</Text>
                </View>
            </View>
            <Text className="text-sm text-gray-700 mb-2">
                {r.profiles?.full_name} • {r.units?.unit_number}
            </Text>
            <View className="flex-row gap-2 mt-2">
                {isAdmin && (
                    <>
                        <TouchableOpacity
                            onPress={() => handleUpdateStatus(r.id, 'approved')}
                            disabled={!!processingId}
                            className="flex-1 bg-green-100 py-2 rounded-lg items-center"
                            activeOpacity={0.7}
                        >
                            <Text className="text-green-700 font-medium text-sm">Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleUpdateStatus(r.id, 'rejected')}
                            disabled={!!processingId}
                            className="flex-1 bg-red-100 py-2 rounded-lg items-center"
                            activeOpacity={0.7}
                        >
                            <Text className="text-red-700 font-medium text-sm">Reject</Text>
                        </TouchableOpacity>
                    </>
                )}
                {r.user_id === user?.id && (
                    <TouchableOpacity
                        onPress={() => handleUpdateStatus(r.id, 'cancelled')}
                        disabled={!!processingId}
                        className="flex-1 bg-gray-100 py-2 rounded-lg items-center"
                        activeOpacity={0.7}
                    >
                        <Text className="text-gray-700 font-medium text-sm">Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>
        </GlassCard>
    );

    // Render Upcoming Card
    const renderUpcomingCard = (r: Reservation) => (
        <GlassCard key={r.id} className="mx-4 mb-3 p-4" variant="inner">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="font-bold text-blue-600">{r.amenities?.name}</Text>
                <View className="flex-row items-center gap-2">
                    <View className="bg-green-100 px-2 py-1 rounded-full">
                        <Text className="text-green-700 text-xs font-medium">Approved</Text>
                    </View>
                    {r.user_id === user?.id && (
                        <TouchableOpacity
                            onPress={() => handleUpdateStatus(r.id, 'cancelled')}
                            disabled={!!processingId}
                        >
                            <Text className="text-red-500 text-xs">Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <Text className="text-gray-800 font-medium">{new Date(r.date).toLocaleDateString()}</Text>
            <Text className="text-sm text-gray-500">{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</Text>
            <View className="border-t border-gray-100 mt-2 pt-2">
                <Text className="text-xs text-gray-500">
                    Reserved by: {r.profiles?.full_name} ({r.units?.unit_number})
                </Text>
            </View>
        </GlassCard>
    );

    // Render Past Card
    const renderPastCard = (r: Reservation) => (
        <GlassCard key={r.id} className="mx-4 mb-3 p-4 opacity-80" variant="inner">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="font-bold text-gray-500">{r.amenities?.name}</Text>
                <View className={`px-2 py-1 rounded-full ${r.status === 'approved' ? 'bg-green-100' :
                    r.status === 'rejected' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                    <Text className={`text-xs font-medium ${r.status === 'approved' ? 'text-green-700' :
                        r.status === 'rejected' ? 'text-red-700' : 'text-gray-700'
                        }`}>
                        {r.status === 'approved' ? 'Completed' :
                            r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </Text>
                </View>
            </View>
            <Text className="text-gray-500 font-medium">{new Date(r.date).toLocaleDateString()}</Text>
            <Text className="text-sm text-gray-400">{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</Text>
            <View className="border-t border-gray-100 mt-2 pt-2">
                <Text className="text-xs text-gray-400">
                    Reserved by: {r.profiles?.full_name} ({r.units?.unit_number})
                </Text>
            </View>
        </GlassCard>
    );

    // Session Expired UI
    if (sessionExpired) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
                {renderHeader()}
                <View className="flex-1 items-center justify-center p-8">
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text className="text-xl font-bold text-gray-900 mt-4">Session Expired</Text>
                    <Text className="text-gray-500 text-center mt-2">Please log in again.</Text>
                    <GlassButton title="Log Out" onPress={() => logout()} className="mt-6" />
                </View>
            </SafeAreaView>
        );
    }

    const timeSlots = getTimeSlots();
    const selectedAmenity = amenities.find(a => a.id === newBooking.amenityId);

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            {renderHeader()}

            {loading ? (
                <ActivityIndicator size="large" className="mt-10" />
            ) : (
                <>
                    {renderTabs()}
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    >
                        {/* Pending Approvals */}
                        {pendingReservations.length > 0 && (
                            <View className="mb-6">
                                <Text className="text-lg font-bold text-orange-600 px-4 mb-3">
                                    Pending Approvals ({pendingReservations.length})
                                </Text>
                                {pendingReservations.map(renderPendingCard)}
                            </View>
                        )}

                        {/* Upcoming Reservations */}
                        <Text className="text-lg font-bold text-gray-900 px-4 mb-3">
                            Upcoming Reservations
                        </Text>
                        {upcomingReservations.length === 0 ? (
                            <View className="items-center py-6 mb-6">
                                <Text className="text-2xl mb-2">📅</Text>
                                <Text className="text-gray-500">No upcoming reservations</Text>
                            </View>
                        ) : (
                            <View className="mb-6">
                                {upcomingReservations.map(renderUpcomingCard)}
                            </View>
                        )}

                        {/* Past Reservations */}
                        {pastReservations.length > 0 && (
                            <View>
                                <Text className="text-lg font-bold text-gray-500 px-4 mb-3 mt-2">
                                    Past Reservations
                                </Text>
                                {pastReservations.map(renderPastCard)}
                            </View>
                        )}
                    </ScrollView>
                </>
            )}

            {/* Booking Modal */}
            <GlassModal visible={bookingModal} onClose={() => setBookingModal(false)}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text className="text-xl font-bold text-gray-900 mb-4">New Reservation</Text>

                    {/* Reserve for User (Admin/Vocal only) */}
                    {canReserveForOthers && filteredUsers.length > 0 && (
                        <GlassSelect
                            label={`Reserve for${isVocal && !isAdmin ? ' (Your Blocks Only)' : ''}`}
                            placeholder="Myself"
                            value={newBooking.targetUserId || null}
                            options={[
                                { label: `Myself (${user?.email})`, value: null },
                                ...filteredUsers.map((u: any) => ({
                                    label: `${u.full_name} - Unit ${u.unit_number}`,
                                    value: u.id
                                }))
                            ]}
                            onSelect={(val) => setNewBooking({ ...newBooking, targetUserId: val as string || '' })}
                            containerClassName="mb-4"
                            searchable
                            searchPlaceholder="Search residents..."
                        />
                    )}

                    {/* Amenity Selection */}
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Amenity</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        <View className="flex-row gap-2">
                            {amenities.filter(a => a.is_reservable).map(a => (
                                <TouchableOpacity
                                    key={a.id}
                                    onPress={() => setNewBooking({ ...newBooking, amenityId: a.id, startTime: '', endTime: '', date: '' })}
                                    className={`px-4 py-2 rounded-full ${newBooking.amenityId === a.id ? 'bg-blue-600' : 'bg-gray-100'}`}
                                    activeOpacity={0.7}
                                >
                                    <Text className={newBooking.amenityId === a.id ? 'text-white font-medium' : 'text-gray-700'}>
                                        {a.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Date Selection */}
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Date</Text>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="bg-gray-100 rounded-xl py-3 px-4 mb-4"
                        activeOpacity={0.7}
                    >
                        <Text className={newBooking.date ? 'text-gray-900' : 'text-gray-400'}>
                            {newBooking.date || 'Select Date'}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={newBooking.date ? new Date(newBooking.date + 'T12:00:00') : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (selectedDate) {
                                    const year = selectedDate.getFullYear();
                                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                    const day = String(selectedDate.getDate()).padStart(2, '0');
                                    const dateStr = `${year}-${month}-${day}`;

                                    // Check if full day
                                    const amenity = amenities.find(a => a.id === newBooking.amenityId);
                                    const type = amenity?.reservation_limits?.type || 'hour';

                                    if (type === 'day') {
                                        const s = amenity?.reservation_limits?.schedule_start || '06:00';
                                        const e = amenity?.reservation_limits?.schedule_end || '23:00';
                                        setNewBooking({ ...newBooking, date: dateStr, startTime: s, endTime: e });
                                    } else {
                                        setNewBooking({ ...newBooking, date: dateStr, startTime: '', endTime: '' });
                                    }
                                }
                            }}
                        />
                    )}

                    {/* Time Slots */}
                    {newBooking.amenityId && newBooking.date && (
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                {selectedAmenity?.reservation_limits?.type === 'day' ? 'Full Day' : 'Time Slot'}
                            </Text>
                            {timeSlots.length === 0 ? (
                                <View className="bg-red-50 rounded-xl p-4">
                                    <Text className="text-red-600 text-center">No slots available for this date</Text>
                                </View>
                            ) : selectedAmenity?.reservation_limits?.type === 'day' ? (
                                <View className="bg-blue-50 rounded-xl p-4">
                                    <Text className="text-blue-600 text-center font-medium">
                                        Full Day Reservation ({timeSlots[0]?.time} - {timeSlots[0]?.end})
                                    </Text>
                                </View>
                            ) : (
                                <View className="flex-row flex-wrap gap-2">
                                    {timeSlots.map(slot => (
                                        <TouchableOpacity
                                            key={slot.time}
                                            onPress={() => !slot.disabled && setNewBooking({
                                                ...newBooking,
                                                startTime: slot.time,
                                                endTime: slot.end
                                            })}
                                            disabled={slot.disabled}
                                            className={`px-3 py-2 rounded-lg ${newBooking.startTime === slot.time
                                                ? 'bg-blue-600'
                                                : slot.disabled
                                                    ? 'bg-gray-200'
                                                    : 'bg-gray-100'
                                                }`}
                                            activeOpacity={0.7}
                                        >
                                            <Text className={
                                                newBooking.startTime === slot.time
                                                    ? 'text-white font-medium'
                                                    : slot.disabled
                                                        ? 'text-gray-400'
                                                        : 'text-gray-700'
                                            }>
                                                {slot.time}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {newBooking.startTime && !selectedAmenity?.reservation_limits?.type && (
                                <Text className="text-blue-600 text-center mt-2 font-medium">
                                    Selected: {newBooking.startTime} - {newBooking.endTime}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Notes */}
                    <GlassInput
                        label="Notes (optional)"
                        value={newBooking.notes}
                        onChangeText={(text) => setNewBooking({ ...newBooking, notes: text })}
                        placeholder="Any special requests?"
                        multiline
                        numberOfLines={2}
                        containerClassName="mb-4"
                    />

                    {/* Buttons */}
                    <View className="flex-row gap-3 mt-2">
                        <GlassButton
                            title="Cancel"
                            variant="secondary"
                            onPress={() => {
                                setBookingModal(false);
                                resetBookingForm();
                            }}
                            className="flex-1"
                        />
                        <GlassButton
                            title="Request"
                            onPress={handleCreateBooking}
                            className="flex-1"
                        />
                    </View>
                </ScrollView>
            </GlassModal>
        </SafeAreaView>
    );
}
