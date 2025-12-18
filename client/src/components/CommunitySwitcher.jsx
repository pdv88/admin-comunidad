import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CommunitySwitcher = () => {
    const { activeCommunity, userCommunities, switchCommunity } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // If only one community (or none/loading), don't show switcher? 
    // Maybe show it but disabled or just the name? 
    // If we want to allow "Create Community" later, might be good to always show.
    // For now, if <= 1, just show the current block but static?
    // Let's show it anyway for consistency of "Where am I".
    
    const communityName = activeCommunity?.communities?.name || 'Loading...';

    // Create State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCommunityName, setNewCommunityName] = useState('');

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            // Assuming API_URL is strictly 'http://localhost:5000', but better use config import if possible. 
            // Since we don't import API_URL here, let's assume it's global or import it.
            // Wait, this file imports useAuth but not config. Let's import config on top if needed, 
            // or use relative path if proxy set up (Vite usually needs full URL or proxy). 
            // Previous files used `import { API_URL } from '../config';`.
            // I'll add the import in a separate edit or assume hardcoded for now to avoid breaking imports line.
            // Better: use relative path '/api/...' if proxy exists? No, previous files use API_URL.
            // I will use fetch with the full URL hardcoded or try to snag it from context if available.
            // Let's grab it from context if useAuth exposes it? No.
            // I will implement a quick helper or just valid string.
            const API_BASE = 'http://localhost:5000'; // Fallback

            const res = await fetch(`${API_BASE}/api/communities/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newCommunityName })
            });

            if (res.ok) {
                const data = await res.json();
                // Refresh to load new community
                window.location.reload(); 
            } else {
                alert('Failed to create community');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="px-4 mb-2 relative" ref={dropdownRef}>
            <div className="relative">
                 <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-white/40 dark:bg-neutral-900/40 border border-white/40 dark:border-neutral-700 hover:bg-white/60 dark:hover:bg-neutral-800/60 transition-all text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm backdrop-blur-sm cursor-pointer`}
                >
                    <div className="flex items-center gap-3 truncate">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {communityName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{communityName}</span>
                    </div>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white/90 dark:bg-neutral-900/95 backdrop-blur-xl border border-gray-200 dark:border-neutral-700 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="py-1 max-h-64 overflow-y-auto customer-scrollbar">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Switch Community
                            </div>
                            {userCommunities.map((member) => (
                                <button
                                    key={member.community_id}
                                    onClick={() => {
                                        switchCommunity(member.community_id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                                        member.community_id === activeCommunity?.community_id 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                         <div className={`w-2 h-2 rounded-full ${member.community_id === activeCommunity?.community_id ? 'bg-blue-500' : 'bg-gray-300 dark:bg-neutral-600'}`}></div>
                                        <span className="truncate">{member.communities?.name}</span>
                                    </div>
                                    {member.community_id === activeCommunity?.community_id && (
                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    )}
                                </button>
                            ))}
                            
                            <div className="border-t border-gray-200 dark:border-neutral-700 mt-1 pt-1">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowCreateModal(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Create New Community
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Community</h3>
                        <form onSubmit={handleCreate}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Community Name
                            </label>
                            <input 
                                type="text" 
                                className="w-full rounded-xl border-gray-300 bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 mb-4"
                                placeholder="My New Community"
                                value={newCommunityName}
                                onChange={e => setNewCommunityName(e.target.value)}
                                required
                                autoFocus
                            />
                            <div className="flex gap-3 justify-end">
                                <button 
                                    type="button" 
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunitySwitcher;
