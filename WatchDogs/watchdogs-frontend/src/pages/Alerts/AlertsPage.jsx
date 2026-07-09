import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import alertService from '../../services/alertService';
import './AlertsPage.css';

const AlertsPage = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Get user location
    getUserLocation();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchAlerts();
      fetchStats();
    }
  }, [location, filter]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Error', 'Geolocation is not supported', 'error');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        showNotification('Info', 'Using default location', 'info');
        // Use default location (e.g., Mumbai)
        setLocation({
          latitude: 19.0760,
          longitude: 72.8777
        });
        setLocationLoading(false);
      }
    );
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertService.getNearbyAlerts(
        location.latitude,
        location.longitude,
        50 // 50km radius
      );

      if (data.success) {
        const fetchedAlerts = data.alerts || [];
        
        // Filter based on severity if not 'all'
        const filteredAlerts = filter === 'all' 
          ? fetchedAlerts
          : fetchedAlerts.filter(alert => alert.severity === filter);
        
        setAlerts(filteredAlerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      showNotification('Error', 'Failed to fetch alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await alertService.getAlertStats();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const data = await alertService.markAsRead(alertId);
      if (data.success) {
        showNotification('Success', 'Alert acknowledged', 'success');
        fetchAlerts(); // Refresh alerts
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      showNotification('Error', 'Failed to acknowledge alert', 'error');
    }
  };

  const shareAlert = async (alert) => {
    try {
      // Create share text
      const shareText = `${alert.title}\n\n${alert.message}\n\nStay safe with WatchDogs!`;
      
      if (navigator.share) {
        await navigator.share({
          title: alert.title,
          text: shareText,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        showNotification('Success', 'Alert copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Error sharing alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981',
      info: '#6b7280'
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '🔔',
      low: 'ℹ️',
      info: '📢'
    };
    return icons[severity] || '📢';
  };

  const getAlertTypeIcon = (type) => {
    const icons = {
      weather: '🌧️',
      natural_disaster: '🌊',
      health: '💊',
      security: '🔒',
      political: '🏛️',
      traffic: '🚗',
      event: '🎉',
      travel_advisory: '✈️',
      other: '📌'
    };
    return icons[type] || '📌';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffMs = now - alertDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (locationLoading) {
    return (
      <div className="alerts-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <div className="header-content">
          <h1>🚨 Safety Alerts</h1>
          <p>Real-time safety notifications for your location</p>
          {location && (
            <span className="location-info">
              📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </span>
          )}
        </div>
        
        {stats && (
          <div className="alerts-stats">
            <div className="stat-card">
              <span className="stat-number">{stats.activeAlerts || 0}</span>
              <span className="stat-label">Active Alerts</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.last24Hours || 0}</span>
              <span className="stat-label">Last 24h</span>
            </div>
          </div>
        )}
      </div>

      <div className="alerts-filters">
        {['all', 'critical', 'high', 'medium', 'low', 'info'].map(severity => (
          <button
            key={severity}
            className={`filter-btn ${filter === severity ? 'active' : ''}`}
            onClick={() => setFilter(severity)}
            style={{
              borderColor: filter === severity ? getSeverityColor(severity) : 'transparent',
              background: filter === severity ? `${getSeverityColor(severity)}20` : 'transparent'
            }}
          >
            {severity === 'all' ? '🌐 ALL' : `${getSeverityIcon(severity)} ${severity.toUpperCase()}`}
          </button>
        ))}
      </div>

      <div className="alerts-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="no-alerts">
            <div className="no-alerts-icon">✅</div>
            <h3>No active alerts in your area</h3>
            <p>All clear! Enjoy your travels safely.</p>
            <button onClick={fetchAlerts} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map(alert => (
              <div 
                key={alert._id} 
                className={`alert-card severity-${alert.severity}`}
                style={{ borderLeftColor: getSeverityColor(alert.severity) }}
              >
                <div className="alert-card-header">
                  <div className="alert-icons">
                    <span className="severity-icon">{getSeverityIcon(alert.severity)}</span>
                    <span className="type-icon">{getAlertTypeIcon(alert.alertType)}</span>
                  </div>
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity}
                  </span>
                </div>

                <div className="alert-content">
                  <h3 className="alert-title">{alert.title}</h3>
                  <p className="alert-message">{alert.message}</p>

                  {alert.detailedInfo && (
                    <div className="alert-details">
                      <p>{alert.detailedInfo}</p>
                    </div>
                  )}

                  {alert.affectedArea && (
                    <div className="affected-area">
                      <strong>📍 Affected Area:</strong>
                      <span>
                        {alert.affectedArea.city && `${alert.affectedArea.city}, `}
                        {alert.affectedArea.state && `${alert.affectedArea.state}, `}
                        {alert.affectedArea.country}
                      </span>
                    </div>
                  )}

                  {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                    <div className="recommended-actions">
                      <strong>⚡ Recommended Actions:</strong>
                      <ul>
                        {alert.recommendedActions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {alert.safetyTips && alert.safetyTips.length > 0 && (
                    <div className="safety-tips">
                      <strong>💡 Safety Tips:</strong>
                      <ul>
                        {alert.safetyTips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {alert.emergencyContacts && alert.emergencyContacts.length > 0 && (
                    <div className="emergency-contacts">
                      <strong>📞 Emergency Contacts:</strong>
                      <div className="contacts-list">
                        {alert.emergencyContacts.map((contact, idx) => (
                          <div key={idx} className="contact-item">
                            <span>{contact.name}: </span>
                            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="alert-footer">
                  <div className="alert-meta">
                    <span className="alert-time">
                      🕐 {formatTimeAgo(alert.createdAt)}
                    </span>
                    {alert.source && (
                      <span className="alert-source">
                        📡 {alert.source}
                      </span>
                    )}
                    {alert.isVerified && (
                      <span className="verified-badge">✓ Verified</span>
                    )}
                  </div>
                  
                  <div className="alert-actions">
                    <button 
                      onClick={() => acknowledgeAlert(alert._id)}
                      className="action-btn acknowledge-btn"
                      disabled={alert.acknowledgedBy?.includes(user?._id)}
                    >
                      {alert.acknowledgedBy?.includes(user?._id) ? '✓ Acknowledged' : '✓ Acknowledge'}
                    </button>
                    <button 
                      onClick={() => shareAlert(alert)}
                      className="action-btn share-btn"
                    >
                      🔗 Share
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;