import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function WelcomeWidget() {
    const { user, activeCommunity, hasRole } = useAuth();
    const role = activeCommunity?.roles?.[0]?.name || 'Member';

    // Get unit info with block name if available
    const unit = activeCommunity?.unit_owners?.[0]?.units;
    const unitDisplay = unit
        ? `${unit.blocks?.name ? unit.blocks.name + ' - ' : ''}${unit.unit_number}`
        : null;

    // Hardcoded for now as per previous plan, or use mock logic
    const feeStatus: string = 'pending'; // 'paid' or 'pending'
    const feeAmount = 50.00;
    const currency = '$';

    // Helper to match web gradient text (simplified to colored text for React Native without LinearGradient component)
    // If expo-linear-gradient is available we could use it, but keeping it simple and performant first.

    return (
        <View className="bg-white/60 dark:bg-neutral-900/30 border border-white/40 dark:border-white/10 rounded-2xl shadow-sm p-4 mb-4">
            {/* Greeting Section */}
            <View className="mb-6">
                <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    Welcome, <Text className="text-blue-600 dark:text-blue-400">{user?.profile?.full_name || user?.user_metadata?.full_name || user?.email}</Text>
                </Text>

                <View className="flex-row flex-wrap gap-2 items-center">
                    <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                        <Text className="text-blue-800 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                            {role}
                        </Text>
                    </View>
                    {unitDisplay && (
                        <View className="bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-gray-200 dark:border-neutral-700">
                            <Text className="text-gray-600 dark:text-gray-400 text-xs">
                                {unitDisplay}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Quick Actions & Status (Resident only usually) */}
            <View className="gap-4">
                {/* Monthly Fee Pill */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/(app)/maintenance' as any)}
                    className="flex-row items-center gap-3 px-4 py-3 rounded-xl border border-white/20 bg-white/40 dark:bg-white/5"
                >
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${feeStatus === 'paid' ? 'bg-green-500/10' : 'bg-orange-500/10'
                        }`}>
                        <Text className={`text-lg font-bold ${feeStatus === 'paid' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                            {feeStatus === 'paid' ? '✓' : '!'}
                        </Text>
                    </View>
                    <View>
                        <Text className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            Monthly Fee
                        </Text>
                        <View className="flex-row items-baseline gap-2">
                            <Text className={`text-xs font-bold uppercase tracking-wider ${feeStatus === 'paid' ? 'text-green-700' : 'text-orange-700'
                                }`}>
                                {feeStatus === 'paid' ? 'Paid' : 'Pending'}
                            </Text>
                            <Text className="font-bold text-gray-900 dark:text-white">
                                {feeStatus === 'paid' ? `${currency}0.00` : `${currency}${feeAmount.toFixed(2)}`}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Quick Buttons */}
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={() => router.push('/(app)/visitors')}
                        className="items-center justify-center gap-1 p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 w-16"
                    >
                        <Text className="text-xl">🔑</Text>
                        <Text className="text-[10px] font-bold uppercase text-violet-700">Visit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/(app)/reports')}
                        className="items-center justify-center gap-1 p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 w-16"
                    >
                        <Text className="text-xl">⚠️</Text>
                        <Text className="text-[10px] font-bold uppercase text-orange-700">Report</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
