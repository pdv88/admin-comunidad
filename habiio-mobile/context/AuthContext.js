import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';

// Make sure to replace with your actual API URL
// For Android Emulator use 10.0.2.2, for iOS Simulator use localhost
import { Platform } from 'react-native';

import { API_URL } from '../constants/Config';

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.timeout = 10000; // 10 seconds timeout

// SecureStore is not available on web, so we use AsyncStorage as a fallback
const setToken = async (token) => {
    if (Platform.OS === 'web') {
        await AsyncStorage.setItem('token', token);
    } else {
        await SecureStore.setItemAsync('token', token);
    }
};

const getToken = async () => {
    if (Platform.OS === 'web') {
        return await AsyncStorage.getItem('token');
    } else {
        return await SecureStore.getItemAsync('token');
    }
};

const deleteToken = async () => {
    if (Platform.OS === 'web') {
        await AsyncStorage.removeItem('token');
    } else {
        await SecureStore.deleteItemAsync('token');
    }
};

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userCommunities, setUserCommunities] = useState([]);
    const [activeCommunity, setActiveCommunity] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper to set active community
    const selectCommunity = async (communityId, communitiesList = userCommunities) => {
        const selected = communitiesList.find(c => c.community_id === communityId) || communitiesList[0];

        if (selected) {
            setActiveCommunity(selected);
            await AsyncStorage.setItem('active_community_id', selected.community_id);
        }
        return selected;
    };

    useEffect(() => {
        const checkUserLoggedIn = async () => {
            try {
                const token = await SecureStore.getItemAsync('token');

                if (token) {
                    const response = await axios.get(`/api/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.status === 200) {
                        const data = response.data;
                        setUser({ ...data.user, token });

                        // Handle Communities
                        const communities = data.communities || [];
                        setUserCommunities(communities);

                        // Restore active community
                        const savedCommunityId = await AsyncStorage.getItem('active_community_id');
                        selectCommunity(savedCommunityId, communities);

                    } else {
                        await logout(false);
                    }
                }
            } catch (error) {
                console.error("Session verification failed:", error);
                await logout(false);
            } finally {
                setLoading(false);
            }
        };

        checkUserLoggedIn();
    }, []);

    // Axios Interceptor
    useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use(
            async (config) => {
                const token = await getToken();
                const currentActiveId = await AsyncStorage.getItem('active_community_id');

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                if (currentActiveId) {
                    config.headers['X-Community-ID'] = currentActiveId;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                // NOTE: Automatic logout on 401 disabled to prevent navigation crashes.
                // Components should handle 401 errors gracefully by checking error.response.status
                // and showing an appropriate message or refresh option.
                // The user will be logged out when they manually refresh or navigate.
                if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
                    console.warn('Session expired - 401 received');
                    // Don't auto-logout - let components handle this gracefully
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axios.post(`/api/auth/login`, { email, password });
            const data = response.data;

            await setToken(data.token);

            setUser(data.user);

            const communities = data.communities || [];
            setUserCommunities(communities);

            // Set Active Community
            await selectCommunity(null, communities);

            return data;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = async (shouldRedirect = true) => {
        await deleteToken();
        await AsyncStorage.removeItem('active_community_id');
        setUser(null);
        setUserCommunities([]);
        setActiveCommunity(null);
        // Navigation is now handled by useProtectedRoute hook in _layout based on user state
    };

    const switchCommunity = async (communityId) => {
        await selectCommunity(communityId);
        // In web we reload, in mobile we might just need to trigger re-renders or navigate
        // For now, state update should suffice if data is re-fetched via hooks reliant on activeCommunity
    };

    // Helper function to check if user has a specific role
    const hasRole = (roleName) => {
        const roles = activeCommunity?.roles || [];
        return roles.some(r => r.name === roleName);
    };

    const hasAnyRole = (rolesInput) => {
        const roles = activeCommunity?.roles || [];
        const rolesToCheck = Array.isArray(rolesInput) ? rolesInput : [rolesInput];
        return roles.some(r => rolesToCheck.includes(r.name));
    };

    const value = {
        user,
        userCommunities,
        activeCommunity,
        switchCommunity,
        login,
        logout,
        loading,
        hasRole,
        hasAnyRole
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
