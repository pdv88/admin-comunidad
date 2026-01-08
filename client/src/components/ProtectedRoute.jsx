import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, hasAnyRole } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // Check if user has one of the allowed roles using multi-role helper
    if (!hasAnyRole(allowedRoles)) {
      // User not authorized, redirect to dashboard
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
