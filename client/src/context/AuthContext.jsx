import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      // 1. Check for Hash Fragment (Supabase Redirect)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1)); // remove #
        const accessToken = params.get('access_token');
        if (accessToken) {
            localStorage.setItem('token', accessToken);
            // Optional: clean URL
            window.history.replaceState(null, '', window.location.pathname);
        }
      }

      const token = localStorage.getItem('token');
      if (token) {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setUser({ ...data.user, token }); // Ensure token is kept in user object if needed
            } else {
                // If token is invalid or expired (401), remove it
                localStorage.removeItem('token');
                setUser(null);
            }
        } catch (error) {
            console.error("Session verification failed:", error);
            // On network error, maybe keep user logged in or not? 
            // Safer to clear if we can't verify, or keep generic error.
            // For now, assuming if verification fails, we logout.
            localStorage.removeItem('token');
            setUser(null);
        }
      }
      setLoading(false);
    };

    checkUserLoggedIn();
  }, []);

  // Global Fetch Interceptor for 401
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            console.warn("Session expired (401). Redirecting to login.");
            localStorage.removeItem('token');
            setUser(null);
            // Optional: window.location.href = '/login'; 
            // Setting user to null should trigger re-render and Router should redirect if protected
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
        window.fetch = originalFetch;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (userData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update profile');
        }

        const data = await response.json();
        // Update local user state with the returned updated user data
        // We merge existing user state with new metadata to be safe, though backend returns some structure
        const updatedUser = { ...user, ...data.user, user_metadata: { ...user.user_metadata, ...userData } };
        
        setUser(updatedUser);
        return updatedUser;
    } catch (error) {
        console.error("Update profile error:", error);
        throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    updateProfile, // Add updateProfile to context
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
