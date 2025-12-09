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

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} /> 
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
             <Route path="/app/dashboard" element={<Dashboard />} />
             <Route path="/app/notices" element={<Notices />} />
             <Route path="/app/reports" element={<Reports />} />
             <Route path="/app/voting" element={<Voting />} />
             <Route path="/app/properties" element={<Properties />} />
             <Route path="/app/users" element={<UserManagement />} />
             {/* Redirect /dashboard to /app/dashboard for backward compatibility if needed */}
             <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          </Route>

          <Route path="/verifyEmail/:token" element={<EmailVerification />} />
          <Route path="/update-password" element={<UpdatePassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

