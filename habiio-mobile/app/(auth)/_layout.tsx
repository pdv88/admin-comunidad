import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 400,
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: 'transparent' },
            }}
        >
            <Stack.Screen name="welcome" options={{ animation: 'none' }} />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
        </Stack>
    );
}
