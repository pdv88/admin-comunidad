import React from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import PresidentDashboard from '../components/dashboards/PresidentDashboard';
import VocalDashboard from '../components/dashboards/VocalDashboard';
import ResidentDashboard from '../components/dashboards/ResidentDashboard';

const Dashboard = () => {
    const { user } = useAuth();
    const role = user?.profile?.roles?.name || 'resident';

    const renderDashboard = () => {
        switch(role) {
            case 'admin':
                return <AdminDashboard />;
            case 'president':
                return <PresidentDashboard />;
            case 'vice_president':
            case 'secretary':
            case 'treasurer':
            case 'vocal': // Assuming 'vocal' is a role or similar
                 return <VocalDashboard />;
            default:
                return <ResidentDashboard />;
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                {renderDashboard()}
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
