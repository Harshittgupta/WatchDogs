import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

const PublicRoute = ({ children, restricted = false }) => {
  const { isAuthenticated } = useAuth();

  // If authenticated and trying to access restricted route (like signin/signup), redirect to dashboard
  if (isAuthenticated && restricted) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
