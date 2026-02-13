import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import EmailVerification from "./pages/EmailVerification";
import Notices from "./pages/Notices";
import Reports from "./pages/Reports";
import Voting from "./pages/Voting";
import Properties from "./pages/Properties";
import UserManagement from "./pages/UserManagement";
import UpdatePassword from "./pages/UpdatePassword";
import Settings from "./pages/Settings";
import CommunitySettings from "./pages/CommunitySettings";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import Maintenance from "./pages/Maintenance";
import MyBalance from "./pages/MyBalance";
import Reservations from "./pages/Reservations";
import PrivacyNotice from "./components/PrivacyNotice";
import Privacy from './pages/Privacy';
import Terms from "./pages/Terms";
import CommunityInfo from "./pages/CommunityInfo";
import Visitors from "./pages/Visitors";
import Alerts from "./pages/Alerts";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import PublicLayout from "./components/PublicLayout";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes with Background */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verifyEmail/:token" element={<EmailVerification />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms-and-conditions" element={<Terms />} />
          </Route>


          {/* Protected Routes */}
          {/* Universal Routes (Dashboard, Reservations, Settings, Profile) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app/dashboard" element={<Dashboard />} />

            <Route path="/app/settings" element={<Settings />} />
            <Route path="/app/community-info" element={<CommunityInfo />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* Reservations Access - EXCLUDES Treasurer */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'president', 'secretary', 'vocal', 'neighbor', 'security', 'maintenance']} />}>
              <Route path="/app/reservations" element={<Reservations />} />
            </Route>

            {/* Security Access (Security, Residents, Admins) - EXCLUDES Maintenance */}
            {/* Security Access (Security, Residents, Admins) - EXCLUDES Maintenance & Treasurer */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'president', 'secretary', 'vocal', 'neighbor', 'security']} />}>
              <Route path="/app/visitors" element={<Visitors />} />
            </Route>

            {/* Reports Access (Maintenance, Residents, Admins) - EXCLUDES Security */}
            {/* Reports Access (Maintenance, Residents, Admins) - EXCLUDES Security & Treasurer */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'president', 'secretary', 'vocal', 'neighbor', 'maintenance']} />}>
              <Route path="/app/reports" element={<Reports />} />
            </Route>

            {/* Resident/Admin Features - EXCLUDES Security & Maintenance */}
            {/* General Features - EXCLUDES Treasurer (Notices, Voting) */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'president', 'secretary', 'vocal', 'neighbor']} />}>
              <Route path="/app/notices" element={<Notices />} />
              <Route path="/app/voting" element={<Voting />} />
            </Route>

            {/* Financial Features - INCLUDES Treasurer */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'president', 'secretary', 'treasurer', 'vocal', 'neighbor']} />}>
              <Route path="/app/maintenance" element={<Maintenance />} />
              <Route path="/app/campaigns" element={<Navigate to="/app/maintenance?tab=extraordinary" replace />} />
              <Route path="/app/campaigns/:id" element={<CampaignDetails />} />
              {/* Redirect /app/payments to /app/maintenance */}
              <Route path="/app/payments" element={<Navigate to="/app/maintenance" replace />} />
            </Route>

            {/* My Balance: Neighbors Only */}
            <Route element={<ProtectedRoute allowedRoles={['neighbor']} />}>
              <Route path="/app/my-balance" element={<MyBalance />} />
            </Route>

            {/* Admin/President Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'president']} />}>
              <Route path="/app/properties" element={<Properties />} />
              <Route path="/app/users" element={<UserManagement />} />
              <Route path="/app/community" element={<CommunitySettings />} />
              <Route path="/app/alerts" element={<Alerts />} />
            </Route>

            {/* Redirect /dashboard to /app/dashboard for backward compatibility if needed */}
            <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          </Route>
        </Routes>
        <PrivacyNotice />
      </Router>
    </AuthProvider>
  );
}

export default App;

