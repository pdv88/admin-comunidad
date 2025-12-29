import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import GlassSelect from '../components/GlassSelect';
import ModalPortal from '../components/ModalPortal';
import GlassLoader from '../components/GlassLoader';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [blocks, setBlocks] = useState([]); // For assignment
    const [loading, setLoading] = useState(true);
    const [newUser, setNewUser] = useState({ email: '', fullName: '', roleName: 'neighbor', unitIds: [] });
    const [selectedBlockId, setSelectedBlockId] = useState(''); // New state for block filter
    const [toast, setToast] = useState({ message: '', type: 'success' }); // Changed from message string
    const [editingUser, setEditingUser] = useState(null); // User being edited
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const { t } = useTranslation();
    const { user } = useAuth();

    const handleEditClick = (user) => {
        setEditingUser({
            id: user.id,
            email: user.email, // Email is typically not editable here, just for display
            fullName: user.full_name,
            roleName: user.roles?.name || 'neighbor',
            unitIds: user.unit_owners ? user.unit_owners.map(uo => uo.unit_id) : []
        });
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        // setMessage(t('user_management.messages.deleting', 'Deleting user...'));
        try {
            const res = await fetch(`${API_URL}/api/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                }
            });
            const data = await res.json();
            if (res.ok) {
                setToast({ message: t('user_management.messages.delete_success', 'User deleted successfully'), type: 'success' });
                fetchData();
            } else {
                setToast({ message: t('user_management.messages.error_prefix') + data.error, type: 'error' });
            }
        } catch (error) {
            setToast({ message: t('user_management.messages.delete_error', 'Error deleting user'), type: 'error' });
        } finally {
            setDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        // setMessage(t('user_management.messages.updating'));
        try {
            const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: editingUser.fullName,
                    roleName: editingUser.roleName,
                    unitIds: editingUser.unitIds
                })
            });
            const data = await res.json();
            if (res.ok) {
                setToast({ message: t('user_management.messages.update_success'), type: 'success' });
                setEditingUser(null);
                fetchData();
            } else {
                setToast({ message: t('user_management.messages.error_prefix') + data.error, type: 'error' });
            }
        } catch (error) {
            setToast({ message: t('user_management.messages.update_error'), type: 'error' });
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, blocksRes] = await Promise.all([
                fetch(`${API_URL}/api/users`),
                fetch(`${API_URL}/api/properties/blocks`)
            ]);
            const usersData = await usersRes.json();
            setUsers(Array.isArray(usersData) ? usersData : []); // Safety check
            
            const blocksData = await blocksRes.json();
            // Flatten units for dropdown
            setBlocks(blocksData); 
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        // setMessage(t('user_management.messages.sending_invite')); // Optional: Show loading toast or spinner
        try {
            const res = await fetch(`${API_URL}/api/users/invite`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if (res.ok) {
                setToast({ message: t('user_management.messages.invite_success'), type: 'success' });
                setNewUser({ email: '', fullName: '', roleName: 'neighbor', unitIds: [] });
                fetchData();
            } else {
                setToast({ message: t('user_management.messages.error_prefix') + data.error, type: 'error' });
            }
        } catch (error) {
            setToast({ message: t('user_management.messages.invite_error'), type: 'error' });
        }
    };

    // Helper to get available units
    // For new user (excludeUserId = null): Show only unassigned units
    // For editing user: Show unassigned units + units assigned to THIS user
    const getAvailableUnits = (excludeUserId = null, currentUserUnitIds = []) => {
        // 1. Collect all assigned unit IDs from all users
        const assignedUnitIds = new Set();
        users.forEach(u => {
            // If we are looking for available units for a specific user, 
            // we skip their own assignments so they remain in the list (as "assigned to them")
            if (u.id !== excludeUserId && u.unit_owners) {
                u.unit_owners.forEach(uo => assignedUnitIds.add(uo.unit_id));
            }
        });

        let allUnits = [];
        if (Array.isArray(blocks)) {
            blocks.forEach(b => {
                 if (b.units) {
                     b.units.forEach(u => allUnits.push({ ...u, blockName: b.name }));
                 }
            });
        }

        // 2. Filter
        // Include if it's NOT assigned to others OR matches one of our current units (to allow unchecking even if double assigned)
        return allUnits.filter(u => !assignedUnitIds.has(u.id) || currentUserUnitIds.includes(u.id));
    };

    if (loading) {
         return (
            <DashboardLayout>
                <GlassLoader />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Toast 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast({ ...toast, message: '' })} 
            />
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
                 {/* ... existing content ... */}
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('user_management.title')}</h1>
                </div>

                {/* Invite Form */}
                <div className="glass-card p-6 mb-8 relative z-20">
                    <h2 className="font-bold mb-4 dark:text-white">{t('user_management.invite.title')}</h2>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <input 
                            type="email" 
                            placeholder={t('user_management.invite.email')} 
                            className="glass-input"
                            value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder={t('user_management.invite.fullname')} 
                            className="glass-input"
                            value={newUser.fullName}
                            onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                            required
                        />

                        <GlassSelect 
                            value={newUser.roleName}
                            onChange={e => setNewUser({...newUser, roleName: e.target.value})}
                            options={[
                                { value: 'neighbor', label: t('user_management.roles.neighbor') },
                                { value: 'president', label: t('user_management.roles.president') },
                                { value: 'secretary', label: t('user_management.roles.secretary') },
                                { value: 'vice_president', label: t('user_management.roles.vice_president') },
                                { value: 'admin', label: t('user_management.roles.admin') },
                                { value: 'treasurer', label: t('user_management.roles.treasurer') },
                                { value: 'maintenance', label: t('user_management.roles.maintenance') }
                            ]}
                            placeholder={t('user_management.table.role')}
                        />

                        {/* Block Selection Dropdown */}
                        <GlassSelect
                            value={selectedBlockId}
                            onChange={(e) => {
                                setSelectedBlockId(e.target.value);
                                setNewUser({...newUser, unitIds: []}); // Reset unit when block changes
                            }}
                            options={[
                                { value: '', label: t('properties.select_block', 'Select Block') }, // Option to clear/default
                                ...(Array.isArray(blocks) ? blocks.map(block => ({ value: block.id, label: block.name })) : [])
                            ]}
                            placeholder={t('properties.select_block', 'Select Block')}
                        />

                        {/* Unit Selection Dropdown (Filtered) */}
                        <GlassSelect 
                            value={newUser.unitIds[0] || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setNewUser({...newUser, unitIds: val ? [val] : []});
                            }}
                            disabled={!selectedBlockId}
                            options={getAvailableUnits(null)
                                .filter(u => !selectedBlockId || u.blockName === blocks.find(b => b.id === selectedBlockId)?.name)
                                .map(u => ({ value: u.id, label: u.unit_number }))
                            }
                            placeholder={t('user_management.invite.assign_unit')}
                        />
                        <button type="submit" className="glass-button self-start">{t('user_management.invite.send')}</button>
                    </form>
                </div>

                {/* User List */}
                <div className="glass-card overflow-hidden">
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>{t('user_management.table.name')}</th>
                                <th>{t('user_management.table.role')}</th>
                                <th>{t('user_management.table.unit')}</th>
                                <th className="text-end">{t('user_management.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="font-medium text-gray-800 dark:text-neutral-200">{user.full_name}</td>
                                    <td>
                                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                                            {t(`user_management.roles.${user.roles?.name}`) !== `user_management.roles.${user.roles?.name}` ? t(`user_management.roles.${user.roles?.name}`) : user.roles?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        {user.unit_owners && user.unit_owners.length > 0 
                                            ? user.unit_owners.map(uo => uo.units ? uo.units.unit_number : '').join(', ') 
                                            : '-'}
                                    </td>
                                    <td className="text-end font-medium">
                                        <button 
                                            onClick={() => handleEditClick(user)}
                                            className="mr-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                            title={t('common.edit', 'Edit')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(user)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Edit User Modal */}
            {editingUser && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingUser(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-neutral-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                            {t('user_management.edit.title')}: {editingUser.fullName}
                                        </h3>
                                        <div className="mt-4">
                                            <form onSubmit={handleUpdateUser} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('user_management.table.name')}</label>
                                                    <input 
                                                        type="text" 
                                                        className="glass-input"
                                                        value={editingUser.fullName}
                                                        onChange={e => setEditingUser({...editingUser, fullName: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('user_management.table.role')}</label>
                                                    <select 
                                                        className="glass-input disabled:opacity-50 disabled:cursor-not-allowed"
                                                        value={editingUser.roleName}
                                                        onChange={e => setEditingUser({...editingUser, roleName: e.target.value})}
                                                        disabled={user?.user_metadata?.is_admin_registration !== true}
                                                    >
                                                        <option value="neighbor">{t('user_management.roles.neighbor')}</option>
                                                        <option value="president">{t('user_management.roles.president')}</option>
                                                        <option value="secretary">{t('user_management.roles.secretary')}</option>
                                                        <option value="vice_president">{t('user_management.roles.vice_president')}</option>
                                                        <option value="admin">{t('user_management.roles.admin')}</option>
                                                        <option value="treasurer">{t('user_management.roles.treasurer')}</option>
                                                        <option value="vocal">{t('user_management.roles.vocal')}</option>
                                                        <option value="maintenance">{t('user_management.roles.maintenance')}</option>
                                                    </select>
                                                    {user?.user_metadata?.is_admin_registration !== true && (
                                                        <p className="text-xs text-gray-500 mt-1 dark:text-neutral-400">{t('user_management.role_change_restricted', 'Only Super Admin can change roles.')}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('user_management.table.unit')}</label>
                                                    <div className="mt-1 border border-gray-300 dark:border-neutral-700 rounded-md p-2 h-48 overflow-y-auto bg-white dark:bg-neutral-900">
                                                        <div className="space-y-1">
                                                            {getAvailableUnits(editingUser.id, editingUser.unitIds || []).map(u => (
                                                                <label key={u.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded cursor-pointer">
                                                                    <input 
                                                                        type="checkbox"
                                                                        value={u.id}
                                                                        checked={editingUser.unitIds.includes(u.id)}
                                                                        onChange={e => {
                                                                            const id = u.id;
                                                                            let newIds;
                                                                            if (e.target.checked) {
                                                                                newIds = [...editingUser.unitIds, id];
                                                                            } else {
                                                                                newIds = editingUser.unitIds.filter(uid => uid !== id);
                                                                            }
                                                                            setEditingUser({...editingUser, unitIds: newIds});
                                                                        }}
                                                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                                    />
                                                                    <span className="text-sm text-gray-700 dark:text-neutral-300">{u.blockName} - {u.unit_number}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-4 space-x-3">
                                                    <button 
                                                        type="button" 
                                                        className="glass-button-secondary"
                                                        onClick={() => setEditingUser(null)}
                                                    >
                                                        {t('user_management.edit.cancel')}
                                                    </button>
                                                    <button 
                                                        type="submit" 
                                                        className="glass-button"
                                                    >
                                                        {t('user_management.edit.save')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('user_management.delete.title', 'Delete User')}
                message={t('user_management.delete.confirm', 'Are you sure you want to remove this user from the community? This action cannot be undone.')}
                confirmText={t('common.delete', 'Delete')}
                isDangerous={true}
            />
        </DashboardLayout>
    );
};

export default UserManagement;
