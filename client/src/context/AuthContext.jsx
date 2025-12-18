import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userCommunities, setUserCommunities] = useState([]);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to set active community
  const selectCommunity = (communityId, communitiesList = userCommunities) => {
      const selected = communitiesList.find(c => c.community_id === communityId) || communitiesList[0];
      if (selected) {
          setActiveCommunity(selected);
          localStorage.setItem('active_community_id', selected.community_id);
      }
      return selected;
  };

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
                setUser({ ...data.user, token }); 
                
                // Handle Communities
                const communities = data.communities || [];
                setUserCommunities(communities);

                // Restore active community
                const savedCommunityId = localStorage.getItem('active_community_id');
                selectCommunity(savedCommunityId, communities);

            } else {
                // If token is invalid or expired (401), remove it
                localStorage.removeItem('token');
                setUser(null);
            }
        } catch (error) {
            console.error("Session verification failed:", error);
            localStorage.removeItem('token');
            setUser(null);
        }
      }
      setLoading(false);
    };

    checkUserLoggedIn();
  }, []);

  // Global Fetch Interceptor
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        let [resource, config] = args;
        
        // Inject Header if activeCommunity exists
        // Note: We need a way to access the *current* activeCommunity value inside this closure
        // But useEffect closure might be stale.
        // Best practice: Use a ref or read from localStorage directly for the header if state is tricky.
        // Let's rely on localStorage as the source of truth for the request header to avoid stale closure issues.
        
        const currentActiveId = localStorage.getItem('active_community_id');
        const token = localStorage.getItem('token');
        
        config = config || {};
        config.headers = config.headers || {};

        // Handle Headers object vs plain object
        const setHeader = (key, value) => {
            if (config.headers instanceof Headers) {
                config.headers.set(key, value);
            } else {
                config.headers[key] = value;
            }
        };

        if (currentActiveId) {
            setHeader('X-Community-ID', currentActiveId);
        }

        if (token) {
             // Only add if not already present (optional, but good practice to allow override)
             // Or just always add/overwrite to ensure it's fresh.
             // Notices.jsx adds it manually. If we add it here, it might duplicate if using append on Headers object.
             // set on Headers overwrites. Plain object overwrites.
             setHeader('Authorization', `Bearer ${token}`);
        }

        args = [resource, config];

        const response = await originalFetch(...args);

        if (response.status === 401) {
            console.warn("Session expired (401). Redirecting to login.");
            localStorage.removeItem('token');
            setUser(null);
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
        window.fetch = originalFetch;
    };
  }, []); // Empty dependency array ensures we only monkey-patch once. Using localStorage avoids stale state.

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
      
      // Update Communities
      const communities = data.communities || [];
      setUserCommunities(communities);
      
      // Set Active Community
      selectCommunity(null, communities); // Defaults to first if null

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('active_community_id');
    setUser(null);
    setUserCommunities([]);
    setActiveCommunity(null);
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
        const updatedUser = { ...user, ...data.user, user_metadata: { ...user.user_metadata, ...userData } };
        
        setUser(updatedUser);
        return updatedUser;
    } catch (error) {
        console.error("Update profile error:", error);
        throw error;
    }
  };

  const switchCommunity = (communityId) => {
      selectCommunity(communityId);
      // Reload to ensure all components fetch fresh data
      window.location.reload(); 
  };

  const value = {
    user,
    userCommunities,
    activeCommunity,
    switchCommunity,
    login,
    logout,
    updateProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
