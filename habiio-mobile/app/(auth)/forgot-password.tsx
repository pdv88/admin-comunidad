import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Dimensions, Platform, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';

import { API_URL } from '../../constants/Config';

const { width, height } = Dimensions.get('window');

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [sent, setSent] = useState(false);

    // Cooldown timer
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (cooldown > 0) {
            interval = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [cooldown]);

    const handleSubmit = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            setSent(true);
            setCooldown(60); // 60 seconds cooldown
            Alert.alert('Success', 'Password reset link sent! Please check your email.');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to send reset email');
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
                    top: -height * 0.1,
                    right: -width * 0.25,
                    width: width * 0.7,
                    height: width * 0.7,
                    borderRadius: width * 0.35,
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    bottom: -height * 0.05,
                    left: -width * 0.15,
                    width: width * 0.5,
                    height: width * 0.5,
                    borderRadius: width * 0.25,
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
                            <Text className="text-3xl font-bold text-white">Forgot Password?</Text>
                            <Text className="text-white/60 mt-2 text-center">
                                Enter your email and we'll send you a reset link
                            </Text>
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
                                padding: 24,
                            }}
                        >
                            {sent ? (
                                // Success state
                                <View className="items-center py-4">
                                    <View
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 32,
                                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: 16,
                                        }}
                                    >
                                        <Ionicons name="mail-open" size={32} color="#22c55e" />
                                    </View>
                                    <Text className="text-white text-lg font-semibold mb-2">Email Sent!</Text>
                                    <Text className="text-white/60 text-center mb-6">
                                        Check your inbox for the password reset link
                                    </Text>

                                    {/* Resend Button */}
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={loading || cooldown > 0}
                                        activeOpacity={0.8}
                                        style={{ opacity: cooldown > 0 ? 0.5 : 1 }}
                                    >
                                        <Text className="text-purple-400 font-medium">
                                            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {/* Email Input */}
                                    <View className="mb-6">
                                        <Text className="text-sm font-medium text-white/70 mb-2">Email Address</Text>
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
                                            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
                                            <TextInput
                                                className="flex-1 py-4 px-3 text-white"
                                                placeholder="name@company.com"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={email}
                                                onChangeText={setEmail}
                                                autoCapitalize="none"
                                                keyboardType="email-address"
                                            />
                                        </View>
                                    </View>

                                    {/* Submit Button */}
                                    <GlassButton
                                        title="Send Reset Link"
                                        onPress={handleSubmit}
                                        loading={loading}
                                        style={{ width: '100%' }}
                                    />
                                </>
                            )}
                        </BlurView>

                        {/* Back to Login Link */}
                        <View className="flex-row justify-center mt-8">
                            <Text className="text-white/50">Remember your password? </Text>
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
