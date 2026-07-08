import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import SmartCompanion from '../../components/dashboard/SmartCompanion';
import CommunitySafety from '../../components/dashboard/CommunitySafety';
import TravelDocs from '../../components/dashboard/TravelDocs';
import Stats from '../../components/Stats';
import api from '../../config/api';
import socketService from '../../config/socket';
import authService from '../../services/authService';
import reportsService from '../../services/reportsService';
import alertService from '../../services/alertService';
import notificationService from '../../services/notificationService';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalReports: 0,
      safetyScore: 0,
      nearbyAlerts: 0,
      travelDays: 0
    },
    recentReports: [],
    nearbyAlerts: [],
    safetyTips: []
  });

  useEffect(() => {
    loadDashboardData();
    setupSocketListeners();
    
    return () => {
      socketService.disconnect();
    };
  }, []);

  const setupSocketListeners = () => {
    // Listen for new alerts
    socketService.on('new-alert', (alert) => {
      showNotification('New Safety Alert!', alert.title, 'warning');
      loadDashboardData(); // Refresh data
    });

    // Listen for new nearby reports
    socketService.on('new-report-nearby', (report) => {
      showNotification('New Report Nearby', report.title, 'info');
      loadDashboardData();
    });
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard stats (keep using direct API for now)
      const statsResponse = await api.get('/dashboard/stats');
      
      // Use reportsService for nearby reports
      const reportsResponse = await reportsService.getNearbyReports({
        limit: 5
      });

      // Use alertService for nearby alerts
      const alertsResponse = await alertService.getNearbyAlerts({
        limit: 3
      });

      // Get notification count using notificationService
      let notificationCount = 0;
      try {
        const notifCountResponse = await notificationService.getUnreadCount();
        notificationCount = notifCountResponse.count || 0;
      } catch (error) {
        console.log('Could not load notification count');
      }

      setDashboardData({
        stats: {
          totalReports: reportsResponse.reports?.length || 0,
          safetyScore: statsResponse.data.safetyScore || 85,
          nearbyAlerts: alertsResponse.alerts?.length || 0,
          travelDays: statsResponse.data.travelDays || 0,
          notifications: notificationCount
        },
        recentReports: reportsResponse.reports || [],
        nearbyAlerts: alertsResponse.alerts || [],
        safetyTips: statsResponse.data.safetyTips || []
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      showNotification(
        'Error',
        'Failed to load dashboard data. Please refresh.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      authService.logout(); // Also logout from authService
      showNotification('Success', 'Logged out successfully', 'success');
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('Error', 'Failed to logout', 'error');
    }
  };

  const renderOverview = () => (
    <div className="overview-container">
      <div className="welcome-section">
        <h2>Welcome back, {user?.name || 'Traveler'}! 👋</h2>
        <p>Here's your safety dashboard overview</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <Stats
          title="Community Reports"
          value={dashboardData.stats.totalReports}
          icon="📊"
          color="#667eea"
        />
        <Stats
          title="Safety Score"
          value={`${dashboardData.stats.safetyScore}%`}
          icon="🛡️"
          color="#10b981"
        />
        <Stats
          title="Nearby Alerts"
          value={dashboardData.stats.nearbyAlerts}
          icon="⚠️"
          color="#f59e0b"
        />
        <Stats
          title="Travel Days"
          value={dashboardData.stats.travelDays}
          icon="✈️"
          color="#3b82f6"
        />
      </div>

      {/* 🚕 Cab Booking Feature Card */}
      <div className="cab-booking-card">
        <div className="cab-card-header">
          <div className="cab-icon">🚕</div>
          <div className="cab-title">
            <h3>Book a Safe Ride</h3>
            <p>Verified drivers with real-time tracking</p>
          </div>
        </div>
        <div className="cab-card-features">
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Verified Drivers</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📍</span>
            <span>Live Tracking</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🛡️</span>
            <span>Safety Guaranteed</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⭐</span>
            <span>Rated Drivers</span>
          </div>
        </div>
        <button 
          className="book-cab-btn"
          onClick={() => navigate("/cab-booking")}
        >
          <span className="btn-icon">🚗</span>
          Book a Cab Now
          <span className="btn-arrow">→</span>
        </button>
      </div>

      {/* Nearby Alerts */}
      {dashboardData.nearbyAlerts.length > 0 && (
        <div className="alerts-section">
          <h3>🚨 Nearby Safety Alerts</h3>
          <div className="alerts-list">
            {dashboardData.nearbyAlerts.map((alert) => (
              <div key={alert._id} className="alert-item">
                <div className="alert-header">
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity}
                  </span>
                  <span className="alert-time">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <h4>{alert.title}</h4>
                <p>{alert.message}</p>
                {alert.affectedArea && (
                  <small>📍 {alert.affectedArea}</small>
                )}
              </div>
            ))}
          </div>
          <button 
            className="view-all-btn"
            onClick={() => navigate('/alerts')}
          >
            View All Alerts →
          </button>
        </div>
      )}

      {/* Recent Community Reports */}
      {dashboardData.recentReports.length > 0 && (
        <div className="reports-section">
          <h3>📍 Recent Community Reports</h3>
          <div className="reports-list">
            {dashboardData.recentReports.map((report) => (
              <div key={report._id} className="report-item">
                <div className="report-header">
                  <span className={`type-badge ${report.type}`}>
                    {report.type}
                  </span>
                  <span className="report-time">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4>{report.title}</h4>
                <p>{report.description}</p>
                <div className="report-meta">
                  <span>👤 {report.reportedBy?.name || 'Anonymous'}</span>
                  {report.verified && <span className="verified">✓ Verified</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Tips */}
      {dashboardData.safetyTips.length > 0 && (
        <div className="tips-section">
          <h3>💡 Safety Tips for Your Area</h3>
          <div className="tips-list">
            {dashboardData.safetyTips.map((tip, index) => (
              <div key={index} className="tip-item">
                <span className="tip-icon">{tip.icon}</span>
                <p>{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-btn emergency"
            onClick={() => navigate('/emergency')}
          >
            🆘 Report Emergency
          </button>
          <button 
            className="action-btn report"
            onClick={() => setActiveTab('community')}
          >
            📝 Submit Report
          </button>
          <button 
            className="action-btn digital-id"
            onClick={() => navigate('/generate-digital-id')}
          >
            🆔 Digital ID
          </button>
          <button 
            className="action-btn alerts"
            onClick={() => navigate('/alerts')}
          >
            🔔 View Alerts
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-enhanced">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>WatchDogs Dashboard</h1>
          <p>Your Travel Safety Command Center</p>
        </div>
        <div className="header-right">
          <button 
            className="profile-btn"
            onClick={() => navigate('/profile')}
          >
            👤 Profile
          </button>
          <button 
            className="settings-btn"
            onClick={() => navigate('/settings')}
          >
            ⚙️ Settings
          </button>
          <button 
            className="logout-btn"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🏠 Overview
        </button>
        <button
          className={`tab ${activeTab === 'companion' ? 'active' : ''}`}
          onClick={() => setActiveTab('companion')}
        >
          🤖 AI Companion
        </button>
        <button
          className={`tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          👥 Community
        </button>
        <button
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          📄 Documents
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'companion' && <SmartCompanion />}
        {activeTab === 'community' && <CommunitySafety />}
        {activeTab === 'documents' && <TravelDocs />}
      </div>
    </div>
  );
};

export default Dashboard;