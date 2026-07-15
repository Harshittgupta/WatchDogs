import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Not logged in - redirect to signin
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Logged in but not admin - redirect to dashboard
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // User is admin - render admin component
  return children;
};

export default AdminRoute;