import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WelcomeWidget from '@/components/dashboard/WelcomeWidget';
import RecentNoticesWidget from '@/components/dashboard/RecentNoticesWidget';
import ActivePollsWidget from '@/components/dashboard/ActivePollsWidget';
import ActiveCampaignsWidget from '@/components/dashboard/ActiveCampaignsWidget';
import RecentReportsWidget from '@/components/dashboard/RecentReportsWidget';
import BilledVsCollectedWidget from '@/components/dashboard/BilledVsCollectedWidget';
import { useAuth } from '@/context/AuthContext';
import { ScreenBackground } from '@/components/ui/ScreenBackground';

export default function DashboardScreen() {
    const { activeCommunity } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    // Key to force re-render components when community changes
    const communityKey = activeCommunity?.community_id || 'default';

    if (!activeCommunity) {
        return (
            <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        // Simulate refresh - normally trigger re-fetch in widgets
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    return (
        <View className="flex-1">
            <ScreenBackground />

            <SafeAreaView edges={['top']} className="flex-1">
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <View key={communityKey} className="gap-2">
                        {/* 0. Notices Bar */}
                        <RecentNoticesWidget />

                        {/* 1. Welcome Section */}
                        <WelcomeWidget />

                        {/* Financial Chart (Admin/President/Treasurer only) */}
                        <BilledVsCollectedWidget />

                        {/* 2. Stacked Widgets */}
                        <ActivePollsWidget />

                        <ActiveCampaignsWidget />

                        <RecentReportsWidget />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
