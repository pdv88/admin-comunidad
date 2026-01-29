import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function MobileCommunitySwitcher() {
    const { userCommunities, activeCommunity, switchCommunity, loading } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [switching, setSwitching] = useState(false);

    const toggleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsExpanded(!isExpanded);
    };

    const handleSwitch = async (communityId: number) => {
        if (communityId === activeCommunity?.community_id) {
            setIsExpanded(false);
            return;
        }

        try {
            setSwitching(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await switchCommunity(communityId);
            setIsExpanded(false);
        } catch (error) {
            console.error("Failed to switch community", error);
        } finally {
            setSwitching(false);
        }
    };

    if (loading) return <ActivityIndicator size="small" color="#4f46e5" />;

    const currentName = activeCommunity?.communities?.name || "Select Community";

    return (
        <View className="mb-6 px-1">
            <TouchableOpacity
                onPress={toggleExpand}
                activeOpacity={0.7}
                className="flex-row items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
                <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-10 h-10 rounded-lg bg-indigo-50 items-center justify-center overflow-hidden border border-indigo-100">
                        {activeCommunity?.communities?.logo_url ? (
                            <Image
                                source={{ uri: activeCommunity.communities.logo_url }}
                                style={{ width: 40, height: 40 }}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <Text className="text-indigo-600 font-bold text-lg">
                                {currentName.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                            Current Community
                        </Text>
                        <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                            {currentName}
                        </Text>
                    </View>
                </View>
                <Ionicons
                    name="chevron-down"
                    size={20}
                    color="#9ca3af"
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            {isExpanded && (
                <View className="mt-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {userCommunities.map((item: any, index: number) => {
                        const isActive = item.community_id === activeCommunity?.community_id;
                        return (
                            <TouchableOpacity
                                key={item.community_id}
                                onPress={() => handleSwitch(item.community_id)}
                                className={`flex-row items-center p-4 border-b border-gray-50 last:border-0 ${isActive ? 'bg-indigo-50' : 'active:bg-gray-50'}`}
                            >
                                <View className={`w-2 h-2 rounded-full mr-3 ${isActive ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                                <Text className={`flex-1 text-base ${isActive ? 'text-indigo-700 font-semibold' : 'text-gray-700'}`}>
                                    {item.communities?.name}
                                </Text>
                                {isActive && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {switching && (
                <View className="absolute inset-0 bg-white/50 justify-center items-center rounded-xl z-10">
                    <ActivityIndicator color="#4f46e5" />
                </View>
            )}
        </View>
    );
}
