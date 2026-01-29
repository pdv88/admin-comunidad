import React from 'react';
import { TextInput, View, Text, TextInputProps, StyleSheet } from 'react-native';

interface GlassInputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
    label,
    error,
    containerClassName,
    style,
    ...props
}) => {
    return (
        <View className={containerClassName}>
            {label && (
                <Text style={styles.label}>
                    {label}
                </Text>
            )}
            <TextInput
                style={[
                    styles.input,
                    props.multiline && styles.textArea,
                    error ? styles.errorInput : null,
                    style
                ]}
                placeholderTextColor="#9ca3af" // gray-400
                {...props}
            />
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 14, // text-sm
        fontWeight: '600', // font-semibold
        color: '#374151', // text-gray-700
        marginBottom: 8, // mb-2
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#f3f4f6', // gray-100 (Light background as per image)
        borderRadius: 9999, // rounded-full (Pill shape)
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1f2937', // gray-900
        borderWidth: 1,
        borderColor: 'transparent',
    },
    textArea: {
        borderRadius: 24, // Rounded rect for multiline
        textAlignVertical: 'top', // For Android multiline
        minHeight: 120,
    },
    errorInput: {
        borderColor: '#ef4444', // red-500
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    }
});
