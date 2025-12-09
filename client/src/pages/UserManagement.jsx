import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [blocks, setBlocks] = useState([]); // For assignment
    const [loading, setLoading] = useState(true);
    const [newUser, setNewUser] = useState({ email: '', fullName: '', roleName: 'neighbor', unitId: '' });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, blocksRes] = await Promise.all([
                fetch('http://localhost:5000/api/users'),
                fetch('http://localhost:5000/api/properties/blocks')
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
            const res = await fetch('http://localhost:5000/api/users/invite', {
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
                    <div>Loading users...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6">
                 {/* ... existing content ... */}
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
                </div>

                {/* Invite Form */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 mb-8">
                    <h2 className="font-bold mb-4 dark:text-white">Invite New User</h2>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <input 
                            type="email" 
                            placeholder="Email" 
                            className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="Full Name" 
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
                            <option value="neighbor">Neighbor</option>
                            <option value="president">President</option>
                            <option value="secretary">Secretary</option>
                            <option value="vice_president">Vice President</option>
                            <option value="admin">Administrator</option>
                            <option value="treasurer">Treasurer</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                         <select 
                            className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                            value={newUser.unitId}
                            onChange={e => setNewUser({...newUser, unitId: e.target.value})}
                        >
                            <option value="">Assign Unit (Optional)</option>
                            {getAllUnits().map(u => (
                                <option key={u.id} value={u.id}>{u.blockName} - {u.unit_number}</option>
                            ))}
                        </select>
                        <button type="submit" className="bg-blue-600 text-white rounded-lg">Send Invite</button>
                    </form>
                    {message && <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">{message}</p>}
                </div>

                {/* User List */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                        <thead className="bg-gray-50 dark:bg-neutral-700">
                            <tr>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">Name</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">Role</th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-400">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200">{user.full_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                                            {user.roles?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                                        {user.units ? `${user.units.unit_number}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default UserManagement;
