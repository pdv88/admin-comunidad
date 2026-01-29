import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@/constants/Config';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { router } from 'expo-router';

const RecentNoticesWidget = () => {
    const { activeCommunity } = useAuth();
    const { isDarkMode } = useApp();
    const [notices, setNotices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchNotices = async () => {
            try {
                if (!activeCommunity?.community_id) return;

                const response = await axios.get(`${API_URL}/api/notices`, {
                    headers: { 'X-Community-ID': activeCommunity.community_id }
                });
                // Slice to 5
                if (isMounted) {
                    setNotices(response.data.slice(0, 5));
                }
            } catch (error) {
                console.error("Failed to fetch notices", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (activeCommunity) {
            fetchNotices();
        }

        return () => {
            isMounted = false;
        };
    }, [activeCommunity]);

    if (loading) return (
        <View
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
        >
            <ActivityIndicator size="small" color="#4f46e5" />
        </View>
    );

    if (notices.length === 0) return null;

    return (
        <View
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
        >
            <View className="flex-row items-center h-14 px-4">
                {/* LATEST Badge */}
                <View className="flex-row items-center gap-2 pr-4 border-r border-gray-200 dark:border-white/10">
                    <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center border border-blue-500/20">
                        <Ionicons name="notifications-outline" size={16} color="#2563eb" />
                    </View>
                    <View className="bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/10">
                        <Text className="text-[10px] font-bold uppercase text-blue-800 dark:text-blue-400">
                            Latest
                        </Text>
                    </View>
                </View>

                {/* Horizontal Ticker (ScrollView) */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-1 ml-4"
                    contentContainerStyle={{ alignItems: 'center' }}
                >
                    {notices.map((notice, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => router.push('/(app)/notices')}
                            className="flex-row items-center mr-8"
                        >
                            {notice.priority === 'urgent' && (
                                <View className="bg-red-600 px-1.5 py-0.5 rounded mr-2">
                                    <Text className="text-white text-[10px] font-bold uppercase">FLASH</Text>
                                </View>
                            )}
                            <Text className="text-sm font-bold text-gray-800 dark:text-gray-200 mr-1">
                                {notice.title}:
                            </Text>
                            <Text className="text-sm text-gray-700 dark:text-gray-400" numberOfLines={1}>
                                {notice.content}
                            </Text>
                            <Text className="text-blue-500/40 mx-2">•</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

export default RecentNoticesWidget;
