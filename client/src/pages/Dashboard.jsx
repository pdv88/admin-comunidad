import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <DashboardLayout>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stat Card 1 */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">Total Users</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white">124</p>
                </div>
                {/* Stat Card 2 */}
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
                    <h3 className="text-gray-500 text-sm font-medium uppercase dark:text-neutral-400">Total Revenue</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white">€12,450</p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
