import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
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
    // In a real app, this would be an API call to PUT /api/auth/me
    // For now, we update local state and localStorage
    try {
        const updatedUser = { ...user, user_metadata: { ...user.user_metadata, ...userData } };
        setUser(updatedUser);
        // If we were using a real JWT, we'd need a new token or verify the backend handles the update
        // For this mock/MVP, updating state is enough for the UI to reflect changes
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
