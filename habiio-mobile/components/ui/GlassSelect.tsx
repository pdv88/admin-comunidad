import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export interface Option {
    label: string;
    value: string | number | null;
}

interface GlassSelectProps {
    label?: string;
    value: string | number | null;
    options: Option[];
    placeholder?: string;
    onSelect: (value: string | number | null) => void;
    disabled?: boolean;
    containerClassName?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
    label,
    value,
    options,
    placeholder = 'Select...',
    onSelect,
    disabled = false,
    containerClassName,
    searchable = false,
    searchPlaceholder = 'Search...',
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Reset search when modal closes
    useEffect(() => {
        if (!modalVisible) {
            setSearchQuery('');
        }
    }, [modalVisible]);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (val: string | number | null) => {
        onSelect(val);
        setModalVisible(false);
    };

    // Filter options based on search query
    const filteredOptions = searchable && searchQuery
        ? options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

    return (
        <View className={containerClassName}>
            {label && (
                <Text style={styles.label}>
                    {label}
                </Text>
            )}

            <TouchableOpacity
                onPress={() => !disabled && setModalVisible(true)}
                activeOpacity={0.7}
                style={[styles.input, disabled && styles.disabled]}
            >
                <Text style={[styles.valueText, !selectedOption && styles.placeholderText]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </TouchableOpacity>

            <Modal
                transparent
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />

                    <View style={styles.modalContainer}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.content}>
                            <Text style={styles.modalTitle}>{label || placeholder}</Text>

                            {/* Search Input */}
                            {searchable && (
                                <View style={styles.searchContainer}>
                                    <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder={searchPlaceholder}
                                        placeholderTextColor="#9ca3af"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <ScrollView style={{ maxHeight: searchable ? 250 : 300 }}>
                                {filteredOptions.length === 0 ? (
                                    <View style={styles.noResults}>
                                        <Text style={styles.noResultsText}>No results found</Text>
                                    </View>
                                ) : (
                                    filteredOptions.map((opt, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => handleSelect(opt.value)}
                                            style={[
                                                styles.option,
                                                value === opt.value && styles.selectedOption,
                                                idx === filteredOptions.length - 1 && { borderBottomWidth: 0 }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.optionText,
                                                value === opt.value && styles.selectedOptionText
                                            ]}>
                                                {opt.label}
                                            </Text>
                                            {value === opt.value && (
                                                <Ionicons name="checkmark" size={18} color="#2563eb" />
                                            )}
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.cancelButton}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#f3f4f6',
        borderRadius: 9999,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    disabled: {
        opacity: 0.6,
        backgroundColor: '#e5e7eb',
    },
    valueText: {
        fontSize: 16,
        color: '#1f2937',
    },
    placeholderText: {
        color: '#9ca3af',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        padding: 16,
        paddingBottom: 40,
    },
    modalContainer: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    content: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 24,
        marginBottom: 8,
        overflow: 'hidden',
    },
    modalTitle: {
        textAlign: 'center',
        padding: 16,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6b7280',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    option: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedOption: {
        backgroundColor: '#eff6ff', // blue-50
    },
    optionText: {
        fontSize: 16,
        color: '#1f2937',
    },
    selectedOptionText: {
        color: '#2563eb', // blue-600
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        borderRadius: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        padding: 0,
    },
    noResults: {
        padding: 24,
        alignItems: 'center',
    },
    noResultsText: {
        color: '#9ca3af',
        fontSize: 14,
    },
});
