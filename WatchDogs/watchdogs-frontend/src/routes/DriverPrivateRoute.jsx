import React from 'react';
import { Navigate } from 'react-router-dom';

const DriverPrivateRoute = ({ children }) => {
  const driverToken = localStorage.getItem('driverToken');
  
  // If no driver token, redirect to driver login
  if (!driverToken) {
    return <Navigate to="/driver/login" replace />;
  }

  // If driver token exists, allow access
  return children;
};

export default DriverPrivateRoute;