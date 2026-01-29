import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing, StyleSheet, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import MobileCommunitySwitcher from './MobileCommunitySwitcher';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

export default function CustomDrawerContent(props: any) {
    const { user, hasRole, logout, activeCommunity } = useAuth();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
        }).start();
    }, []);

    const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('president');

    // Drawer Items Mapping
    const menuItems = [
        { title: 'Dashboard', route: '/(app)/dashboard', label: 'Dashboard' },
        { title: 'Community Info', route: '/(app)/community', label: 'Community Info' },
        { title: 'Notices', route: '/(app)/notices', label: 'Notices', role: ['admin', 'president', 'secretary'] },
        { title: 'Reports', route: '/(app)/reports', label: 'Reports' },
        { title: 'Voting', route: '/(app)/voting', label: 'Voting' },
        { title: 'Reservations', route: '/(app)/reservations', label: 'Reservations' },
        { title: 'Visitors', route: '/(app)/visitors', label: 'Visitors' },
    ];

    const adminItems = [
        { title: 'Properties', route: '/(app)/properties', label: 'Properties' },
        { title: 'Users', route: '/(app)/users', label: 'Users' },
        { title: 'Community Settings', route: '/(app)/admin/community', label: 'Community Settings' },
    ];

    const handleNavigate = (route: string) => {
        router.push(route as any);
        // props.navigation.closeDrawer(); // Optional: stay open or close? Web sidebar usually closes on mobile nav
    };

    const MenuItem = ({ item }: { item: any }) => {
        // Active check - Fix: normalize paths by removing groups like (app) for comparison
        const normalizePath = (p: string) => p.replace(/\/\([^)]+\)/g, '');
        const currentPath = normalizePath(pathname);
        const itemPath = normalizePath(item.route);

        const isActive = currentPath.includes(itemPath) || (itemPath.includes('dashboard') && currentPath === '/');

        if (isActive) {
            return (
                <TouchableOpacity
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#dbeafe', '#ede9fe']} // blue-100 to violet-100
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.activeMenuItem}
                    >
                        {/* Removed activeBorder as per screenshot */}
                        <Text style={styles.activeMenuTitle}>{item.label}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                onPress={() => handleNavigate(item.route)}
                activeOpacity={0.6}
                style={styles.menuItem}
            >
                <Text style={styles.menuTitle}>{item.label}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={{ flex: 1, paddingRight: 0 }}>
            {/* 
                Floating Sidebar Container 
                - Margins for "floating" look.
                - Rounded Right Corners (3xl ~ 24px-32px).
                - Overflow hidden to clip the blur/tint.
            */}
            <View style={{
                flex: 1,
                marginTop: insets.top, // Use safe area for top margin
                marginBottom: insets.bottom + 10, // Extra margin at bottom
                borderTopRightRadius: 32,
                borderBottomRightRadius: 32,
                overflow: 'hidden',
                marginRight: 0, // Ensure it aligns if needed, though drawer usually handles this
                backgroundColor: 'transparent'
            }}>
                {/* Main Background Blur 
                    Intensity 90.
                */}
                <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />

                {/* Layer 2: White Tint (Middle)
                    Set to 0.95: "Solid Frost" look.
                */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.95)' }]} />

                <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 20 }}>
                    <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>

                        {/* Header */}
                        <View style={[styles.header, { marginTop: 0 }]}>
                            <View style={styles.logoContainer}>
                                <Image
                                    source={require('../assets/images/icon.png')}
                                    style={{ width: 32, height: 32, resizeMode: 'contain' }}
                                />
                                <Text style={styles.logoText}>habiio</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => props.navigation.closeDrawer()}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <MobileCommunitySwitcher />

                        <Animated.View style={{ opacity: fadeAnim, marginTop: 16 }}>
                            {/* Main Menu - Scrollable area */}
                            <View style={styles.navGroup}>
                                {menuItems.map((item, index) => (
                                    <MenuItem key={index} item={item} />
                                ))}
                            </View>

                            {/* Admin Menu */}
                            {isAdmin && (
                                <>
                                    <View style={styles.divider}>
                                        <View style={styles.dividerLine} />
                                        <Text style={styles.dividerText}>Administration</Text>
                                    </View>
                                    <View style={styles.navGroup}>
                                        {adminItems.map((item, index) => (
                                            <MenuItem key={index} item={item} />
                                        ))}
                                    </View>
                                </>
                            )}
                        </Animated.View>
                    </View>
                </DrawerContentScrollView>

                {/* Sticky Footer */}
                <View style={[styles.footer, { paddingBottom: 16 }]}>
                    {/* Glass card effect for profile */}
                    <View style={[styles.profileCardBlur, { borderRadius: 24, overflow: 'hidden' }]}>
                        {/* Layer 1: Blur */}
                        <BlurView
                            intensity={60}
                            tint="light"
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Layer 2: Tint */}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />

                        {/* Layer 3: Content */}
                        <View style={styles.profileContent}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(user?.profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.profileName} numberOfLines={1}>{user?.profile?.full_name || 'User'}</Text>
                                <Text style={styles.profileRole} numberOfLines={1}>
                                    {activeCommunity?.roles?.[0]?.name || 'Member'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => logout()}
                                style={styles.logoutButton}
                            >
                                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    glassBackground: {
        // ...StyleSheet.absoluteFillObject,
        // backgroundColor: 'rgba(255,255,255,0.4)',
        // No longer needed with real blur
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2563eb', // blue-600 mostly
        // Gradient text is hard in RN without libraries, solid color is safer
    },
    closeButton: {
        padding: 4,
    },
    navGroup: {
        gap: 4,
    },
    menuItem: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 9999, // full rounded
    },
    activeMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12, // Increased padding to match "pill" look better
        paddingHorizontal: 20,
        borderRadius: 9999,
        // Removed border width/color to match screenshot clean look
    },
    menuTitle: {
        fontSize: 15,
        color: '#4b5563', // gray-600
        fontWeight: '500',
    },
    activeMenuTitle: {
        fontSize: 15,
        color: '#2563eb', // blue-600 to match screenshot vibrancy
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        paddingHorizontal: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb', // gray-200
    },
    dividerText: {
        marginLeft: 8,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#9ca3af', // gray-400
        fontStyle: 'italic',
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        // borderTopWidth: 1,
        // borderTopColor: 'rgba(255,255,255,0.2)',
        // backgroundColor: 'rgba(255,255,255,0.5)',
    },
    profileCardBlur: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 6,
        paddingRight: 12,
        // backgroundColor: 'rgba(255,255,255,0.3)', // Removed as we handle it in the background layers now
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6', // Gradient fallback
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    profileName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    profileRole: {
        fontSize: 11,
        color: '#6b7280',
        textTransform: 'capitalize',
    },
    logoutButton: {
        padding: 8,
        backgroundColor: '#fef2f2',
        borderRadius: 20,
    }
});
