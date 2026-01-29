import React from 'react';
import { View, Platform, ViewProps, StyleSheet } from 'react-native';

interface GlassCardProps extends ViewProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'outer' | 'inner';
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, className, variant = 'outer', ...props }) => {
    // User requested different rounding for nested cards to handle padding
    // Outer: rounded-3xl (24px), bg-white/70 (Container)
    // Inner: rounded-xl (12px), bg-white/50 (Nested Item)

    const isAndroid = Platform.OS === 'android';

    // iOS uses native shadows, Android uses different styling for depth
    const baseClass = isAndroid
        ? 'border border-gray-200/80' // Thin border on Android for refined depth
        : 'border border-white/60 shadow-md';

    const variantStyle = variant === 'outer'
        ? "rounded-3xl"
        : "rounded-xl";

    // Android-specific background for better visual appearance
    const androidStyles = isAndroid ? {
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // More opaque on Android
        borderColor: 'rgba(209, 213, 219, 0.8)', // gray-300 with opacity
    } : {};

    // iOS semi-transparent background
    const iosBackgroundClass = !isAndroid
        ? (variant === 'outer' ? 'bg-white/80' : 'bg-white/60')
        : '';

    return (
        <View
            className={`${baseClass} ${variantStyle} ${iosBackgroundClass} ${className || ''}`}
            {...props}
            style={[
                style,
                isAndroid && androidStyles,
                // Add subtle shadow effect on iOS
                !isAndroid && styles.iosShadow,
            ]}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    iosShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
});
