import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import '../Auth.css';

const SignUp = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agreeToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Phone validation (optional but if provided, must be valid)
    if (formData.phone && !/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    // Terms validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
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
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined
      };

      console.log('Registering with data:', userData); // Debug log

      await register(userData);
      
      showNotification(
        'Success', 
        'Account created successfully! Welcome to WatchDogs!', 
        'success'
      );
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to create account. Please try again.';
      
      showNotification('Error', errorMessage, 'error');
      
      // Handle specific errors
      if (error.response?.status === 409 || error.response?.status === 400) {
        if (errorMessage.toLowerCase().includes('email')) {
          setErrors({
            email: errorMessage
          });
        }
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
              <span className="feature-icon">✨</span>
              <div>
                <h3>Join Our Community</h3>
                <p>Become part of a global travel safety network</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🎯</span>
              <div>
                <h3>Personalized Experience</h3>
                <p>Get safety recommendations tailored to your journey</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🔒</span>
              <div>
                <h3>Secure & Private</h3>
                <p>Your data is encrypted and protected</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">💯</span>
              <div>
                <h3>100% Free</h3>
                <p>All features available at no cost</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <h2>Create Your Account</h2>
            <p className="auth-subtitle">Join WatchDogs and travel with confidence</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <Input
                label="First Name"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                error={errors.firstName}
                disabled={loading}
                required
              />

              <Input
                label="Last Name"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                error={errors.lastName}
                disabled={loading}
                required
              />

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
                label="Phone Number (Optional)"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
                error={errors.phone}
                disabled={loading}
              />

              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                error={errors.password}
                disabled={loading}
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                error={errors.confirmPassword}
                disabled={loading}
                required
              />

              <div className="password-requirements">
                <small>
                  Password must contain:
                  <ul>
                    <li className={formData.password.length >= 6 ? 'valid' : ''}>
                      At least 6 characters
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                      One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>
                      One lowercase letter
                    </li>
                    <li className={/\d/.test(formData.password) ? 'valid' : ''}>
                      One number
                    </li>
                  </ul>
                </small>
              </div>

              <div className="terms-checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms" target="_blank">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" target="_blank">Privacy Policy</Link>
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <span className="error-text">{errors.agreeToTerms}</span>
                )}
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={loading || !formData.agreeToTerms}
                loading={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <Link to="/signin">Sign in instead</Link>
              </p>
            </div>

            {/* Driver Registration Section */}
            <div className="driver-section">
              <div className="driver-divider">
                <span>🚗 BECOME A DRIVER</span>
              </div>
              <Link to="/driver/register" className="driver-register-btn">
                <span className="driver-icon">🚕</span>
                <div className="driver-text">
                  <strong>Register as Driver</strong>
                  <small>Start earning by driving with WatchDogs</small>
                </div>
                <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;