import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import '../Auth.css';

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification('Error', 'Please fix the form errors', 'error');
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Attempting login...'); // DEBUG
      
      const response = await login(formData.email, formData.password);
      
      console.log('✅ Login successful:', response); // DEBUG
      console.log('👤 User role:', response?.user?.role); // DEBUG
      
      // ⭐ DIRECT NAVIGATION AS BACKUP (in case AuthContext doesn't redirect)
      if (response?.user?.role === 'admin') {
        console.log('🎯 Admin detected - navigating to /admin'); // DEBUG
        showNotification('Success', 'Welcome back, Admin!', 'success');
        
        // Force navigation
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 500);
      } else {
        console.log('🎯 Regular user - navigating to /dashboard'); // DEBUG
        showNotification('Success', 'Welcome back!', 'success');
        
        // Force navigation
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to sign in. Please try again.';
      
      showNotification('Error', errorMessage, 'error');
      
      // Handle specific errors
      if (error.response?.status === 401) {
        setErrors({
          email: 'Invalid credentials',
          password: 'Invalid credentials'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-logo">
            <h1>🕵️ WatchDogs</h1>
            <p>Travel Safe, Stay Protected</p>
          </div>
          <div className="auth-features">
            <div className="feature">
              <span className="feature-icon">🛡️</span>
              <div>
                <h3>Real-time Safety Alerts</h3>
                <p>Get instant notifications about safety concerns</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">👥</span>
              <div>
                <h3>Community Reports</h3>
                <p>Share and access safety information from travelers</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <div>
                <h3>AI Travel Companion</h3>
                <p>Get personalized safety recommendations</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🚕</span>
              <div>
                <h3>Cab Booking</h3>
                <p>Book rides with verified drivers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <h2>Welcome Back</h2>
            <p className="auth-subtitle">Sign in to your WatchDogs account</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                error={errors.email}
                disabled={loading}
                required
              />

              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                error={errors.password}
                disabled={loading}
                required
              />

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-password">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/signup">Sign up for free</Link>
              </p>
            </div>

            {/* Driver Login Section */}
            <div className="driver-section">
              <div className="driver-divider">
                <span>🚗 FOR DRIVERS</span>
              </div>
              <Link to="/driver/login" className="driver-login-btn">
                <span className="driver-icon">🚕</span>
                <div className="driver-text">
                  <strong>Driver Login</strong>
                  <small>Access your driver dashboard</small>
                </div>
                <span className="arrow">→</span>
              </Link>
            </div>

            {/* Admin Login Hint */}
            <div className="admin-hint">
              <small style={{ 
                color: '#9ca3af', 
                fontSize: '0.75rem',
                textAlign: 'center',
                display: 'block',
                marginTop: '1rem'
              }}>
                👨‍💼 Admin users are automatically redirected to the admin dashboard
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;