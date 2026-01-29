import { useEffect } from 'react';
import { useSegments, router, useRootNavigationState } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export function useProtectedRoute() {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        // Don't navigate if auth is still loading
        if (loading) return;

        // Don't navigate if navigation state isn't ready
        if (!navigationState?.key) return;

        const inAuthGroup = segments[0] === '(auth)';

        // Use setTimeout to defer navigation to after the current render cycle
        // This prevents "Couldn't find a navigation context" errors
        const timeoutId = setTimeout(() => {
            try {
                if (!user && !inAuthGroup) {
                    // Redirect to login if not authenticated and not in auth group
                    router.replace('/(auth)/login');
                } else if (user && inAuthGroup) {
                    // Redirect to dashboard if authenticated but in auth group
                    router.replace('/(app)/dashboard');
                }
            } catch (e) {
                console.warn("Navigation failed inside protection hook", e);
            }
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [user, loading, segments, navigationState?.key]);
}
