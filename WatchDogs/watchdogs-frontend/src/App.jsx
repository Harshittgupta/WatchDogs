import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import { TouristSafetyProvider } from '@context/TouristSafetyContext';
import { NotificationProvider } from '@context/NotificationContext';
import { AppRoutes } from '@/routes';
import ErrorBoundary from '@components/common/ErrorBoundary';
import './styles/index.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TouristSafetyProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </TouristSafetyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;