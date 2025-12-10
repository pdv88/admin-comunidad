export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

if (import.meta.env.PROD && API_URL.includes('localhost')) {
    console.warn('⚠️ PRODUCTION WARNING: API_URL is set to localhost. Please set VITE_API_URL environment variable in your deployment settings.');
}
