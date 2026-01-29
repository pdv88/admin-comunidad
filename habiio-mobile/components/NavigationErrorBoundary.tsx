import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary to catch navigation context errors and prevent app crashes.
 * This is particularly useful when logout/navigation happens during render cycles.
 */
export class NavigationErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        // Catch all errors in this boundary - check type in render
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn('NavigationErrorBoundary caught error:', error.message);
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        // If the error was navigation-related, reset after a short delay
        // This allows the auth redirect to complete
        if (this.state.hasError && this.state.error) {
            const isNavError =
                this.state.error.message.includes('navigation context') ||
                this.state.error.message.includes('NavigationContainer');

            if (isNavError) {
                // Auto-reset after redirect should complete
                setTimeout(() => {
                    this.setState({ hasError: false, error: null });
                }, 500);
            }
        }
    }

    render() {
        if (this.state.hasError) {
            const error = this.state.error;
            const isNavError = error && (
                error.message.includes('navigation context') ||
                error.message.includes('NavigationContainer')
            );

            if (isNavError) {
                // Render fallback UI for nav errors - app should redirect to login
                return this.props.fallback || (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: 16 }}>
                        <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                            Redirecting...
                        </Text>
                    </View>
                );
            }

            // For non-navigation errors, re-throw by rendering null and letting parent handle
            // This is a limitation but better than crashing
            throw error;
        }

        return this.props.children;
    }
}
