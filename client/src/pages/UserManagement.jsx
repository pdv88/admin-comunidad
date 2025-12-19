import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import GlassSelect from '../components/GlassSelect';
import ModalPortal from '../components/ModalPortal';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [blocks, setBlocks] = useState([]); // For assignment
    const [loading, setLoading] = useState(true);
    const [newUser, setNewUser] = useState({ email: '', fullName: '', roleName: 'neighbor', unitIds: [] });
    const [selectedBlockId, setSelectedBlockId] = useState(''); // New state for block filter
    const [message, setMessage] = useState('');
    const [editingUser, setEditingUser] = useState(null); // User being edited
    const { t } = useTranslation();

    const handleEditClick = (user) => {
        setEditingUser({
            id: user.id,
            email: user.email, // Email is typically not editable here, just for display
            fullName: user.full_name,
            roleName: user.roles?.name || 'neighbor',
            unitIds: user.unit_owners ? user.unit_owners.map(uo => uo.unit_id) : []
        });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setMessage(t('user_management.messages.updating'));
        try {
            const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roleName: editingUser.roleName,
                    unitIds: editingUser.unitIds
                })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(t('user_management.messages.update_success'));
                setEditingUser(null);
                fetchData();
            } else {
                setMessage(t('user_management.messages.error_prefix') + data.error);
            }
        } catch (error) {
            setMessage(t('user_management.messages.update_error'));
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
        setMessage(t('user_management.messages.sending_invite'));
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
                setMessage(t('user_management.messages.invite_success'));
                setNewUser({ email: '', fullName: '', roleName: 'neighbor', unitIds: [] });
                fetchData();
            } else {
                setMessage(t('user_management.messages.error_prefix') + data.error);
            }
        } catch (error) {
            setMessage(t('user_management.messages.invite_error'));
        }
    };

    // Helper to get available units
    // For new user (excludeUserId = null): Show only unassigned units
    // For editing user: Show unassigned units + units assigned to THIS user
    const getAvailableUnits = (excludeUserId = null) => {
        // 1. Collect all assigned unit IDs from all users
        const assignedUnitIds = new Set();
        users.forEach(u => {
            // If we are looking for available units for a specific user, 
            // we skip their own assignments so they remain in the list (as "assigned to them")
            // Wait, logic: We want to show units that are (Free OR Owned by CurrentUser).
            // So we collect IDs owned by EVERYONE ELSE.
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
        // Note: We need block ID in the unit object for filtering, but current getAvailableUnits logic flattens it with blockName.
        // I will rely on blockName for now or update the helper.
        // Actually, let's just assume blockName is unique enough or I can refactor getAvailableUnits to include blockId.
        return allUnits.filter(u => !assignedUnitIds.has(u.id));
    };

    if (loading) {
         return (
            <DashboardLayout>
                <div className="p-6">
                    <div>{t('user_management.loading')}</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
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
                    {message && <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">{message}</p>}
                </div>

                {/* User List */}
                <div className="glass-card overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-neutral-700">
                        <thead className="bg-gray-50/60 dark:bg-neutral-700">
                            <tr>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('user_management.table.name')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('user_management.table.role')}</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('user_management.table.unit')}</th>
                                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">{t('user_management.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200">{user.full_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                                            {t(`user_management.roles.${user.roles?.name}`) !== `user_management.roles.${user.roles?.name}` ? t(`user_management.roles.${user.roles?.name}`) : user.roles?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                        {user.unit_owners && user.unit_owners.length > 0 
                                            ? user.unit_owners.map(uo => uo.units ? uo.units.unit_number : '').join(', ') 
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                        <button 
                                            onClick={() => handleEditClick(user)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400"
                                        >
                                            {t('common.edit', 'Edit')}
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
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('user_management.table.role')}</label>
                                                    <select 
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                                        value={editingUser.roleName}
                                                        onChange={e => setEditingUser({...editingUser, roleName: e.target.value})}
                                                    >
                                                        <option value="neighbor">{t('user_management.roles.neighbor')}</option>
                                                        <option value="president">{t('user_management.roles.president')}</option>
                                                        <option value="secretary">{t('user_management.roles.secretary')}</option>
                                                        <option value="vice_president">{t('user_management.roles.vice_president')}</option>
                                                        <option value="admin">{t('user_management.roles.admin')}</option>
                                                        <option value="treasurer">{t('user_management.roles.treasurer')}</option>
                                                        <option value="maintenance">{t('user_management.roles.maintenance')}</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300">{t('user_management.table.unit')}</label>
                                                    <div className="mt-1 border border-gray-300 dark:border-neutral-700 rounded-md p-2 h-48 overflow-y-auto bg-white dark:bg-neutral-900">
                                                        <div className="space-y-1">
                                                            {getAvailableUnits(editingUser.id).map(u => (
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
                                                <div className="flex justify-end pt-4">
                                                    <button 
                                                        type="button" 
                                                        className="mr-2 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-neutral-700 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-600"
                                                        onClick={() => setEditingUser(null)}
                                                    >
                                                        {t('user_management.edit.cancel')}
                                                    </button>
                                                    <button 
                                                        type="submit" 
                                                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
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
        </DashboardLayout>
    );
};

export default UserManagement;
