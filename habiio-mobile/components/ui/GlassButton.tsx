import React from 'react';
import { Text, ActivityIndicator, View, StyleSheet, Pressable, PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface GlassButtonProps extends PressableProps {
    title: string;
    variant?: 'primary' | 'secondary';
    icon?: keyof typeof Ionicons.glyphMap;
    loading?: boolean;
    className?: string; // For Tailwind classes if used
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    title,
    variant = 'primary',
    icon,
    loading = false,
    className,
    disabled,
    style,
    ...props
}) => {
    const isDisabled = !!(disabled || loading);

    // Primary Style (Gradient)
    if (variant === 'primary') {
        const gradientColors: [string, string, ...string[]] = ['#8b5cf6', '#6366f1', '#3b82f6']; // purple-500, indigo-500, blue-500
        const disabledColors: [string, string, ...string[]] = ['#94a3b8', '#cbd5e1'];

        return (
            <Pressable
                disabled={isDisabled}
                className={className}
                style={({ pressed }) => [
                    styles.container,
                    style as any, // Cast to avoid TS complexity with Pressable style union
                    pressed && { opacity: 0.8 },
                    isDisabled && { opacity: 0.7 }
                ]}
                {...props}
            >
                <LinearGradient
                    colors={isDisabled ? disabledColors : gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradient, isDisabled && styles.disabled]}
                >
                    {loading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <View style={styles.content}>
                            {icon && <Ionicons name={icon} size={18} color="white" style={styles.icon} />}
                            <Text style={styles.textPrimary}>{title}</Text>
                        </View>
                    )}
                </LinearGradient>
            </Pressable>
        );
    }

    // Secondary Style (Transparent with white border - for dark themes)
    return (
        <Pressable
            disabled={isDisabled}
            className={className}
            style={({ pressed }) => [
                styles.secondaryButton,
                isDisabled && styles.disabledSecondary,
                style as any,
                pressed && { opacity: 0.7 },
                isDisabled && { opacity: 0.7 }
            ]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color="white" size="small" />
            ) : (
                <View style={styles.content}>
                    {icon && <Ionicons name={icon} size={18} color="white" style={styles.icon} />}
                    <Text style={[styles.textSecondary, isDisabled && { color: 'rgba(255,255,255,0.5)' }]}>{title}</Text>
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 9999, // rounded-full
        shadowColor: '#8b5cf6', // purple-500
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    gradient: {
        paddingVertical: 12, // py-3 (approx)
        paddingHorizontal: 24, // px-6
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)', // white border at 40%
        paddingVertical: 16, // Match primary visual
        paddingHorizontal: 24,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8, // gap-x-2
    },
    icon: {
        marginRight: 6,
    },
    textPrimary: {
        color: 'white',
        fontWeight: '600', // font-semibold
        fontSize: 16,
        textAlign: 'center',
    },
    textSecondary: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    disabled: {
        // Opacity handled in Pressable style
    },
    disabledSecondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
});
