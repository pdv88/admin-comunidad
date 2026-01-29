import React from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, ModalProps, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassModalProps extends ModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const GlassModal: React.FC<GlassModalProps> = ({
    visible,
    onClose,
    children,
    ...props
}) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
            {...props}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        {/* Backdrop Touch to Close */}
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={onClose}
                        />

                        {/* Modal Content */}
                        <View onStartShouldSetResponder={() => true} style={styles.modalContainer}>
                            <View style={styles.glassPanel}>
                                {children}
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark overlay
        justifyContent: 'center',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    glassPanel: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Nearly opaque white as per image
        borderRadius: 32, // Large rounded corners
        padding: 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    }
});
