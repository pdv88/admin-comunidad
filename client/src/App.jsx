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
import Payments from "./pages/Payments";
import Campaigns from "./pages/Campaigns";
import PrivacyNotice from "./components/PrivacyNotice";

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
          </Route>
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
             <Route path="/app/dashboard" element={<Dashboard />} />
             <Route path="/app/notices" element={<Notices />} />
             <Route path="/app/reports" element={<Reports />} />
             <Route path="/app/voting" element={<Voting />} />
             
             {/* Admin/President Only Routes */}
             <Route element={<ProtectedRoute allowedRoles={['admin', 'president']} />}>
                <Route path="/app/properties" element={<Properties />} />
                <Route path="/app/users" element={<UserManagement />} />
                <Route path="/app/community" element={<CommunitySettings />} />
             </Route>

             <Route path="/app/settings" element={<Settings />} /> 
             <Route path="/app/payments" element={<Payments />} />
             <Route path="/app/campaigns" element={<Campaigns />} />
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

