import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './DriverLogin.css';

const DriverLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/driver/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Store token and driver data
        localStorage.setItem('driverToken', data.token);
        localStorage.setItem('driverData', JSON.stringify(data.driver));
        
        console.log('✅ Login successful, navigating to dashboard...');
        
        // Navigate to driver dashboard
        navigate('/driver/dashboard', { replace: true });
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-login">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-section">
            <div className="car-icon">🚕</div>
            <h1>Driver Login</h1>
            <p>Sign in to your driver account</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <span className="label-icon">📧</span>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="driver@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <span className="label-icon">🔒</span>
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary full-width"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              <>
                <span className="btn-icon">🚗</span>
                Login to Dashboard
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="divider">
            <span>OR</span>
          </div>
          
          <div className="footer-links">
            <p>
              Don't have an account?
              <Link to="/driver/register" className="link-primary">
                Register as Driver
              </Link>
            </p>
            <p>
              <Link to="/signin" className="link-secondary">
                ← Login as User
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
    </div>
  );
};

export default DriverLogin;