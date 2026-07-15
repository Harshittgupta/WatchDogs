import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from '@components/common/LoadingScreen';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import DriverPrivateRoute from './DriverPrivateRoute';
import AdminRoute from './AdminRoute'; // NEW: Admin route guard

// Lazy load pages for better performance
const HomePage = lazy(() => import('@pages/Home/HomePage'));
const SignIn = lazy(() => import('@pages/Auth/SignIn/SignIn'));
const SignUp = lazy(() => import('@pages/Auth/SignUp/SignUp'));
const Dashboard = lazy(() => import('@pages/Dashboard/Dashboard'));
const Profile = lazy(() => import('@pages/Profile/ProfilePage'));
const Settings = lazy(() => import('@pages/Settings/SettingsPage'));
const Alerts = lazy(() => import('@pages/Alerts/AlertsPage'));
const Emergency = lazy(() => import('@pages/Emergency/EmergencyPage'));
const NotFound = lazy(() => import('@pages/NotFound/NotFound'));
const DigitalIDGenerationPage = lazy(() => import('@pages/DigitalID/DigitalIDGenerationPage'));

// 👨‍💼 ADMIN PAGES
const AdminDashboard = lazy(() => import('@pages/AdminDashboard/AdminDashboard'));

// 🚕 CAB BOOKING PAGES
const CabBooking = lazy(() => import('@pages/CabBooking/CabBookingEnhanced'));
const DriverRegistration = lazy(() => import('@pages/Driver/DriverRegistration'));
const DriverLogin = lazy(() => import('@pages/Driver/DriverLogin'));
const DriverDashboard = lazy(() => import('@pages/Driver/DriverDashboard'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <HomePage />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signin" 
          element={
            <PublicRoute restricted>
              <SignIn />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signup" 
          element={
            <PublicRoute restricted>
              <SignUp />
            </PublicRoute>
          } 
        />
        
        {/* 🚕 DRIVER - Public Routes */}
        <Route 
          path="/driver/register" 
          element={<DriverRegistration />}
        />
        
        <Route 
          path="/driver/login" 
          element={<DriverLogin />}
        />
        
        {/* 👨‍💼 ADMIN - Protected Route */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        
        {/* Protected Routes (User) */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/alerts" 
          element={
            <PrivateRoute>
              <Alerts />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/generate-digital-id" 
          element={
            <PrivateRoute>
              <DigitalIDGenerationPage />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/emergency" 
          element={
            <PrivateRoute>
              <Emergency />
            </PrivateRoute>
          } 
        />
        
        {/* 🚕 CAB BOOKING - User Route */}
        <Route 
          path="/cab-booking" 
          element={
            <PrivateRoute>
              <CabBooking />
            </PrivateRoute>
          } 
        />
        
        {/* 🚕 DRIVER - Protected Route */}
        <Route 
          path="/driver/dashboard" 
          element={
            <DriverPrivateRoute>
              <DriverDashboard />
            </DriverPrivateRoute>
          } 
        />
        
        {/* Fallback Routes */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;