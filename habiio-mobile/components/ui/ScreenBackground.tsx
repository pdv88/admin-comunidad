import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';

export const ScreenBackground = () => {
    const { isDarkMode } = useApp();

    if (isDarkMode) {
        return (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {/* Auth Screen Dark Gradient */}
                <LinearGradient
                    colors={['#1e3a5f', '#2d1b4e', '#1a1a2e']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </View>
        );
    }

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Base Color */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} />

            {/* The Gradient - Light Mode */}
            <LinearGradient
                colors={['rgba(219, 234, 254, 0.6)', 'rgba(243, 232, 255, 0.6)', 'rgba(252, 231, 243, 0.6)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
        </View>
    );
};
