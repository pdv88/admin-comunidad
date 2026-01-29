import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Animated, Easing, StyleSheet } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import MobileCommunitySwitcher from '../../../components/MobileCommunitySwitcher';
import { LinearGradient } from 'expo-linear-gradient';

export default function MenuScreen() {
    const { user, hasRole, logout, activeCommunity } = useAuth();

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            })
        ]).start();
    }, []);

    const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('president');

    // Sidebar Items Mapping
    const menuItems = [
        { title: 'Dashboard', icon: 'grid-outline', route: '/(app)/dashboard', color: '#2563eb' },
        { title: 'Community Info', icon: 'information-circle-outline', route: '/(app)/community', color: '#3b82f6' },
        { title: 'Notices', icon: 'megaphone-outline', route: '/(app)/notices', color: '#f59e0b', role: ['admin', 'president', 'secretary'] },
        { title: 'Reports', icon: 'alert-circle-outline', route: '/(app)/reports', color: '#ef4444' },
        { title: 'Voting', icon: 'stats-chart-outline', route: '/(app)/voting', color: '#ec4899' },
        { title: 'Reservations', icon: 'calendar-outline', route: '/(app)/reservations', color: '#8b5cf6' },
        { title: 'Visitors', icon: 'people-circle-outline', route: '/(app)/visitors', color: '#10b981' },
    ];

    const adminItems = [
        { title: 'Properties', icon: 'business-outline', route: '/(app)/properties', color: '#3b82f6' },
        { title: 'Users', icon: 'people-outline', route: '/(app)/users', color: '#6366f1' },
        { title: 'Community Settings', icon: 'settings-outline', route: '/(app)/admin/community', color: '#64748b' },
    ];

    const handleNavigate = (route: string) => {
        if (route) router.push(route as any);
    };

    const MenuItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => handleNavigate(item.route)}
            activeOpacity={0.7}
            style={styles.menuItem}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </TouchableOpacity>
    );

    return (
        <LinearGradient
            colors={['#f8fafc', '#e2e8f0']} // Light gray gradient
            style={styles.container}
        >
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        <Text style={styles.headerTitle}>Menu</Text>

                        {/* User Profile Card (Sidebar Footer Style) */}
                        <View style={styles.profileCard}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(user?.profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.profileName} numberOfLines={1}>{user?.profile?.full_name || 'User'}</Text>
                                <Text style={styles.profileRole} numberOfLines={1}>{activeCommunity?.role?.name || 'Member'}</Text>
                            </View>
                        </View>

                        <MobileCommunitySwitcher />
                    </Animated.View>

                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        {/* Main Menu */}
                        <Text style={styles.sectionHeader}>Navigation</Text>
                        <View style={styles.menuGroup}>
                            {menuItems.map((item, index) => (
                                <MenuItem key={index} item={item} />
                            ))}
                        </View>

                        {/* Admin Menu */}
                        {isAdmin && (
                            <>
                                <Text style={styles.sectionHeader}>Administration</Text>
                                <View style={styles.menuGroup}>
                                    {adminItems.map((item, index) => (
                                        <MenuItem key={index} item={item} />
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Logout */}
                        <TouchableOpacity
                            onPress={logout}
                            style={styles.logoutButton}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                            <Text style={styles.logoutText}>Sign Out</Text>
                        </TouchableOpacity>

                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </Animated.View>

                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    avatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    profileName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    profileRole: {
        fontSize: 12,
        color: '#6b7280',
        textTransform: 'capitalize',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: '#94a3b8',
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
    },
    menuGroup: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(243, 244, 246, 0.6)', // very light gray
        backgroundColor: 'transparent',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        marginTop: 32,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    logoutText: {
        color: '#dc2626',
        fontWeight: 'bold',
        fontSize: 16,
    },
    versionText: {
        textAlign: 'center',
        marginTop: 24,
        color: '#cbd5e1',
        fontSize: 12,
    }
});
