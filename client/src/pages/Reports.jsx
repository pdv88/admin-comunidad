import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

const Reports = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newReport, setNewReport] = useState({ title: '', description: '', category: 'maintenance' });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/reports');
            const data = await res.json();
            setReports(data);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const  handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newReport, user_id: user?.id })
            });
            if (res.ok) {
                setShowForm(false);
                fetchReports();
                setNewReport({ title: '', description: '', category: 'maintenance' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div>Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Isues & Maintenance</h1>
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        {showForm ? 'Cancel' : 'Report Issue'}
                    </button>
                </div>

                {showForm && (
                    <div className="mb-8 bg-white dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">Title</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                    value={newReport.title}
                                    onChange={e => setNewReport({...newReport, title: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">Category</label>
                                <select 
                                    className="w-full rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                    value={newReport.category}
                                    onChange={e => setNewReport({...newReport, category: e.target.value})}
                                >
                                    <option value="maintenance">Maintenance</option>
                                    <option value="security">Security</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-white">Description</label>
                                <textarea 
                                    className="w-full rounded-lg border-gray-300 dark:bg-neutral-900 dark:border-neutral-700"
                                    rows="3"
                                    value={newReport.description}
                                    onChange={e => setNewReport({...newReport, description: e.target.value})}
                                ></textarea>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">Submit Report</button>
                        </form>
                    </div>
                )}

                <div className="space-y-4">
                    {reports.map(report => (
                        <div key={report.id} className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-gray-200 dark:border-neutral-700">
                            <div className="flex justify-between">
                                <h3 className="font-bold dark:text-white">{report.title}</h3>
                                <span className={`px-2 py-1 rounded text-xs ${
                                    report.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                                    report.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {report.status}
                                </span>
                            </div>
                            <p className="text-gray-600 dark:text-neutral-400 text-sm mt-1">{report.description}</p>
                            <div className="mt-2 text-xs text-gray-500">
                                Category: {report.category} • {new Date(report.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Reports;
