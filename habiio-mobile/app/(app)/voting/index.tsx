import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/constants/Config';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassSelect, Option } from '@/components/ui/GlassSelect';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';

export default function VotingScreen() {
    const { user, activeCommunity, hasRole, logout } = useAuth();
    const navigation = useNavigation();

    // Early return if logged out
    if (!user) return null;

    // State
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
    const [sessionExpired, setSessionExpired] = useState(false);

    // Modal State
    const [showPollModal, setShowPollModal] = useState(false);
    const [editingPoll, setEditingPoll] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [blocks, setBlocks] = useState<any[]>([]);

    // Poll Form
    const [pollForm, setPollForm] = useState({
        title: '',
        description: '',
        options: ['', ''],
        deadline: '',
        targetType: 'all',
        targetBlocks: [] as number[]
    });

    // Role checks
    const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('president') || hasRole('secretary');
    const isVocal = hasRole('vocal');
    const canCreate = isAdmin || isVocal;

    const vocalBlocks = activeCommunity?.roles
        ?.filter((r: any) => r.name === 'vocal' && r.block_id)
        .map((r: any) => r.block_id) || [];

    // Fetch Polls
    const fetchPolls = useCallback(async () => {
        try {
            setSessionExpired(false);
            const response = await axios.get(`${API_URL}/api/polls`);
            setPolls(response.data || []);
        } catch (error: any) {
            console.error("Error fetching polls:", error);
            if (error.response?.status === 401) {
                setSessionExpired(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchBlocks = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/properties/blocks`);
            setBlocks(response.data || []);
        } catch (error) {
            console.error("Error fetching blocks:", error);
        }
    };

    useEffect(() => {
        fetchPolls();
        if (isAdmin || isVocal) fetchBlocks();
    }, [fetchPolls, isAdmin, isVocal]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPolls();
    };

    // Filter polls by tab
    const now = new Date();
    const filteredPolls = polls.filter(p => {
        const endDate = p.ends_at ? new Date(p.ends_at) : null;
        if (activeTab === 'active') {
            return !endDate || endDate > now;
        } else {
            return endDate && endDate <= now;
        }
    });

    // Vote handler
    const handleVote = async (pollId: number, optionId: number) => {
        try {
            await axios.post(`${API_URL}/api/polls/vote`, {
                poll_id: pollId,
                option_id: optionId,
                user_id: user?.id
            });
            fetchPolls();
        } catch (error: any) {
            console.error("Error voting:", error);
            if (error.response?.status === 401) {
                setSessionExpired(true);
            } else {
                Alert.alert('Error', 'Failed to cast vote');
            }
        }
    };

    // Create/Edit Poll
    const openCreateModal = () => {
        setEditingPoll(null);
        const isRestrictedVocal = isVocal && !isAdmin;
        setPollForm({
            title: '',
            description: '',
            options: ['', ''],
            deadline: '',
            targetType: isRestrictedVocal ? 'blocks' : 'all',
            targetBlocks: isRestrictedVocal ? vocalBlocks : []
        });
        setShowPollModal(true);
    };

    const openEditModal = (poll: any) => {
        setEditingPoll(poll);
        setPollForm({
            title: poll.title,
            description: poll.description || '',
            options: [],
            deadline: poll.ends_at ? poll.ends_at.split('T')[0] : '',
            targetType: poll.target_type || 'all',
            targetBlocks: poll.target_blocks || []
        });
        setShowPollModal(true);
    };

    const handleSavePoll = async () => {
        try {
            const url = editingPoll
                ? `${API_URL}/api/polls/${editingPoll.id}`
                : `${API_URL}/api/polls`;
            const method = editingPoll ? 'PUT' : 'POST';

            const body = {
                ...pollForm,
                options: !editingPoll ? pollForm.options.filter(o => o.trim() !== '') : undefined
            };

            if (method === 'POST') {
                await axios.post(url, body);
            } else {
                await axios.put(url, body);
            }

            setShowPollModal(false);
            setEditingPoll(null);
            fetchPolls();
        } catch (error: any) {
            console.error("Error saving poll:", error);
            if (error.response?.status === 401) {
                setSessionExpired(true);
            } else {
                Alert.alert('Error', 'Failed to save poll');
            }
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await axios.delete(`${API_URL}/api/polls/${deleteId}`);
            fetchPolls();
            setDeleteId(null);
        } catch (error: any) {
            console.error("Error deleting poll:", error);
            if (error.response?.status === 401) {
                setSessionExpired(true);
            } else {
                Alert.alert('Error', 'Failed to delete poll');
            }
        }
    };

    const handleOptionChange = (idx: number, value: string) => {
        const updated = [...pollForm.options];
        updated[idx] = value;
        setPollForm({ ...pollForm, options: updated });
    };

    const addOption = () => setPollForm({ ...pollForm, options: [...pollForm.options, ''] });

    // Safe drawer open
    const openDrawer = () => {
        try {
            navigation.dispatch(DrawerActions.openDrawer());
        } catch (e) {
            console.warn('Could not open drawer:', e);
        }
    };

    // Render Header
    const renderHeader = () => (
        <View className="flex-row justify-between items-center px-4 py-4 bg-white shadow-sm z-10">
            <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={openDrawer} activeOpacity={0.7}>
                    <Ionicons name="menu" size={28} color="#111827" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Voting</Text>
            </View>
            {canCreate && (
                <GlassButton
                    title="New Poll"
                    icon="add"
                    onPress={openCreateModal}
                    style={{ transform: [{ scale: 0.9 }] }}
                />
            )}
        </View>
    );

    // Render Tabs
    const renderTabs = () => (
        <View style={{ marginBottom: 8 }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
                <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'rgba(229,231,235,0.5)', padding: 4, borderRadius: 9999 }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('active')}
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 8,
                            borderRadius: 9999,
                            backgroundColor: activeTab === 'active' ? 'white' : 'transparent',
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'active' ? '#2563eb' : '#6b7280' }}>
                            Active Polls
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('past')}
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 8,
                            borderRadius: 9999,
                            backgroundColor: activeTab === 'past' ? 'white' : 'transparent',
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'past' ? '#2563eb' : '#6b7280' }}>
                            Past Polls
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );

    // Render Poll Card
    const renderPollCard = (poll: any) => {
        const hasVoted = poll.user_voted;
        const isExpired = activeTab === 'past';
        const canManage = isAdmin || (isVocal && poll.created_by === user.id);

        // Find all winning options (highest votes) for past polls - handles ties
        const getWinnerInfo = () => {
            if (!isExpired || !poll.results || poll.results.length === 0) {
                return { winnerIds: new Set<number>(), isTie: false };
            }
            const sorted = [...poll.results].sort((a: any, b: any) => b.vote_count - a.vote_count);
            const maxVotes = sorted[0]?.vote_count || 0;

            // If no votes, no winner
            if (maxVotes === 0) {
                return { winnerIds: new Set<number>(), isTie: false };
            }

            // Get all options with the max vote count
            const winners = sorted.filter((r: any) => r.vote_count === maxVotes);
            const winnerIds = new Set(winners.map((r: any) => r.option_id));
            const isTie = winners.length > 1;

            return { winnerIds, isTie };
        };
        const { winnerIds, isTie } = getWinnerInfo();

        return (
            <GlassCard key={poll.id} className="mx-4 mb-4 p-4">
                {/* Header with edit/delete */}
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-lg font-bold text-gray-900 flex-1 pr-2">{poll.title}</Text>
                    {canManage && (
                        <View className="flex-row gap-2">
                            <TouchableOpacity onPress={() => openEditModal(poll)}>
                                <Ionicons name="create-outline" size={20} color="#6b7280" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setDeleteId(poll.id)}>
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {poll.description && (
                    <Text className="text-sm text-gray-500 mb-4">{poll.description}</Text>
                )}

                {/* Voting Options */}
                <View className="gap-3">
                    {poll.poll_options?.map((option: any) => {
                        const voteCount = poll.results?.find((r: any) => r.option_id === option.id)?.vote_count || 0;
                        const percentage = poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;
                        const isMyVote = poll.my_vote === option.id;
                        const isWinner = isExpired && winnerIds.has(option.id);

                        // For past polls: winner gets gradient fill, user vote gets border only
                        // For active polls: user vote gets solid fill
                        const getOptionStyle = () => {
                            if (isExpired) {
                                // Past poll: winner has gradient, user vote has border
                                if (isWinner) {
                                    return {
                                        backgroundColor: 'transparent',
                                        borderWidth: 0,
                                        borderColor: 'transparent',
                                    };
                                }
                                if (isMyVote) {
                                    return {
                                        backgroundColor: '#f9fafb',
                                        borderWidth: 2,
                                        borderColor: '#2563eb',
                                    };
                                }
                                return {
                                    backgroundColor: '#f3f4f6',
                                    borderWidth: 0,
                                    borderColor: 'transparent',
                                };
                            } else {
                                // Active poll
                                if (isMyVote) {
                                    return {
                                        backgroundColor: '#dbeafe',
                                        borderWidth: 2,
                                        borderColor: '#2563eb',
                                    };
                                }
                                return {
                                    backgroundColor: '#f3f4f6',
                                    borderWidth: 0,
                                    borderColor: 'transparent',
                                };
                            }
                        };

                        const optionStyle = getOptionStyle();

                        const optionContent = (
                            <>
                                {/* Progress bar background (only for non-winner or active) */}
                                {(hasVoted || isExpired || isAdmin) && !(isWinner && !isTie) && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${percentage}%`,
                                            backgroundColor: isMyVote ? '#93c5fd' : '#d1d5db',
                                            borderRadius: 9999,
                                        }}
                                    />
                                )}
                                <View className="flex-row justify-between items-center px-4 py-3">
                                    <View className="flex-row items-center gap-2">
                                        <Text className={`font-medium ${(isWinner && !isTie) ? 'text-white' : 'text-gray-800'}`}>
                                            {option.option_text}
                                        </Text>
                                        {isMyVote && (
                                            <View className={`px-2 py-0.5 rounded-full ${(isWinner && !isTie) ? 'bg-white/30' : 'bg-blue-600'}`}>
                                                <Text className="text-xs text-white">You</Text>
                                            </View>
                                        )}
                                        {isWinner && !isTie && (
                                            <View className="bg-white/30 px-2 py-0.5 rounded-full">
                                                <Text className="text-white text-xs font-bold">🏆 Winner</Text>
                                            </View>
                                        )}
                                        {isWinner && isTie && (
                                            <View className="bg-amber-500 px-2 py-0.5 rounded-full">
                                                <Text className="text-white text-xs font-bold">🤝 Tie</Text>
                                            </View>
                                        )}
                                    </View>
                                    {(hasVoted || isExpired || isAdmin) && (
                                        <Text className={`text-sm font-semibold ${(isWinner && !isTie) ? 'text-white' : 'text-gray-600'}`}>
                                            {percentage}% ({voteCount})
                                        </Text>
                                    )}
                                </View>
                            </>
                        );

                        // Winner option uses LinearGradient (only if NOT a tie)
                        if (isWinner && !isTie) {
                            return (
                                <View key={option.id} style={{ borderRadius: 9999, overflow: 'hidden' }}>
                                    <LinearGradient
                                        colors={['#3b82f6', '#8b5cf6', '#ec4899'] as const}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ borderRadius: 9999 }}
                                    >
                                        {optionContent}
                                    </LinearGradient>
                                </View>
                            );
                        }

                        return (
                            <TouchableOpacity
                                key={option.id}
                                onPress={() => !isExpired && !isMyVote && handleVote(poll.id, option.id)}
                                disabled={isExpired || isMyVote}
                                activeOpacity={0.7}
                                style={{
                                    ...optionStyle,
                                    borderRadius: 9999,
                                    overflow: 'hidden',
                                }}
                            >
                                {optionContent}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Footer */}
                <View className="flex-row justify-between items-center mt-4 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-500">Total: {poll.total_votes} votes</Text>
                    {poll.ends_at && (
                        <Text className="text-xs text-gray-500">
                            Ends {new Date(poll.ends_at).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </GlassCard>
        );
    };

    // Session Expired UI
    if (sessionExpired) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
                {renderHeader()}
                <View className="flex-1 items-center justify-center p-8">
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text className="text-xl font-bold text-gray-900 mt-4">Session Expired</Text>
                    <Text className="text-gray-500 text-center mt-2">Your session has expired. Please log in again.</Text>
                    <GlassButton title="Log Out" onPress={() => logout()} className="mt-6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            {renderHeader()}

            <View className="flex-1">
                {renderTabs()}

                {loading ? (
                    <ActivityIndicator size="large" className="mt-10" />
                ) : (
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    >
                        {filteredPolls.length === 0 ? (
                            <View className="items-center justify-center py-16">
                                <Text className="text-4xl mb-2">🗳️</Text>
                                <Text className="text-gray-500">No {activeTab} polls found</Text>
                            </View>
                        ) : (
                            filteredPolls.map(renderPollCard)
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Create/Edit Poll Modal */}
            <GlassModal visible={showPollModal} onClose={() => setShowPollModal(false)}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text className="text-xl font-bold text-gray-900 mb-4">
                        {editingPoll ? 'Edit Poll' : 'Create Poll'}
                    </Text>

                    <GlassInput
                        label="Title"
                        value={pollForm.title}
                        onChangeText={(text) => setPollForm({ ...pollForm, title: text })}
                        placeholder="Poll title"
                        containerClassName="mb-3"
                    />

                    <GlassInput
                        label="Description"
                        value={pollForm.description}
                        onChangeText={(text) => setPollForm({ ...pollForm, description: text })}
                        placeholder="Optional description"
                        multiline
                        numberOfLines={3}
                        containerClassName="mb-3"
                    />

                    {!editingPoll && (
                        <View className="mb-3">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Options</Text>
                            {pollForm.options.map((opt, idx) => (
                                <GlassInput
                                    key={idx}
                                    value={opt}
                                    onChangeText={(text) => handleOptionChange(idx, text)}
                                    placeholder={`Option ${idx + 1}`}
                                    containerClassName="mb-2"
                                />
                            ))}
                            <TouchableOpacity onPress={addOption}>
                                <Text className="text-blue-600 text-sm font-medium">+ Add Option</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {editingPoll && (
                        <Text className="text-xs text-yellow-600 mb-3">
                            Options cannot be edited to preserve vote integrity.
                        </Text>
                    )}

                    <GlassInput
                        label="Deadline"
                        value={pollForm.deadline}
                        onChangeText={(text) => setPollForm({ ...pollForm, deadline: text })}
                        placeholder="YYYY-MM-DD"
                        containerClassName="mb-4"
                    />

                    <View className="flex-row gap-3 mt-4">
                        <GlassButton
                            title="Cancel"
                            variant="secondary"
                            onPress={() => setShowPollModal(false)}
                            className="flex-1"
                        />
                        <GlassButton
                            title={editingPoll ? 'Save' : 'Create'}
                            onPress={handleSavePoll}
                            className="flex-1"
                        />
                    </View>
                </ScrollView>
            </GlassModal>

            {/* Delete Confirmation Modal */}
            <GlassModal visible={!!deleteId} onClose={() => setDeleteId(null)}>
                <View className="items-center">
                    <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-4">
                        <Ionicons name="warning" size={24} color="#dc2626" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900 mb-2">Delete Poll?</Text>
                    <Text className="text-gray-500 text-center mb-6">
                        This action cannot be undone. All votes will be lost.
                    </Text>
                    <View className="flex-row gap-3 w-full">
                        <GlassButton
                            title="Cancel"
                            variant="secondary"
                            onPress={() => setDeleteId(null)}
                            className="flex-1"
                        />
                        <TouchableOpacity
                            onPress={confirmDelete}
                            className="flex-1 bg-red-600 rounded-full py-3 items-center"
                            activeOpacity={0.7}
                        >
                            <Text className="text-white font-semibold">Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </GlassModal>
        </SafeAreaView>
    );
}
