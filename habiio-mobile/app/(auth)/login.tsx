import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Dimensions, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'react-native';
import { GlassButton } from '../../components/ui/GlassButton';

const { width, height } = Dimensions.get('window');

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            router.replace('/(app)/dashboard');
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials');
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
                            <Text className="text-3xl font-bold text-white">Welcome Back</Text>
                            <Text className="text-white/60 mt-2">Sign in to your account</Text>
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
                            {/* Email Input */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-white/70 mb-2">Email</Text>
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

                            {/* Password Input */}
                            <View className="mb-6">
                                <Text className="text-sm font-medium text-white/70 mb-2">Password</Text>
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
                                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />
                                    <TextInput
                                        className="flex-1 py-4 px-3 text-white"
                                        placeholder="••••••••"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons
                                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                                            size={20}
                                            color="rgba(255,255,255,0.5)"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Sign In Button */}
                            <GlassButton
                                title="Sign In"
                                onPress={handleLogin}
                                loading={loading}
                                style={{ width: '100%' }}
                            />

                            {/* Forgot Password */}
                            <TouchableOpacity className="mt-4 items-center" onPress={() => router.push('/(auth)/forgot-password')}>
                                <Text className="text-white/50 text-sm">Forgot password?</Text>
                            </TouchableOpacity>
                        </BlurView>

                        {/* Sign Up Link */}
                        <View className="flex-row justify-center mt-8">
                            <Text className="text-white/50">Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                                <Text className="text-purple-400 font-semibold">Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
