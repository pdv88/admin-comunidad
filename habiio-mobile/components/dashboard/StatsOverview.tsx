import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Hardcoded for now as per plan, to be connected to real data later
export default function StatsOverview() {
    const stats = [
        { label: 'Pending Reports', value: '3', icon: 'alert-circle-outline', color: '#f59e0b' },
        { label: 'Active Votes', value: '1', icon: 'stats-chart-outline', color: '#ec4899' },
        { label: 'Visitors Today', value: '12', icon: 'people-outline', color: '#10b981' },
        { label: 'Reservations', value: '2', icon: 'calendar-outline', color: '#8b5cf6' },
    ];

    return (
        <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-3 px-1">Overview</Text>
            <View className="flex-row flex-wrap gap-3">
                {stats.map((stat, index) => (
                    <View key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex-1 min-w-[45%]">
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="p-2 rounded-lg bg-gray-50" style={{ backgroundColor: `${stat.color}10` }}>
                                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                            </View>
                            <Text className="text-2xl font-bold text-gray-900">{stat.value}</Text>
                        </View>
                        <Text className="text-gray-500 text-xs font-medium uppercase">{stat.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
