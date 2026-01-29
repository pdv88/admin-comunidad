import React from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';

const { width, height } = Dimensions.get('window');

export default function Welcome() {
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
                    top: -height * 0.15,
                    right: -width * 0.3,
                    width: width * 0.8,
                    height: width * 0.8,
                    borderRadius: width * 0.4,
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    bottom: -height * 0.1,
                    left: -width * 0.2,
                    width: width * 0.6,
                    height: width * 0.6,
                    borderRadius: width * 0.3,
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                }}
            />

            <SafeAreaView className="flex-1">
                <View className="flex-1 px-6 pt-12 pb-8">
                    {/* Logo Section */}
                    <View className="flex-1 items-center justify-center">
                        {/* Stacked Logo */}
                        <Image
                            source={require('../../assets/logos/habiio_logo_header_nobg_stacked.webp')}
                            style={{ width: 280, height: 140, marginBottom: 24 }}
                            resizeMode="contain"
                        />

                        {/* Tagline */}
                        <Text className="text-lg text-white/70 text-center font-medium">
                            Community management,{'\n'}simplified.
                        </Text>
                    </View>

                    {/* Features Section */}
                    <View className="flex-row justify-center gap-10 mb-12">
                        <View className="items-center">
                            <BlurView
                                intensity={40}
                                tint="dark"
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    marginBottom: 8,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)',
                                }}
                            >
                                <Ionicons name="shield-checkmark" size={26} color="#34d399" />
                            </BlurView>
                            <Text className="text-xs text-white/60 font-medium">Secure</Text>
                        </View>
                        <View className="items-center">
                            <BlurView
                                intensity={40}
                                tint="dark"
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    marginBottom: 8,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)',
                                }}
                            >
                                <Ionicons name="flash" size={26} color="#a78bfa" />
                            </BlurView>
                            <Text className="text-xs text-white/60 font-medium">Fast</Text>
                        </View>
                        <View className="items-center">
                            <BlurView
                                intensity={40}
                                tint="dark"
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    marginBottom: 8,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)',
                                }}
                            >
                                <Ionicons name="cloud" size={26} color="#60a5fa" />
                            </BlurView>
                            <Text className="text-xs text-white/60 font-medium">Cloud</Text>
                        </View>
                    </View>

                    {/* Buttons Section */}
                    <View className="gap-3">
                        {/* Sign In Button - Primary */}
                        <GlassButton
                            title="Sign In"
                            onPress={() => router.push('/(auth)/login')}
                            style={{ width: '100%' }}
                        />

                        {/* Create Account Button - Secondary */}
                        <GlassButton
                            title="Create Account"
                            variant="secondary"
                            onPress={() => router.push('/(auth)/register')}
                            style={{ width: '100%' }}
                        />
                    </View>

                    {/* Footer */}
                    <Text className="text-center text-white/40 text-xs mt-8">
                        By continuing, you agree to our Terms of Service
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
}
