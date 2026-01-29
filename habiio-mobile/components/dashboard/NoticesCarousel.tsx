import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@/constants/Config';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';

export default function NoticesCarousel() {
    const { activeCommunity } = useAuth();
    const [notices, setNotices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeCommunity) {
            fetchNotices();
        }
    }, [activeCommunity]);

    const fetchNotices = async () => {
        try {
            // Simplified fetch - normally we might want a limit
            const response = await axios.get(`${API_URL}/api/notices`, {
                headers: { 'X-Community-ID': activeCommunity.community_id }
            });
            // Take top 5
            setNotices(response.data.slice(0, 5));
        } catch (error) {
            console.error("Failed to fetch notices for dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return '#ef4444'; // red
            case 'high': return '#f97316'; // orange
            default: return '#3b82f6'; // blue
        }
    };

    if (loading) return <View className="h-40 justify-center items-center"><ActivityIndicator /></View>;

    if (notices.length === 0) {
        return (
            <View className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100 items-center justify-center py-8">
                <Ionicons name="notifications-off-outline" size={32} color="#9ca3af" />
                <Text className="text-gray-400 mt-2">No recent notices</Text>
            </View>
        );
    }

    return (
        <View className="mb-6">
            <View className="flex-row justify-between items-center px-1 mb-3">
                <Text className="text-lg font-bold text-gray-900">Recent Notices</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/notices')}>
                    <Text className="text-indigo-600 text-sm font-medium">See All</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}>
                {notices.map((notice, index) => (
                    <TouchableOpacity
                        key={notice.id || index}
                        className="bg-white rounded-xl p-4 w-72 shadow-sm border border-gray-100"
                        onPress={() => router.push('/(app)/notices')}
                    >
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-row items-center gap-2">
                                <View className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getPriorityColor(notice.priority) }} />
                                <Text className="text-xs text-gray-400">{new Date(notice.created_at).toLocaleDateString()}</Text>
                            </View>
                            {notice.priority === 'urgent' && <Ionicons name="alert-circle" size={16} color="#ef4444" />}
                        </View>
                        <Text className="font-bold text-gray-800 text-base mb-1" numberOfLines={1}>{notice.title}</Text>
                        <Text className="text-gray-500 text-sm" numberOfLines={2}>{notice.content}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
