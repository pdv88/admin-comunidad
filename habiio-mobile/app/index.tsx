import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { router, useSegments } from 'expo-router';

export default function Index() {
    const { loading, user } = useAuth();
    const segments = useSegments();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.replace('/(app)/dashboard');
            } else {
                if (segments[0] === '(auth)' && segments[1] === 'welcome') {
                    // allow stay
                } else {
                    router.replace('/(auth)/welcome');
                }
            }
        }
    }, [loading, user]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
