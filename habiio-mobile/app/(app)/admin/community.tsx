import React from 'react';
import { View, Text } from 'react-native';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function CommunitySettingsScreen() {
    return (
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'president']}>
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-lg font-bold">Community Settings</Text>
                <Text className="text-gray-500">Coming Soon</Text>
            </View>
        </ProtectedRoute>
    );
}
