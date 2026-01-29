import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { API_URL } from '@/constants/Config';
import { LinearGradient } from 'expo-linear-gradient';


import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { GlassCard } from '@/components/ui/GlassCard';

export default function CommunityScreen() {
    const { activeCommunity } = useAuth();
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeCommunity) {
            fetchInfo();
        }
    }, [activeCommunity]);

    const formatDays = (days: number[]) => {
        if (!days || !Array.isArray(days) || days.length === 0) return 'All week';
        if (days.length === 7) return 'Every day';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const sorted = [...days].sort((a, b) => a - b);
        let consecutive = true;
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] !== sorted[i] + 1) {
                consecutive = false;
                break;
            }
        }
        if (consecutive && sorted.length > 2) {
            return `${dayNames[sorted[0]]} - ${dayNames[sorted[sorted.length - 1]]}`;
        }
        return sorted.map(d => dayNames[d]).join(', ');
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    };

    const fetchInfo = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/communities/public-info`, {
                headers: { 'X-Community-ID': activeCommunity.community_id }
            });
            setInfo(response.data);
        } catch (error) {
            console.error("Error fetching community info:", error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        Alert.alert('Copied', 'Text copied to clipboard');
    };

    if (loading) return <View className="flex-1 justify-center items-center"><ActivityIndicator size="large" /></View>;

    const community = info?.community || {};
    const leaders = info?.leaders || [];
    const amenities = info?.amenities || [];

    // Explicit casting to any for map items if interfaces are not available, or assume structure
    // Since we don't have shared interfaces yet, we will use 'any' to fix build errors.

    return (
        <View className="flex-1">
            <ScreenBackground />

            <SafeAreaView edges={['top']} className="flex-1">
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Hero Section */}
                    <View className="mx-4 mt-2 rounded-3xl overflow-hidden shadow-lg shadow-blue-900/20">
                        <LinearGradient
                            colors={['#1e293b', '#0f172a']}
                        >
                            <View className="items-center w-full p-6 pt-10 pb-10">
                                {community?.logo_url ? (
                                    <Image source={{ uri: community.logo_url }} className="w-24 h-24 rounded-2xl bg-white/10 mb-4" resizeMode="contain" />
                                ) : (
                                    <View className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center mb-4 shadow-lg">
                                        <Text className="text-white text-4xl font-bold">{community?.name?.charAt(0)}</Text>
                                    </View>
                                )}
                                <Text className="text-white text-2xl font-bold text-center">{community?.name}</Text>
                                <View className="flex-row items-center mt-2 bg-white/10 px-3 py-1 rounded-full">
                                    <Ionicons name="location-outline" size={14} color="#94a3b8" />
                                    <Text className="text-slate-300 ml-1 text-sm">
                                        {community?.address || 'No Address'}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    <View className="px-4 gap-6 mt-6">

                        {/* Bank Details Card */}
                        <GlassCard variant="outer" className="mb-6 p-5">
                            <View className="flex-row items-center gap-2 mb-4">
                                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                                    <Ionicons name="card-outline" size={18} color="#2563eb" />
                                </View>
                                <Text className="text-lg font-bold text-slate-800">Bank Details</Text>
                            </View>
                            {community?.bank_details ? (
                                Array.isArray(community.bank_details) ? community.bank_details.map((bank: any, i: number) => (
                                    <View key={i} className="mb-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0">
                                        <Text className="font-bold text-base mb-2 text-slate-700">{bank.bank_name}</Text>
                                        <View className="space-y-3">
                                            <GlassCard variant="inner" className="p-3">
                                                <Text className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Account</Text>
                                                <TouchableOpacity onPress={() => copyToClipboard(bank.account_number)} className="flex-row items-center justify-between">
                                                    <Text className="text-base font-mono text-slate-800 font-semibold">{bank.account_number}</Text>
                                                    <Ionicons name="copy-outline" size={16} color="#64748b" />
                                                </TouchableOpacity>
                                            </GlassCard>
                                            {bank.secondary_number && (
                                                <GlassCard variant="inner" className="p-3">
                                                    <Text className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{bank.secondary_type || 'CLABE'}</Text>
                                                    <TouchableOpacity onPress={() => copyToClipboard(bank.secondary_number)} className="flex-row items-center justify-between">
                                                        <Text className="text-base font-mono text-slate-800 font-semibold">{bank.secondary_number}</Text>
                                                        <Ionicons name="copy-outline" size={16} color="#64748b" />
                                                    </TouchableOpacity>
                                                </GlassCard>
                                            )}
                                        </View>
                                    </View>
                                )) : <Text className="text-slate-600">{String(community.bank_details)}</Text>
                            ) : (
                                <Text className="text-slate-500 italic">No bank details available</Text>
                            )}
                        </GlassCard>

                        {/* Leaders Card */}
                        <GlassCard variant="outer" className="mb-6 p-5">
                            <View className="flex-row items-center gap-2 mb-4">
                                <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
                                    <Ionicons name="people-outline" size={18} color="#ea580c" />
                                </View>
                                <Text className="text-lg font-bold text-slate-800">Leaders</Text>
                            </View>
                            {leaders && leaders.length > 0 ? (
                                leaders.map((leader: any, i: number) => (
                                    <View key={i} className="flex-row items-center gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-white/40 rounded-lg px-2 -mx-2">
                                        <View className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 items-center justify-center shadow-sm">
                                            <Text className="text-orange-600 font-bold">{leader.name?.charAt(0)}</Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-semibold text-slate-800">{leader.name}</Text>
                                            <View className="flex-row flex-wrap gap-1 mt-1">
                                                {leader.roles?.map((r: any, idx: number) => (
                                                    <View key={idx} className="bg-white/80 px-2 py-0.5 rounded-full border border-slate-100">
                                                        <Text className="text-[10px] text-slate-600 font-medium">
                                                            {r.role}{r.block ? ` - ${r.block}` : ''}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                ))
                            ) : <Text className="text-slate-500 italic">No leaders listed</Text>}
                        </GlassCard>

                        {/* Amenities Card */}
                        <GlassCard variant="outer" className="mb-6 p-5">
                            <View className="flex-row items-center gap-2 mb-4">
                                <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center">
                                    <Ionicons name="tennisball-outline" size={18} color="#9333ea" />
                                </View>
                                <Text className="text-lg font-bold text-slate-800">Amenities</Text>
                            </View>
                            {amenities && amenities.length > 0 ? (
                                amenities.map((amenity: any, i: number) => {
                                    const limits = amenity.reservation_limits || {};
                                    return (
                                        <GlassCard variant="inner" key={i} className="mb-3 p-4">
                                            <Text className="font-bold text-slate-800 text-lg mb-1">{amenity.name}</Text>
                                            <Text className="text-sm text-slate-500 mb-3 leading-relaxed">{amenity.description}</Text>

                                            <View className="flex-row gap-2">
                                                <View className="flex-1 bg-white/80 p-2 rounded-lg items-center">
                                                    <Text className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Days</Text>
                                                    <Text className="text-xs text-slate-700 font-semibold text-center">
                                                        {limits.allowed_days ? formatDays(limits.allowed_days) : 'Every day'}
                                                    </Text>
                                                </View>
                                                <View className="flex-1 bg-white/80 p-2 rounded-lg items-center">
                                                    <Text className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Hours</Text>
                                                    <Text className="text-xs text-slate-700 font-semibold text-center">
                                                        {limits.schedule_start && limits.schedule_end
                                                            ? `${formatTime(limits.schedule_start)} - ${formatTime(limits.schedule_end)}`
                                                            : '24 Hours'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </GlassCard>
                                    );
                                })
                            ) : <Text className="text-slate-500 italic">No amenities listed</Text>}
                        </GlassCard>

                        {/* Documents Card */}
                        <GlassCard variant="outer" className="mb-6 p-5">
                            <View className="flex-row items-center gap-2 mb-4">
                                <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
                                    <Ionicons name="document-text-outline" size={18} color="#059669" />
                                </View>
                                <Text className="text-lg font-bold text-slate-800">Documents</Text>
                            </View>
                            {
                                info?.documents && info.documents.length > 0 ? (
                                    info.documents.map((doc: any, i: number) => (
                                        <TouchableOpacity
                                            key={i}
                                            className="flex-row items-center gap-3 py-3 border-b border-slate-100 last:border-0 active:bg-white/50 rounded-lg px-2 -mx-2 transition-colors"
                                            onPress={() => {
                                                if (doc.url) {
                                                    Linking.openURL(doc.url);
                                                }
                                            }}
                                        >
                                            <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center border border-emerald-100">
                                                <Ionicons name="cloud-download-outline" size={20} color="#10b981" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-semibold text-slate-800">{doc.name}</Text>
                                                <Text className="text-xs text-slate-500 mt-0.5">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm">
                                                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : <Text className="text-slate-500 italic">No documents available</Text>
                            }
                        </GlassCard>

                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
