import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { API_URL } from '@/constants/Config';
import axios from 'axios';
import { router } from 'expo-router';

export default function ActivePollsWidget() {
    const { activeCommunity, user } = useAuth();
    const { isDarkMode } = useApp();
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeCommunity) {
            fetchPolls();
        }
    }, [activeCommunity]);

    const fetchPolls = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/polls`, {
                headers: { 'X-Community-ID': activeCommunity.community_id }
            });
            const now = new Date();
            const active = response.data.filter((p: any) => !p.ends_at || new Date(p.ends_at) > now);
            setPolls(active);
        } catch (error) {
            console.error("Error fetching polls", error);
        } finally {
            setLoading(false);
        }
    };

    const getVoteCount = (poll: any, optionId: number) => {
        if (!poll.results) return 0;
        const result = poll.results.find((r: any) => r.option_id === optionId);
        return result ? result.vote_count : 0;
    };

    const colors = ['#60a5fa', '#4ade80', '#c084fc', '#facc15', '#f472b6', '#818cf8'];

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
                    <Text className="text-xl">🗳️</Text>
                    <Text className="text-lg font-bold text-gray-800 dark:text-white">Active Polls</Text>
                </View>
            </View>

            {polls.length === 0 ? (
                <View
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
                >
                    <Text className="text-4xl mb-2 opacity-50">🗳️</Text>
                    <Text className="font-medium text-gray-500">No active polls</Text>
                    <Text className="text-xs text-gray-400">Check back later for new votes</Text>
                </View>
            ) : (
                <View className="gap-4">
                    {polls.map(poll => {
                        const totalVotes = poll.total_votes || 0;
                        const userVoted = poll.user_voted;

                        return (
                            <TouchableOpacity
                                key={poll.id}
                                onPress={() => router.push('/(app)/voting')}
                                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 20, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
                            >
                                <View className="flex-row justify-between items-start mb-2">
                                    <Text className="font-semibold text-gray-800 dark:text-white flex-1 mr-2" numberOfLines={2}>
                                        {poll.title}
                                    </Text>
                                    {userVoted && (
                                        <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                            <Text className="text-green-800 dark:text-green-400 text-xs">Voted</Text>
                                        </View>
                                    )}
                                </View>
                                <Text className="text-sm text-gray-500 dark:text-neutral-400 mb-4" numberOfLines={2}>
                                    {poll.description}
                                </Text>

                                {/* Progress Bar */}
                                <View className="h-2.5 w-full bg-gray-100 dark:bg-neutral-700/50 rounded-full overflow-hidden flex-row mb-4">
                                    {totalVotes > 0 ? (
                                        poll.poll_options?.map((option: any, index: number) => {
                                            const count = getVoteCount(poll, option.id);
                                            const percentage = (count / totalVotes) * 100;
                                            if (percentage === 0) return null;
                                            return (
                                                <View
                                                    key={option.id}
                                                    style={{ width: `${percentage}%`, backgroundColor: colors[index % colors.length] }}
                                                />
                                            );
                                        })
                                    ) : (
                                        <View className="flex-1 bg-gray-200 dark:bg-neutral-600" />
                                    )}
                                </View>

                                {/* Legend - Limited to top 2 to save space on mobile? Or show all stacked */}
                                {totalVotes > 0 && (
                                    <View className="flex-row flex-wrap gap-2 mb-2">
                                        {poll.poll_options?.map((option: any, index: number) => {
                                            const count = getVoteCount(poll, option.id);
                                            const percentage = (count / totalVotes) * 100;
                                            return (
                                                <View key={option.id} className="flex-row items-center gap-1.5 mr-2">
                                                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                                                    <Text className="text-xs text-gray-600 dark:text-neutral-400 max-w-[100px]" numberOfLines={1}>
                                                        {option.option_text}
                                                    </Text>
                                                    <Text className="text-xs font-bold text-gray-800 dark:text-neutral-300">
                                                        {Math.round(percentage)}%
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                <View
                                    style={{ borderTopWidth: 1, borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}
                                >
                                    <Text className="text-xs text-gray-400">{totalVotes} votes</Text>
                                    <Text className="text-xs text-gray-400">Ends {poll.ends_at ? new Date(poll.ends_at).toLocaleDateString() : 'N/A'}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}
