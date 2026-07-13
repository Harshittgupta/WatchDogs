import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import driverLocationService from '../../services/driverLocationService';
import socketService from '../../services/socket';
import './DriverDashboard.css';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationTracking, setLocationTracking] = useState(false);
  
  // ✅ Ride request state
  const [rideRequest, setRideRequest] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);
  const [acceptingRide, setAcceptingRide] = useState(false);

  useEffect(() => {
    loadDriverData();
    checkLocationPermission();
  }, []);

  // Start/stop location tracking based on online status
  useEffect(() => {
    if (driver?.isOnline && driver?._id) {
      handleStartLocationTracking();
      setupRideNotifications();
    } else {
      handleStopLocationTracking();
      cleanupRideNotifications();
    }
    
    return () => {
      handleStopLocationTracking();
      cleanupRideNotifications();
    };
  }, [driver?.isOnline]);

  // ✅ Setup ride notification listeners
  const setupRideNotifications = () => {
    if (!driver?._id) return;

    console.log('🔔 Setting up ride notifications for driver:', driver._id);

    // Join driver room
    socketService.connect();
    socketService.joinDriver(driver._id);

    // Listen for new ride requests
    socketService.onNewRideRequest((rideDetails) => {
      console.log('🚗 New ride request received:', rideDetails);
      
      setRideRequest(rideDetails);
      setShowRideModal(true);

      // Play notification sound (optional)
      playNotificationSound();

      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        if (showRideModal) {
          setShowRideModal(false);
          setRideRequest(null);
        }
      }, 30000);
    });

    // Listen for ride cancellations
    socketService.on('ride-cancelled', (data) => {
      console.log('❌ Ride cancelled:', data);
      setShowRideModal(false);
      setRideRequest(null);
      alert('Ride was cancelled by user');
    });
  };

  // ✅ Cleanup ride notifications
  const cleanupRideNotifications = () => {
    socketService.off('new-ride-request');
    socketService.off('ride-cancelled');
  };

  // ✅ Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Could not play sound:', e));
    } catch (error) {
      console.log('Notification sound error:', error);
    }
  };

  // ✅ Accept ride
  const handleAcceptRide = async () => {
    if (!rideRequest || !driver) return;

    setAcceptingRide(true);

    try {
      const token = localStorage.getItem('driverToken');

      const response = await fetch(`http://localhost:5000/api/rides/${rideRequest.rideId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          driverId: driver._id
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Ride accepted! OTP: ${data.otp}`);
        
        // Update driver state
        setDriver({
          ...driver,
          currentRide: rideRequest.rideId,
          isAvailable: false
        });

        // Close modal
        setShowRideModal(false);
        setRideRequest(null);
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('❌ Failed to accept ride');
    } finally {
      setAcceptingRide(false);
    }
  };

  // ✅ Reject ride
  const handleRejectRide = () => {
    setShowRideModal(false);
    setRideRequest(null);
    console.log('❌ Driver rejected ride');
  };

  const loadDriverData = async () => {
    try {
      const token = localStorage.getItem('driverToken');
      
      if (!token) {
        navigate('/driver/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/driver/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setDriver(data.driver);
      } else {
        navigate('/driver/login');
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      navigate('/driver/login');
    } finally {
      setLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    const permission = await driverLocationService.checkPermission();
    setLocationPermission(permission);
    console.log('📍 Location permission:', permission);
  };

  const handleStartLocationTracking = async () => {
    try {
      console.log('🗺️ Starting location tracking...');
      
      const location = await driverLocationService.getCurrentLocation();
      setCurrentLocation(location);
      console.log('✅ Got initial location:', location);
      
      const started = driverLocationService.startTracking(
        driver._id,
        driver.currentRide
      );
      
      if (started) {
        setLocationTracking(true);
        console.log('✅ Location tracking started');
        
        const interval = setInterval(() => {
          const status = driverLocationService.getStatus();
          if (status.currentLocation) {
            setCurrentLocation(status.currentLocation);
          }
        }, 5000);
        
        window.locationUpdateInterval = interval;
      }
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
      
      if (error.code === 1) {
        alert('❌ Location access is required to go online. Please enable location permissions in your browser settings.');
        await handleGoOffline();
      } else {
        alert('❌ Failed to get location. Please check your GPS settings.');
      }
    }
  };

  const handleStopLocationTracking = () => {
    driverLocationService.stopTracking();
    setLocationTracking(false);
    setCurrentLocation(null);
    
    if (window.locationUpdateInterval) {
      clearInterval(window.locationUpdateInterval);
      window.locationUpdateInterval = null;
    }
    
    console.log('❌ Location tracking stopped');
  };

  const handleGoOffline = async () => {
    try {
      const token = localStorage.getItem('driverToken');
      
      const response = await fetch('http://localhost:5000/api/driver/auth/toggle-online', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setDriver({
          ...driver,
          isOnline: false,
          isAvailable: false
        });
      }
    } catch (error) {
      console.error('Error going offline:', error);
    }
  };

  const handleToggleOnline = async () => {
    try {
      if (!driver.isOnline) {
        const permission = await driverLocationService.checkPermission();
        
        if (permission === 'denied') {
          alert('❌ Location access is required to go online. Please enable location permissions in your browser settings.');
          return;
        }

        try {
          await driverLocationService.getCurrentLocation();
        } catch (error) {
          if (error.code === 1) {
            alert('❌ Location permission is required to go online.');
            return;
          }
        }
      }

      const token = localStorage.getItem('driverToken');
      
      const response = await fetch('http://localhost:5000/api/driver/auth/toggle-online', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setDriver({
          ...driver,
          isOnline: data.driver.isOnline,
          isAvailable: data.driver.isAvailable
        });
        alert(data.message);
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('❌ Failed to update status');
    }
  };

  const handleLogout = () => {
    handleStopLocationTracking();
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driverData');
    navigate('/driver/login');
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString();
      }
      return new Date(timestamp).toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };

  if (loading) {
    return (
      <div className="driver-dashboard loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  const getStatusColor = () => {
    if (driver.isOnline) return '#10b981';
    return '#6b7280';
  };

  const getVerificationBadge = () => {
    const statusColors = {
      pending: '#f59e0b',
      under_review: '#3b82f6',
      approved: '#10b981',
      rejected: '#ef4444'
    };
    return statusColors[driver.verificationStatus] || '#6b7280';
  };

  return (
    <div className="driver-dashboard">
      {/* ✅ RIDE REQUEST MODAL */}
      {showRideModal && rideRequest && (
        <div className="ride-modal-overlay">
          <div className="ride-modal">
            <div className="ride-modal-header">
              <h2>🚗 New Ride Request!</h2>
              <div className="ride-modal-timer">30s</div>
            </div>

            <div className="ride-modal-body">
              <div className="ride-detail">
                <span className="ride-label">📍 Pickup:</span>
                <span className="ride-value">{rideRequest.pickup}</span>
              </div>

              <div className="ride-detail">
                <span className="ride-label">📍 Dropoff:</span>
                <span className="ride-value">{rideRequest.dropoff}</span>
              </div>

              <div className="ride-detail">
                <span className="ride-label">💰 Fare:</span>
                <span className="ride-value">₹{rideRequest.fare}</span>
              </div>

              <div className="ride-detail">
                <span className="ride-label">📏 Distance:</span>
                <span className="ride-value">{rideRequest.distance?.toFixed(1)} km</span>
              </div>

              <div className="ride-detail">
                <span className="ride-label">⏱️ Duration:</span>
                <span className="ride-value">{rideRequest.duration} mins</span>
              </div>
            </div>

            <div className="ride-modal-actions">
              <button
                className="btn-reject"
                onClick={handleRejectRide}
                disabled={acceptingRide}
              >
                ❌ Reject
              </button>
              <button
                className="btn-accept"
                onClick={handleAcceptRide}
                disabled={acceptingRide}
              >
                {acceptingRide ? 'Accepting...' : '✅ Accept Ride'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="dashboard-header">
        <h1>🚕 Driver Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* STATUS CARD */}
      <div className="status-card">
        <div className="status-info">
          <h2>Welcome, {driver.firstName}!</h2>
          <div 
            className="status-badge"
            style={{ background: getStatusColor() }}
          >
            {driver.isOnline ? '🟢 Online' : '⚫ Offline'}
          </div>
        </div>
        
        <button 
          className="toggle-btn"
          onClick={handleToggleOnline}
          disabled={driver.verificationStatus !== 'approved'}
        >
          {driver.isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* LOCATION STATUS CARD */}
      {driver.isOnline && (
        <div className="location-card">
          <h3>📍 Location Status</h3>
          <div className="location-info">
            {currentLocation ? (
              <>
                <p><strong>Latitude:</strong> {currentLocation.latitude?.toFixed(6) || 'N/A'}</p>
                <p><strong>Longitude:</strong> {currentLocation.longitude?.toFixed(6) || 'N/A'}</p>
                <p><strong>Accuracy:</strong> {currentLocation.accuracy ? Math.round(currentLocation.accuracy) + 'm' : 'N/A'}</p>
                <p className="location-status success">
                  🟢 Location tracking active
                </p>
                <p className="location-timestamp">
                  Last update: {formatTimestamp(currentLocation.timestamp)}
                </p>
              </>
            ) : (
              <p className="location-status loading">
                📡 Acquiring location...
              </p>
            )}
          </div>
        </div>
      )}

      {/* LOCATION PERMISSION WARNING */}
      {locationPermission === 'denied' && (
        <div className="error-message">
          <strong>❌ Location Permission Denied</strong>
          <p>Please enable location access in your browser settings to go online and receive ride requests.</p>
        </div>
      )}

      {locationPermission === 'prompt' && !driver.isOnline && (
        <div className="info-message">
          <strong>ℹ️ Location Access Required</strong>
          <p>You'll be asked to allow location access when you go online.</p>
        </div>
      )}

      {/* VERIFICATION STATUS */}
      <div className="verification-card">
        <h3>📋 Account Status</h3>
        <div className="verification-details">
          <div className="detail-row">
            <span>Account Status:</span>
            <span className="status-value">{driver.accountStatus}</span>
          </div>
          <div className="detail-row">
            <span>Verification:</span>
            <span 
              className="status-badge small"
              style={{ background: getVerificationBadge() }}
            >
              {driver.verificationStatus}
            </span>
          </div>
          {driver.rejectionReason && (
            <div className="rejection-reason">
              <strong>Rejection Reason:</strong>
              <p>{driver.rejectionReason}</p>
            </div>
          )}
        </div>

        {driver.verificationStatus === 'pending' && (
          <div className="info-message">
            ℹ️ Your documents are pending review. You'll be notified once approved.
          </div>
        )}
        
        {driver.verificationStatus === 'under_review' && (
          <div className="info-message">
            ⏳ Your documents are under review. This usually takes 24-48 hours.
          </div>
        )}

        {driver.verificationStatus === 'rejected' && (
          <div className="error-message">
            ❌ Your application was rejected. Please contact support.
          </div>
        )}
      </div>

      {/* STATS GRID */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{driver.rating?.average?.toFixed(1) || '0.0'}</div>
          <div className="stat-label">Rating</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-value">{driver.stats?.completedRides || 0}</div>
          <div className="stat-label">Rides</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">₹{driver.earnings?.total?.toFixed(0) || 0}</div>
          <div className="stat-label">Earnings</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{driver.stats?.acceptanceRate || 0}%</div>
          <div className="stat-label">Acceptance</div>
        </div>
      </div>

      {/* VEHICLE INFO */}
      <div className="vehicle-card">
        <h3>🚗 Vehicle Details</h3>
        <div className="vehicle-details">
          <p><strong>Type:</strong> {driver.vehicle?.type || 'N/A'}</p>
          <p><strong>Make:</strong> {driver.vehicle?.make || 'N/A'}</p>
          <p><strong>Model:</strong> {driver.vehicle?.model || 'N/A'}</p>
          <p><strong>Year:</strong> {driver.vehicle?.year || 'N/A'}</p>
          <p><strong>Color:</strong> {driver.vehicle?.color || 'N/A'}</p>
          <p><strong>Registration:</strong> {driver.vehicle?.registrationNumber || 'N/A'}</p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="actions-card">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn">
            📊 View Earnings
          </button>
          <button className="action-btn">
            📜 Ride History
          </button>
          <button className="action-btn">
            ⚙️ Settings
          </button>
          <button className="action-btn">
            📞 Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;