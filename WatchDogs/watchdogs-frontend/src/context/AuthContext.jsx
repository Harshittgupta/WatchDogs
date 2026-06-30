import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import api from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = authService.getToken();
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Set token in axios headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Get current user from storage first (for immediate UI update)
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }

      // Then verify with backend
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // Update stored user
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } catch (error) {
        // Token might be expired, try to refresh
        try {
          await authService.refreshToken();
          const response = await api.get('/auth/me');
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (refreshError) {
          // Refresh failed, logout
          await logout();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      // ⭐ Redirect based on user role
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      // New users always go to dashboard
      navigate('/dashboard');
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      delete api.defaults.headers.common['Authorization'];
      
      // Redirect to signin
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/signin');
    }
  };

  const updateUser = async (updates) => {
    try {
      const response = await authService.updateProfile(updates);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // ⭐ Helper function to check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    isLoading: loading, // Alias for compatibility
    login,
    register,
    logout,
    updateUser,
    changePassword,
    checkAuth,
    isAdmin // ⭐ Add isAdmin helper
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;