import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { API_URL } from '@/constants/Config';
import axios from 'axios';
import { router } from 'expo-router';

export default function ActiveCampaignsWidget() {
    const { activeCommunity } = useAuth();
    const { isDarkMode } = useApp();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeCommunity) {
            fetchCampaigns();
        }
    }, [activeCommunity]);

    const fetchCampaigns = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/payments/campaigns`, {
                headers: { 'X-Community-ID': activeCommunity.community_id }
            });
            const active = response.data.filter((c: any) => c.is_active);
            setCampaigns(active);
        } catch (error) {
            console.error("Error fetching campaigns", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <View
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', borderRadius: 16, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
        >
            <ActivityIndicator size="small" color="#4f46e5" />
        </View>
    );

    return (
        <View className="mb-4">
            <View className="flex-row justify-between items-center mb-4 px-1">
                <View className="flex-row items-center gap-2">
                    <Text className="text-xl">📢</Text>
                    <Text className="text-lg font-bold text-gray-800 dark:text-white">Campaigns</Text>
                </View>
            </View>

            {campaigns.length === 0 ? (
                <View
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
                >
                    <Text className="text-4xl mb-2 opacity-50">📢</Text>
                    <Text className="font-medium text-gray-500">No active campaigns</Text>
                    <Text className="text-xs text-gray-400">New campaigns will appear here</Text>
                </View>
            ) : (
                <View className="gap-4">
                    {campaigns.map(campaign => {
                        const progress = Math.min((Number(campaign.current_amount) / Number(campaign.target_amount)) * 100, 100);

                        return (
                            <TouchableOpacity
                                key={campaign.id}
                                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 16, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
                            >
                                <Text className="font-bold text-gray-800 dark:text-white mb-3">
                                    {campaign.name}
                                </Text>

                                {/* Progress Bar */}
                                <View className="h-2 w-full bg-gray-200 dark:bg-neutral-700/50 rounded-full overflow-hidden mb-2">
                                    <View
                                        style={{ width: `${progress}%` }}
                                        className="h-full bg-emerald-500 rounded-full"
                                    />
                                </View>

                                <View className="flex-row justify-between">
                                    <Text className="text-xs text-gray-500 dark:text-neutral-400">Raised: ${Number(campaign.current_amount).toLocaleString()}</Text>
                                    <Text className="text-xs text-gray-500 dark:text-neutral-400">Goal: ${Number(campaign.target_amount).toLocaleString()}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}
