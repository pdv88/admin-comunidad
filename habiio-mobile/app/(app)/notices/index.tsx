import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { API_URL } from '@/constants/Config';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassSelect, Option } from '@/components/ui/GlassSelect';

import { Drawer } from 'expo-router/drawer';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export default function NoticesScreen() {
    const { user, activeCommunity, hasRole } = useAuth();
    const navigation = useNavigation();
    const [notices, setNotices] = useState<any[]>([]);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Create Form State
    const [newNotice, setNewNotice] = useState({ title: '', content: '', priority: 'normal', block_id: null as number | null });

    const isAdminOrPres = hasRole('super_admin') || hasRole('admin') || hasRole('president') || hasRole('secretary');
    const isVocal = hasRole('vocal');
    const canCreate = isAdminOrPres || isVocal;

    // Vocal logic
    const vocalBlockIds = activeCommunity?.roles
        ?.filter((r: any) => r.name === 'vocal' && r.block_id)
        .map((r: any) => r.block_id) || [];

    const fetchBlocks = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/properties/blocks`);
            setBlocks(response.data || []);
        } catch (error) {
            console.error("Error fetching blocks:", error);
        }
    };

    const fetchNotices = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/notices`);
            setNotices(response.data);
            if (isAdminOrPres || isVocal) {
                fetchBlocks();
            }
        } catch (error) {
            console.error("Error fetching notices:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isAdminOrPres, isVocal]);

    // Initialize form for vocal
    useEffect(() => {
        if (isVocal && vocalBlockIds.length > 0) {
            setNewNotice(prev => ({ ...prev, block_id: vocalBlockIds[0] }));
        }
    }, [isVocal]);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotices();
    };

    const handleCreateNotice = async () => {
        if (!newNotice.title || !newNotice.content) {
            Alert.alert('Error', 'Title and Content are required');
            return;
        }
        try {
            const payload = { ...newNotice };
            if (payload.block_id === 0 || payload.block_id === -1) payload.block_id = null;

            await axios.post(`${API_URL}/api/notices`, payload);
            setModalVisible(false);
            setNewNotice({ title: '', content: '', priority: 'normal', block_id: isVocal && vocalBlockIds.length > 0 ? vocalBlockIds[0] : null });
            fetchNotices();
            Alert.alert('Success', 'Notice posted');
        } catch (error) {
            Alert.alert('Error', 'Failed to post notice');
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert('Confirm Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await axios.delete(`${API_URL}/api/notices/${id}`);
                        fetchNotices();
                    } catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
    };

    const audienceOptions: Option[] = [
        ...(isAdminOrPres ? [{ label: 'Toda la Comunidad', value: null }] : []),
        ...(blocks
            .filter(block => isAdminOrPres || vocalBlockIds.includes(block.id))
            .map(block => ({ label: block.name, value: block.id })))
    ];

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 border-red-200';
            case 'high': return 'bg-orange-100 border-orange-200';
            default: return 'bg-white border-gray-100';
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View className={`p-4 mb-4 rounded-xl border shadow-sm ${getPriorityColor(item.priority)}`}>
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-row items-center gap-2">
                    <View className={`px-2 py-0.5 rounded-full ${item.priority === 'urgent' ? 'bg-red-200' : 'bg-gray-200'}`}>
                        <Text className="text-xs font-bold uppercase text-gray-700">{item.priority}</Text>
                    </View>
                    <Text className="text-xs text-gray-500">{format(new Date(item.created_at), 'MMM dd, yyyy')}</Text>
                </View>
                {(canCreate || item.created_by === user?.id) && (
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="gray" />
                    </TouchableOpacity>
                )}
            </View>
            <Text className="text-lg font-bold text-gray-900 mb-1">{item.title}</Text>
            <Text className="text-gray-700 text-base leading-5">{item.content}</Text>
            {item.block && (
                <View className="flex-row mt-2">
                    <Text className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                        Solo: {item.block}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            <Drawer.Screen options={{ headerShown: false }} />
            <View className="flex-row justify-between items-center px-4 py-4 bg-white shadow-sm z-10">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
                        <Ionicons name="menu" size={28} color="#111827" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-gray-900">Notices</Text>
                </View>
                {canCreate && (
                    <GlassButton
                        title="Post"
                        icon="add"
                        onPress={() => setModalVisible(true)}
                        style={{ transform: [{ scale: 0.9 }] }}
                    />
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" className="mt-10" />
            ) : (
                <FlatList
                    data={notices}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No notices found</Text>}
                />
            )}

            <GlassModal visible={modalVisible} onClose={() => setModalVisible(false)} animationType="fade">
                <View>
                    <Text className="text-xl font-bold text-gray-900 mb-6">Publicar Aviso</Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="space-y-4">
                            <GlassInput
                                label="Título"
                                placeholder="Escribe el título..."
                                value={newNotice.title}
                                onChangeText={t => setNewNotice({ ...newNotice, title: t })}
                                containerClassName="mb-4"
                            />

                            {/* Priority */}
                            <View className="z-40 mb-4">
                                <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">Prioridad</Text>
                                <View className="flex-row bg-gray-100/50 rounded-full p-1 border border-gray-200">
                                    {['normal', 'high', 'urgent'].map(p => (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => setNewNotice({ ...newNotice, priority: p })}
                                            activeOpacity={0.7}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                alignItems: 'center',
                                                borderRadius: 9999,
                                                backgroundColor: newNotice.priority === p ? 'white' : 'transparent',
                                                shadowColor: newNotice.priority === p ? '#000' : 'transparent',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: newNotice.priority === p ? 0.05 : 0,
                                                shadowRadius: 1,
                                                elevation: newNotice.priority === p ? 1 : 0,
                                            }}
                                        >
                                            <Text
                                                numberOfLines={1}
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: newNotice.priority === p ? '700' : '400',
                                                    color: newNotice.priority === p ? '#111827' : '#6b7280',
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {p}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Audience */}
                            <View className="z-30 mb-4">
                                <GlassSelect
                                    label="Audiencia"
                                    placeholder="Seleccionar..."
                                    value={newNotice.block_id}
                                    onSelect={(val) => setNewNotice({ ...newNotice, block_id: val as number | null })}
                                    options={audienceOptions}
                                    containerClassName=""
                                    disabled={isVocal && vocalBlockIds.length === 1}
                                />
                            </View>

                            <GlassInput
                                label="Contenido"
                                placeholder="Detalles del aviso..."
                                value={newNotice.content}
                                onChangeText={t => setNewNotice({ ...newNotice, content: t })}
                                multiline
                                numberOfLines={4}
                            />

                            <View className="flex-row gap-3 mt-4">
                                <View className="flex-1">
                                    <GlassButton
                                        title="Cancelar"
                                        variant="secondary"
                                        onPress={() => setModalVisible(false)}
                                    />
                                </View>
                                <View className="flex-1">
                                    <GlassButton
                                        title="Publicar Aviso"
                                        onPress={handleCreateNotice}
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </GlassModal>

        </SafeAreaView>
    );
}
