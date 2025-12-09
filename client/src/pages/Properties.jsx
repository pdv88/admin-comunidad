import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';

const Properties = () => {
    const [blocks, setBlocks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newBlock, setNewBlock] = useState('');
    const [newUnit, setNewUnit] = useState({ blockId: '', number: '', type: 'apartment' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [blocksRes, usersRes] = await Promise.all([
                fetch('http://localhost:5000/api/properties/blocks'),
                fetch('http://localhost:5000/api/properties/users')
            ]);
            setBlocks(await blocksRes.json());
            setUsers(await usersRes.json());
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBlock = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/properties/blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBlock })
            });
            if (res.ok) {
                setNewBlock('');
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateUnit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/properties/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    block_id: newUnit.blockId, 
                    unit_number: newUnit.number,
                    type: newUnit.type
                })
            });
            if (res.ok) {
                setNewUnit({ blockId: '', number: '', type: 'apartment' });
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssignRep = async (blockId, userId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/properties/blocks/${blockId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ representative_id: userId || null })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                 <div className="p-6">
                    <div>Loading properties...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6">
                 {/* ... existing content ... */}
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Property Structure</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Block */}
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                        <h2 className="font-bold mb-4 dark:text-white">Add Building/Street</h2>
                        <form onSubmit={handleCreateBlock}>
                            <input 
                                type="text" 
                                placeholder="Name (e.g. Tower A)" 
                                className="w-full mb-3 rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700 font-normal"
                                value={newBlock}
                                onChange={(e) => setNewBlock(e.target.value)}
                                required
                            />
                             <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">Add Block</button>
                        </form>
                    </div>

                    {/* Create Unit */}
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700 lg:col-span-2">
                        <h2 className="font-bold mb-4 dark:text-white">Add Unit</h2>
                        <form onSubmit={handleCreateUnit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <select 
                                className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                value={newUnit.blockId}
                                onChange={(e) => setNewUnit({...newUnit, blockId: e.target.value})}
                                required
                            >
                                <option value="">Select Block</option>
                                {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                             <input 
                                type="text" 
                                placeholder="Unit Number (e.g. 101)" 
                                className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                value={newUnit.number}
                                onChange={(e) => setNewUnit({...newUnit, number: e.target.value})}
                                required
                            />
                            <select 
                                className="rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                value={newUnit.type}
                                onChange={(e) => setNewUnit({...newUnit, type: e.target.value})}
                            >
                                <option value="apartment">Apartment</option>
                                <option value="house">House</option>
                                <option value="parking">Parking</option>
                                <option value="storage">Storage</option>
                            </select>
                            <button type="submit" className="bg-green-600 text-white py-2 rounded-lg">Add Unit</button>
                        </form>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Current Structure</h2>
                    <div className="space-y-6">
                        {blocks.map(block => (
                            <div key={block.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                 <div className="bg-gray-50 dark:bg-neutral-700 px-6 py-3 border-b border-gray-200 dark:border-neutral-600 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 dark:text-white">{block.name}</h3>
                                    <div className="flex items-center gap-2">
                                         <span className="text-xs text-gray-500">Representative:</span>
                                         <select 
                                            className="text-sm py-1 px-2 rounded border border-gray-300 dark:bg-neutral-800 dark:border-neutral-600"
                                            value={block.representative_id || ''}
                                            onChange={(e) => handleAssignRep(block.id, e.target.value)}
                                         >
                                            <option value="">None</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email || 'User'}</option>
                                            ))}
                                         </select>
                                    </div>
                                </div>
                                <div className="p-6">
                                    {block.units && block.units.length > 0 ? (
                                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                            {block.units.map(unit => (
                                                <div key={unit.id} className="text-center p-2 bg-gray-100 dark:bg-neutral-900 rounded border border-gray-200 dark:border-neutral-700">
                                                    <span className="block font-bold text-gray-800 dark:text-white">{unit.unit_number}</span>
                                                    <span className="text-xs text-gray-500 uppercase">{unit.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No units in this block yet.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Properties;
