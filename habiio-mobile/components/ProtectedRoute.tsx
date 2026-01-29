import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Redirect, router } from 'expo-router';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

// This component can be used to wrap content or as a check hook
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading, hasAnyRole } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        if (!hasAnyRole(allowedRoles)) {
            // Not authorized
            return (
                <View className="flex-1 justify-center items-center p-4">
                    <Text className="text-lg font-bold text-gray-900 mb-2">Access Denied</Text>
                    <Text className="text-gray-500 text-center mb-4">You do not have permission to view this screen.</Text>
                    <Text onPress={() => router.replace('/(app)/dashboard')} className="text-blue-600 font-bold">Go Home</Text>
                </View>
            );
        }
    }

    return children;
}
