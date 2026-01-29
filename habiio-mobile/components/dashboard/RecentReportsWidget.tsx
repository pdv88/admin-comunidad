import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '@/constants/Config';
import axios from 'axios';
import { router } from 'expo-router';

export default function RecentReportsWidget() {
    const { activeCommunity, user, hasAnyRole } = useAuth();
    const systemColorScheme = useColorScheme();
    const isDarkMode = systemColorScheme === 'dark';
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const canViewAll = hasAnyRole(['super_admin', 'admin', 'president', 'vocal', 'secretary', 'maintenance']);

    useEffect(() => {
        if (activeCommunity) {
            fetchReports();
        }
    }, [activeCommunity]);

    const fetchReports = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/reports?limit=5`, {
                headers: { 'X-Community-ID': activeCommunity.community_id }
            });
            // Handle pagination wrapper if present, typically response.data.data
            const data = response.data.data ? response.data.data : response.data;
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching reports", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return { bg: '#fef3c7', text: '#92400e', label: 'Pending' };
            case 'in_progress': return { bg: '#dbeafe', text: '#1e40af', label: 'In Progress' };
            case 'resolved': return { bg: '#dcfce7', text: '#166534', label: 'Resolved' };
            case 'rejected': return { bg: '#fee2e2', text: '#b91c1c', label: 'Rejected' };
            default: return { bg: '#f3f4f6', text: '#374151', label: status };
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'maintenance': return '🔧';
            case 'security': return '🛡️';
            case 'cleaning': return '🧹';
            case 'noise': return '🔊';
            default: return '📝';
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
                    <Text className="text-xl">🔧</Text>
                    <Text className="text-lg font-bold text-gray-800 dark:text-white">
                        {canViewAll ? 'Recent Reports' : 'My Reports'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(app)/reports')}>
                    <Text className="text-sm text-blue-600 font-medium">View All</Text>
                </TouchableOpacity>
            </View>

            {reports.length === 0 ? (
                <View
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
                >
                    <Text className="text-4xl mb-2 opacity-50">📝</Text>
                    <Text className="font-medium text-gray-500">No reports found</Text>
                    <Text className="text-xs text-gray-400">Issues you report will appear here</Text>
                </View>
            ) : (
                <View className="gap-3">
                    {reports.map(report => {
                        const style = getStatusStyle(report.status);
                        return (
                            <TouchableOpacity
                                key={report.id}
                                onPress={() => router.push('/(app)/reports')}
                                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
                            >
                                <View className="flex-row items-center gap-3 flex-1 mr-2">
                                    <View className="w-8 h-8 bg-white dark:bg-neutral-800 rounded-full items-center justify-center border border-gray-100 dark:border-neutral-700">
                                        <Text className="text-sm">{getIcon(report.category)}</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                                            {report.title}
                                        </Text>
                                        <Text className="text-xs text-gray-500 dark:text-neutral-400">
                                            {new Date(report.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: style.bg }}>
                                    <Text className="text-xs font-medium" style={{ color: style.text }}>
                                        {style.label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}
