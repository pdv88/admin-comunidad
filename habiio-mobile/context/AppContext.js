import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext({
    colorScheme: 'light',
    isDarkMode: false,
    userPreferredScheme: 'system',
    setColorSchemePreference: () => { },
    toggleDarkMode: () => { },
    language: 'en',
    isSpanish: false,
    setLanguagePreference: () => { },
    toggleLanguage: () => { },
    supportedLanguages: ['en', 'es'],
});

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    const deviceColorScheme = useDeviceColorScheme();
    const [colorScheme, setColorScheme] = useState(deviceColorScheme || 'light');
    const [userPreferredScheme, setUserPreferredScheme] = useState('system');
    const [language, setLanguage] = useState('en');

    const isDarkMode = colorScheme === 'dark';
    const isSpanish = language === 'es';

    // Load saved settings in background
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedScheme = await AsyncStorage.getItem('color_scheme_preference');
                const savedLanguage = await AsyncStorage.getItem('language_preference');

                if (savedScheme) {
                    setUserPreferredScheme(savedScheme);
                    if (savedScheme !== 'system') {
                        setColorScheme(savedScheme);
                    }
                } else if (deviceColorScheme) {
                    setColorScheme(deviceColorScheme);
                }

                if (savedLanguage) {
                    setLanguage(savedLanguage);
                }
            } catch (e) {
                console.warn('Failed to load settings', e);
            }
        };
        loadSettings();
    }, []);

    // Sync with system theme if preference is 'system'
    useEffect(() => {
        if (userPreferredScheme === 'system' && deviceColorScheme) {
            setColorScheme(deviceColorScheme);
        }
    }, [deviceColorScheme, userPreferredScheme]);

    const setColorSchemePreference = async (pref) => {
        setUserPreferredScheme(pref);
        if (pref !== 'system') {
            setColorScheme(pref);
        } else {
            setColorScheme(deviceColorScheme || 'light');
        }
        await AsyncStorage.setItem('color_scheme_preference', pref);
    };

    const setLanguagePreference = async (lang) => {
        setLanguage(lang);
        await AsyncStorage.setItem('language_preference', lang);
    };

    const toggleDarkMode = () => {
        const newScheme = colorScheme === 'dark' ? 'light' : 'dark';
        setColorSchemePreference(newScheme);
    };

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'es' : 'en';
        setLanguagePreference(newLang);
    };

    const value = {
        colorScheme,
        isDarkMode,
        userPreferredScheme,
        setColorSchemePreference,
        toggleDarkMode,
        language,
        isSpanish,
        setLanguagePreference,
        toggleLanguage,
        supportedLanguages: ['en', 'es'],
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
