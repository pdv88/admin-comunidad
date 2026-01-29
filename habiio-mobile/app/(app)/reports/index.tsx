import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/constants/Config';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassSelect, Option } from '@/components/ui/GlassSelect';
import { GlassCard } from '@/components/ui/GlassCard';
import { NavigationErrorBoundary } from '@/components/NavigationErrorBoundary';

export default function ReportsScreen() {
    const { user, activeCommunity, hasRole, logout } = useAuth();
    const navigation = useNavigation();

    // If user is null, we're being logged out - don't render anything
    // This prevents crashes during the navigation transition
    if (!user) {
        return null;
    }

    // State
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false); // Default to false for debug
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const isMaintenance = hasRole('maintenance');
    const isAdminOrPres = hasRole('super_admin') || hasRole('admin') || hasRole('president') || hasRole('secretary');
    const canSeeAll = isAdminOrPres || isMaintenance;
    const isVocal = hasRole('vocal');

    // Initial tab logic: Admin/Maint -> 'all', Vocal -> 'block' (if not admin), Resident -> 'my'
    const getInitialTab = () => {
        if (canSeeAll) return 'all';
        if (isVocal) return 'block';
        return 'my';
    };

    const [activeTab, setActiveTab] = useState<'my' | 'block' | 'all'>(getInitialTab());
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Create Form State
    const [modalVisible, setModalVisible] = useState(false);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [newReport, setNewReport] = useState({
        title: '',
        description: '',
        category: 'maintenance',
        scope: 'community', // community, block, unit
        block_id: null as number | null,
        unit_id: null as number | null
    });

    // Session state
    const [sessionExpired, setSessionExpired] = useState(false);

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            setSessionExpired(false);
            const params = new URLSearchParams({
                mode: activeTab,
                status: statusFilter,
                category: categoryFilter,
                search: searchTerm,
                limit: '20' // Mobile pagination limit
            });

            const response = await axios.get(`${API_URL}/api/reports?${params.toString()}`);
            setReports(response.data.data || []);
        } catch (error: any) {
            console.error("Error fetching reports:", error);
            // Check if session expired (401)
            if (error.response?.status === 401) {
                setSessionExpired(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, statusFilter, categoryFilter, searchTerm]);

    const fetchBlocks = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/properties/blocks`);
            setBlocks(response.data || []);
        } catch (error) {
            console.error("Error fetching blocks:", error);
        }
    };

    useEffect(() => {
        fetchReports();
        fetchBlocks();
    }, [fetchReports]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReports();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleCreateReport = async () => {
        if (!newReport.title || !newReport.description) {
            Alert.alert('Error', 'Title and Description are required');
            return;
        }

        try {
            const payload = {
                ...newReport,
                unit_id: newReport.scope === 'unit' ? newReport.unit_id : null,
                block_id: newReport.scope === 'block' ? newReport.block_id : null
            };
            // If scope is community, both IDs are null

            await axios.post(`${API_URL}/api/reports`, payload);
            setModalVisible(false);
            setNewReport({
                title: '',
                description: '',
                category: 'maintenance',
                scope: 'community',
                block_id: null,
                unit_id: null
            });
            fetchReports();
            Alert.alert('Success', 'Report created successfully');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create report');
        }
    };

    // Helper to get units for selected block (for admin/vocal view)
    const getUnitsForBlock = () => {
        if (!newReport.block_id) return [];
        const block = blocks.find(b => b.id === newReport.block_id);
        return block?.units?.map((u: any) => ({ label: u.unit_number, value: u.id })) || [];
    };

    // Helper to get user units (for resident view)
    const getUserUnits = () => {
        return user?.profile?.unit_owners?.map((uo: any) => ({
            label: `${uo.units?.blocks?.name || ''} - ${uo.units?.unit_number}`,
            value: uo.units?.id
        })) || [];
    };

    // Safe drawer open function
    const openDrawer = () => {
        try {
            navigation.dispatch(DrawerActions.openDrawer());
        } catch (e) {
            console.warn('Could not open drawer:', e);
        }
    };

    const renderHeader = () => (
        <View className="flex-row justify-between items-center px-4 py-4 bg-white shadow-sm z-10">
            <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={openDrawer} activeOpacity={0.7}>
                    <Ionicons name="menu" size={28} color="#111827" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Reports</Text>
            </View>
            <GlassButton
                title="Report"
                icon="add"
                onPress={() => setModalVisible(true)}
                style={{ transform: [{ scale: 0.9 }] }}
            />
        </View>
    );

    const renderTabs = () => (
        <View style={{ marginBottom: 8 }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 }}
            >
                <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'rgba(229,231,235,0.5)', padding: 4, borderRadius: 9999, alignItems: 'center' }}>
                    {/* Everyone sees My Reports */}
                    <TouchableOpacity
                        onPress={() => {
                            console.log("Switching to my...");
                            setActiveTab('my');
                        }}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 6,
                            borderRadius: 9999,
                            backgroundColor: activeTab === 'my' ? 'white' : 'transparent',
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'my' ? '#2563eb' : '#6b7280' }}>My Reports</Text>
                    </TouchableOpacity>

                    {/* Only Vocals see Block Reports */}
                    {isVocal && (
                        <TouchableOpacity
                            onPress={() => {
                                console.log("Switching to block...");
                                setActiveTab('block');
                            }}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 6,
                                borderRadius: 9999,
                                backgroundColor: activeTab === 'block' ? 'white' : 'transparent',
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'block' ? '#2563eb' : '#6b7280' }}>Block Reports</Text>
                        </TouchableOpacity>
                    )}

                    {/* Admins, President, Maintenance see All Reports */}
                    {canSeeAll && (
                        <TouchableOpacity
                            onPress={() => {
                                console.log("Switching to all...");
                                setActiveTab('all');
                            }}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 6,
                                borderRadius: 9999,
                                backgroundColor: activeTab === 'all' ? 'white' : 'transparent',
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'all' ? '#2563eb' : '#6b7280' }}>All Reports</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );

    const renderFilters = () => (
        <View className="px-4 mb-4 z-20">
            <GlassInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search reports..."
                containerClassName="mb-3"
            // icon="search" // Assuming GlassInput supports icon, if not remove
            />
            {/* Horizontal Filter Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2 pb-2">
                {/* Status Filter Placeholder - Can replace with proper selector or chips */}
                <Pressable
                    onPress={() => setStatusFilter(statusFilter === 'all' ? 'pending' : 'all')}
                    className={`px-3 py-1.5 rounded-full border ${statusFilter !== 'all' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                >
                    <Text className="text-xs text-gray-700">Status: {statusFilter === 'all' ? 'All' : statusFilter}</Text>
                </Pressable>

                <Pressable
                    onPress={() => setCategoryFilter(categoryFilter === 'all' ? 'maintenance' : 'all')}
                    className={`px-3 py-1.5 rounded-full border ${categoryFilter !== 'all' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                >
                    <Text className="text-xs text-gray-700">Category: {categoryFilter === 'all' ? 'All' : categoryFilter}</Text>
                </Pressable>
            </ScrollView>
        </View>
    );

    const renderItem = (item: any) => (
        <GlassCard key={item.id} className="mx-4 mb-4 p-4">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-row gap-2 items-center">
                    <View className={`px-2 py-0.5 rounded-full bg-gray-100`}>
                        <Text className="text-[10px] font-bold uppercase text-gray-600">{item.status}</Text>
                    </View>
                    <Text className="text-xs text-gray-400">{format(new Date(item.created_at), 'MMM dd, yyyy')}</Text>
                </View>
                <Text className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded capitalize">{item.category}</Text>
            </View>

            <Text className="text-lg font-bold text-gray-900 mb-1">{item.title}</Text>
            <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>{item.description}</Text>

            <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
                <View className="flex-row items-center gap-1">
                    <Ionicons name="person-circle-outline" size={16} color="#6b7280" />
                    <Text className="text-xs text-gray-500">{item.profiles?.full_name || 'Unknown'}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text className="text-xs text-gray-500 capitalize">{item.scope}</Text>
                </View>
            </View>
        </GlassCard>
    );

    return (
        <NavigationErrorBoundary>
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
                {renderHeader()}

                <View className="flex-1">
                    {renderTabs()}
                    {renderFilters()}

                    {sessionExpired ? (
                        <View className="flex-1 items-center justify-center p-8">
                            <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                            <Text className="text-xl font-bold text-gray-900 mt-4">Session Expired</Text>
                            <Text className="text-gray-500 text-center mt-2">Your session has expired. Please log in again.</Text>
                            <GlassButton
                                title="Log Out"
                                onPress={() => logout()}
                                className="mt-6"
                            />
                        </View>
                    ) : loading ? (
                        <ActivityIndicator size="large" className="mt-10" />
                    ) : (
                        <ScrollView
                            contentContainerStyle={{ paddingBottom: 100 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        >
                            {reports.length === 0 ? (
                                <Text className="text-center text-gray-500 mt-10">No reports found</Text>
                            ) : (
                                reports.map(renderItem)
                            )}
                        </ScrollView>
                    )}
                </View>

                <GlassModal visible={modalVisible} onClose={() => setModalVisible(false)}>
                    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[80vh]">
                        <Text className="text-xl font-bold text-gray-900 mb-6">New Report</Text>

                        <View className="space-y-4">
                            {/* Scope Selection */}
                            <GlassSelect
                                label="Scope"
                                value={newReport.scope}
                                onSelect={(val) => setNewReport({ ...newReport, scope: val as string })}
                                options={[
                                    { label: 'Community (General)', value: 'community' },
                                    { label: 'Block (Building)', value: 'block' },
                                    { label: 'My Unit', value: 'unit' }
                                ]}
                            />

                            {/* Block Selection (Conditional) */}
                            {(newReport.scope === 'block' || ((isAdminOrPres || isVocal) && newReport.scope === 'unit')) && (
                                <GlassSelect
                                    label="Select Block"
                                    value={newReport.block_id}
                                    onSelect={(val) => setNewReport({ ...newReport, block_id: val as number, unit_id: null })}
                                    options={blocks.map(b => ({ label: b.name, value: b.id }))}
                                />
                            )}

                            {/* Unit Selection (Conditional) */}
                            {newReport.scope === 'unit' && (
                                (isAdminOrPres || isVocal) ? (
                                    // Admin/Vocal: Select from Block
                                    <GlassSelect
                                        label="Select Unit"
                                        value={newReport.unit_id}
                                        onSelect={(val) => setNewReport({ ...newReport, unit_id: val as number })}
                                        options={getUnitsForBlock()}
                                        disabled={!newReport.block_id}
                                    />
                                ) : (
                                    // Resident: Select from Own Units
                                    <GlassSelect
                                        label="Select Unit"
                                        value={newReport.unit_id}
                                        onSelect={(val) => setNewReport({ ...newReport, unit_id: val as number })}
                                        options={getUserUnits()}
                                        disabled={getUserUnits().length <= 1} // Auto-selected typically if logic added
                                    />
                                )
                            )}

                            <GlassInput
                                label="Title"
                                placeholder="e.g. Broken Light"
                                value={newReport.title}
                                onChangeText={t => setNewReport({ ...newReport, title: t })}
                            />

                            <GlassSelect
                                label="Category"
                                value={newReport.category}
                                onSelect={(val) => setNewReport({ ...newReport, category: val as string })}
                                options={[
                                    { label: 'Maintenance', value: 'maintenance' },
                                    { label: 'Security', value: 'security' },
                                    { label: 'Cleanliness', value: 'cleanliness' },
                                    { label: 'Other', value: 'other' }
                                ]}
                            />

                            <GlassInput
                                label="Description"
                                placeholder="Describe the issue..."
                                value={newReport.description}
                                onChangeText={t => setNewReport({ ...newReport, description: t })}
                                multiline
                                numberOfLines={4}
                            />

                            <GlassButton
                                title="Submit Report"
                                onPress={handleCreateReport}
                                className="mt-4"
                            />
                        </View>
                    </ScrollView>
                </GlassModal>
            </SafeAreaView>
        </NavigationErrorBoundary>
    );
}
