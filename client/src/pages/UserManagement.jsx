import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [blocks, setBlocks] = useState([]); // For assignment
    const [loading, setLoading] = useState(true);
    const [newUser, setNewUser] = useState({ email: '', fullName: '', roleName: 'neighbor', unitId: '' });
    const [message, setMessage] = useState('');
    const [editingUser, setEditingUser] = useState(null); // User being edited
    const { t } = useTranslation();

    const handleEditClick = (user) => {
        setEditingUser({
            id: user.id,
            email: user.email, // Email is typically not editable here, just for display
            fullName: user.full_name,
            roleName: user.roles?.name || 'neighbor',
            unitId: user.unit_id || ''
        });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setMessage('Updating user...');
        try {
            const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roleName: editingUser.roleName,
                    unitId: editingUser.unitId
                })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('User updated successfully!');
                setEditingUser(null);
                fetchData();
            } else {
                setMessage('Error: ' + data.error);
            }
        } catch (error) {
            setMessage('Error updating user');
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
            setUsers(await usersRes.json());
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
        setMessage('Sending invitation...');
        try {
            const res = await fetch(`${API_URL}/api/users/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('Invitation sent successfully!');
                setNewUser({ email: '', fullName: '', roleName: 'neighbor', unitId: '' });
                fetchData();
            } else {
                setMessage('Error: ' + data.error);
            }
        } catch (error) {
            setMessage('Error sending invitation');
        }
    };

    // Helper to get all units
    const getAllUnits = () => {
        let units = [];
        if (Array.isArray(blocks)) {
            blocks.forEach(b => {
                 if (b.units) {
                     b.units.forEach(u => units.push({ ...u, blockName: b.name }));
                 }
            });
        }
        return units;
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
            <div className="p-6">
                 {/* ... existing content ... */}
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('user_management.title')}</h1>
                </div>

                {/* Invite Form */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 mb-8">
                    <h2 className="font-bold mb-4 dark:text-white">{t('user_management.invite.title')}</h2>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <input 
                            type="email" 
                            placeholder={t('user_management.invite.email')} 
                            className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder={t('user_management.invite.fullname')} 
                            className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newUser.fullName}
                            onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                            required
                        />
                        <select 
                            className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newUser.roleName}
                            onChange={e => setNewUser({...newUser, roleName: e.target.value})}
                        >
                            <option value="neighbor">{t('user_management.roles.neighbor')}</option>
                            <option value="president">{t('user_management.roles.president')}</option>
                            <option value="secretary">{t('user_management.roles.secretary')}</option>
                            <option value="vice_president">{t('user_management.roles.vice_president')}</option>
                            <option value="admin">{t('user_management.roles.admin')}</option>
                            <option value="treasurer">{t('user_management.roles.treasurer')}</option>
                            <option value="maintenance">{t('user_management.roles.maintenance')}</option>
                        </select>
                         <select 
                            className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newUser.unitId}
                            onChange={e => setNewUser({...newUser, unitId: e.target.value})}
                        >
                            <option value="">{t('user_management.invite.assign_unit')}</option>
                            {getAllUnits().map(u => (
                                <option key={u.id} value={u.id}>{u.blockName} - {u.unit_number}</option>
                            ))}
                        </select>
                        <button type="submit" className="bg-blue-600 text-white rounded-lg">{t('user_management.invite.send')}</button>
                    </form>
                    {message && <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">{message}</p>}
                </div>

                {/* User List */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                        <thead className="bg-gray-50 dark:bg-neutral-700">
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
                                        {user.units ? `${user.units.unit_number}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                        <button 
                                            onClick={() => handleEditClick(user)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-500 dark:hover:text-blue-400"
                                        >
                                            Edit
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
                                                    <select 
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                                                        value={editingUser.unitId}
                                                        onChange={e => setEditingUser({...editingUser, unitId: e.target.value})}
                                                    >
                                                        <option value="">{t('properties.none')}</option>
                                                        {getAllUnits().map(u => (
                                                            <option key={u.id} value={u.id}>{u.blockName} - {u.unit_number}</option>
                                                        ))}
                                                    </select>
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
            )}
        </DashboardLayout>
    );
};

export default UserManagement;
