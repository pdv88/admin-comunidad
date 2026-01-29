import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';

import { API_URL } from '../../constants/Config';

const { width, height } = Dimensions.get('window');

// GlassInput component defined OUTSIDE to prevent re-renders
interface GlassInputProps {
    icon: any;
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    showToggle?: boolean;
    toggleValue?: boolean;
    onToggle?: () => void;
    keyboardType?: any;
    autoCapitalize?: any;
}

const GlassInput = ({
    icon,
    label,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    showToggle = false,
    toggleValue = false,
    onToggle = () => { },
    keyboardType = 'default',
    autoCapitalize = 'sentences'
}: GlassInputProps) => (
    <View className="mb-4">
        <Text className="text-sm font-medium text-white/70 mb-2">{label}</Text>
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                paddingHorizontal: 16,
            }}
        >
            <Ionicons name={icon} size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
                className="flex-1 py-4 px-3 text-white"
                placeholder={placeholder}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry && !toggleValue}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
            />
            {showToggle && (
                <TouchableOpacity onPress={onToggle}>
                    <Ionicons
                        name={toggleValue ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="rgba(255,255,255,0.5)"
                    />
                </TouchableOpacity>
            )}
        </View>
    </View>
);

export default function Register() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        communityName: '',
        communityAddress: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async () => {
        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (!formData.fullName || !formData.email || !formData.password || !formData.communityName) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/register`, {
                fullName: formData.fullName,
                email: formData.email,
                communityName: formData.communityName,
                communityAddress: formData.communityAddress,
                password: formData.password
            });

            Alert.alert('Success', 'Registration successful! Please login.');
            router.replace('/(auth)/login');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1">
            {/* Gradient Background */}
            <LinearGradient
                colors={['#1e3a5f', '#2d1b4e', '#1a1a2e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />

            {/* Decorative Circles */}
            <View
                style={{
                    position: 'absolute',
                    top: -height * 0.08,
                    right: -width * 0.2,
                    width: width * 0.6,
                    height: width * 0.6,
                    borderRadius: width * 0.3,
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    bottom: -height * 0.05,
                    left: -width * 0.1,
                    width: width * 0.4,
                    height: width * 0.4,
                    borderRadius: width * 0.2,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                }}
            />

            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Back Button */}
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ padding: 8, alignSelf: 'flex-start', marginBottom: 8 }}
                        >
                            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>

                        {/* Logo & Header */}
                        <View className="items-center mb-10">
                            <Image
                                source={require('../../assets/logos/habiio_logo_icon.png')}
                                style={{ width: 80, height: 80, marginBottom: 16 }}
                                resizeMode="contain"
                            />
                            <Text className="text-3xl font-bold text-white">Create Account</Text>
                            <Text className="text-white/60 mt-2">Register your community</Text>
                        </View>

                        {/* Form Card */}
                        <BlurView
                            intensity={25}
                            tint="dark"
                            style={{
                                borderRadius: 24,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.1)',
                                padding: 20,
                            }}
                        >
                            {/* Section: Personal Info */}
                            <Text className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">Personal Info</Text>

                            {/* Full Name Input */}
                            <GlassInput
                                icon="person-outline"
                                label="Full Name"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChangeText={(text) => handleChange('fullName', text)}
                            />

                            {/* Email Input */}
                            <GlassInput
                                icon="mail-outline"
                                label="Email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChangeText={(text) => handleChange('email', text)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {/* Section: Community */}
                            <Text className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 mt-2">Community</Text>

                            {/* Community Name Input */}
                            <GlassInput
                                icon="business-outline"
                                label="Community Name"
                                placeholder="Sunnyvale Residences"
                                value={formData.communityName}
                                onChangeText={(text) => handleChange('communityName', text)}
                            />

                            {/* Community Address Input */}
                            <GlassInput
                                icon="location-outline"
                                label="Community Address (Optional)"
                                placeholder="123 Main St"
                                value={formData.communityAddress}
                                onChangeText={(text) => handleChange('communityAddress', text)}
                            />

                            {/* Section: Security */}
                            <Text className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 mt-2">Security</Text>

                            {/* Password Input */}
                            <GlassInput
                                icon="lock-closed-outline"
                                label="Password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChangeText={(text) => handleChange('password', text)}
                                secureTextEntry
                                showToggle
                                toggleValue={showPassword}
                                onToggle={() => setShowPassword(!showPassword)}
                            />

                            {/* Confirm Password Input */}
                            <GlassInput
                                icon="shield-checkmark-outline"
                                label="Confirm Password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChangeText={(text) => handleChange('confirmPassword', text)}
                                secureTextEntry
                                showToggle
                                toggleValue={showConfirmPassword}
                                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                            />

                            {/* Sign Up Button */}
                            <GlassButton
                                title="Create Account"
                                onPress={handleRegister}
                                loading={loading}
                                style={{ width: '100%', marginTop: 8 }}
                            />
                        </BlurView>

                        {/* Sign In Link */}
                        <View className="flex-row justify-center mt-6">
                            <Text className="text-white/50">Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                <Text className="text-purple-400 font-semibold">Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
