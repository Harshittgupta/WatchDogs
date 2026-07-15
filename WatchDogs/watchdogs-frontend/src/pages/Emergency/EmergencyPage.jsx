import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './EmergencyPage.css';

const EmergencyPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [emergencyType, setEmergencyType] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getUserLocation();
    checkActiveEmergency();
  }, []);

  // Countdown timer for emergency trigger
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      triggerEmergency();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Please enable location services to use emergency features');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const checkActiveEmergency = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/emergency/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.hasActiveEmergency) {
        setActiveEmergency(data.emergency);
      }
    } catch (error) {
      console.error('Error checking emergency status:', error);
    }
  };

  const handleEmergencySelect = (type) => {
    setEmergencyType(type);
    setShowConfirm(true);
  };

  const startCountdown = () => {
    setShowConfirm(false);
    setCountdown(5); // 5 second countdown
  };

  const cancelCountdown = () => {
    setCountdown(null);
    setShowConfirm(false);
    setEmergencyType(null);
  };

  const triggerEmergency = async () => {
    if (!location) {
      alert('Cannot trigger emergency without location. Please enable GPS.');
      setCountdown(null);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Get address from coordinates
      const locationName = await getAddressFromCoords(location.latitude, location.longitude);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/emergency/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emergencyLevel: 3,
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: locationName || 'Unknown Location',
          emergencyType: emergencyType?.id || 'other',
          notes: notes || `Emergency: ${emergencyType?.name}`
        })
      });

      const data = await response.json();

      if (data.success) {
        setActiveEmergency(data.emergency);
        alert('🚨 EMERGENCY ACTIVATED!\n\nYour emergency contacts and local authorities have been notified.\n\nHelp is on the way!');
        setCountdown(null);
        setNotes('');
      } else {
        alert('Failed to trigger emergency: ' + data.message);
      }
    } catch (error) {
      console.error('Error triggering emergency:', error);
      alert('Failed to trigger emergency. Please call emergency services directly.');
    } finally {
      setLoading(false);
    }
  };

  const resolveEmergency = async () => {
    if (!activeEmergency) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/emergency/${activeEmergency._id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: 'Emergency resolved by user'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Emergency has been resolved.\n\nYour contacts have been notified that you are safe.');
        setActiveEmergency(null);
      }
    } catch (error) {
      console.error('Error resolving emergency:', error);
      alert('Failed to resolve emergency');
    }
  };

  const cancelEmergency = async () => {
    if (!activeEmergency) return;

    if (!confirm('Are you sure you want to cancel this emergency?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/emergency/${activeEmergency._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('Emergency cancelled');
        setActiveEmergency(null);
      }
    } catch (error) {
      console.error('Error cancelling emergency:', error);
    }
  };

  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const callEmergencyNumber = (number) => {
    if (confirm(`Call ${number}?\n\nThis will open your phone dialer.`)) {
      window.location.href = `tel:${number}`;
    }
  };

  const emergencyTypes = [
    { 
      id: 'medical', 
      name: 'Medical Emergency', 
      icon: '🚑', 
      number: '102', 
      color: '#ef4444',
      description: 'Serious injury or health issue'
    },
    { 
      id: 'police', 
      name: 'Police Emergency', 
      icon: '👮', 
      number: '100', 
      color: '#3b82f6',
      description: 'Crime, assault, or threat'
    },
    { 
      id: 'fire', 
      name: 'Fire Emergency', 
      icon: '🚒', 
      number: '101', 
      color: '#f59e0b',
      description: 'Fire or explosion'
    },
    { 
      id: 'accident', 
      name: 'Accident', 
      icon: '🚗', 
      number: '112', 
      color: '#8b5cf6',
      description: 'Traffic or other accident'
    },
    { 
      id: 'assault', 
      name: 'Assault/Threat', 
      icon: '⚠️', 
      number: '112', 
      color: '#dc2626',
      description: 'Being attacked or threatened'
    },
    { 
      id: 'theft', 
      name: 'Theft/Robbery', 
      icon: '🚨', 
      number: '100', 
      color: '#059669',
      description: 'Property stolen or robbery'
    },
    { 
      id: 'lost', 
      name: 'Lost/Stranded', 
      icon: '🗺️', 
      number: '112', 
      color: '#0891b2',
      description: 'Lost or need help finding way'
    },
    { 
      id: 'other', 
      name: 'Other Emergency', 
      icon: '🆘', 
      number: '112', 
      color: '#6366f1',
      description: 'Any other urgent situation'
    },
  ];

  // If there's an active emergency, show status screen
  if (activeEmergency) {
    return (
      <div className="emergency-page active">
        <div className="emergency-container">
          <div className="emergency-active-header">
            <div className="pulse-circle">
              <div className="pulse-dot"></div>
            </div>
            <h1>🚨 EMERGENCY ACTIVE</h1>
            <p>Help is on the way</p>
          </div>

          <div className="emergency-status-card">
            <h2>Emergency Details</h2>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Type:</span>
                <span className="status-value">{activeEmergency.emergencyType}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Triggered:</span>
                <span className="status-value">
                  {new Date(activeEmergency.triggeredAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Location:</span>
                <span className="status-value">{activeEmergency.locationName}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Notifications Sent:</span>
                <span className="status-value">{activeEmergency.notifications.length}</span>
              </div>
            </div>
          </div>

          <div className="emergency-notifications">
            <h3>📢 Notifications Sent To:</h3>
            <ul>
              {activeEmergency.notifications.map((notif, idx) => (
                <li key={idx}>
                  {notif.recipientName} ({notif.notificationMethod})
                  <span className={`status-badge ${notif.status}`}>
                    {notif.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="emergency-actions-active">
            <button onClick={resolveEmergency} className="btn-resolve">
              ✅ I'm Safe Now - Resolve Emergency
            </button>
            <button onClick={callEmergencyNumber.bind(null, '112')} className="btn-call">
              📞 Call Emergency Services (112)
            </button>
            <button onClick={cancelEmergency} className="btn-cancel">
              Cancel Emergency
            </button>
          </div>

          <div className="emergency-tips">
            <h4>While Waiting for Help:</h4>
            <ul>
              <li>Stay calm and in a safe location if possible</li>
              <li>Keep your phone charged and on</li>
              <li>Follow emergency dispatcher instructions</li>
              <li>Don't move if injured unless in immediate danger</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Countdown screen
  if (countdown !== null) {
    return (
      <div className="emergency-page countdown">
        <div className="emergency-container">
          <div className="countdown-display">
            <h1>Emergency Activating In</h1>
            <div className="countdown-number">{countdown}</div>
            <p>Authorities and contacts will be notified</p>
          </div>

          <button onClick={cancelCountdown} className="btn-cancel-countdown">
            ❌ CANCEL
          </button>
        </div>
      </div>
    );
  }

  // Confirmation dialog
  if (showConfirm && emergencyType) {
    return (
      <div className="emergency-page confirm">
        <div className="emergency-container">
          <div className="confirm-header">
            <div className="confirm-icon" style={{ background: emergencyType.color }}>
              {emergencyType.icon}
            </div>
            <h1>Confirm {emergencyType.name}</h1>
            <p>{emergencyType.description}</p>
          </div>

          <div className="confirm-details">
            <h3>What will happen:</h3>
            <ul>
              <li>🚨 Emergency alert sent to local authorities</li>
              <li>📞 Your emergency contacts will be notified via SMS and email</li>
              <li>📍 Your exact location will be shared</li>
              <li>🆔 Your Digital ID and medical info will be broadcasted</li>
              <li>📡 Real-time location tracking will be activated</li>
            </ul>
          </div>

          <div className="confirm-location">
            <h4>Your Current Location:</h4>
            <p>
              {location 
                ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : 'Getting location...'}
            </p>
            <small>Accuracy: ±{location?.accuracy?.toFixed(0) || '?'}m</small>
          </div>

          <div className="confirm-notes">
            <label>Additional Information (Optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., 'Inside blue building', 'Near fountain', 'With group of 3 people'"
              rows={3}
            />
          </div>

          <div className="confirm-actions">
            <button 
              onClick={startCountdown} 
              className="btn-confirm"
              style={{ background: emergencyType.color }}
              disabled={!location}
            >
              🚨 TRIGGER EMERGENCY
            </button>
            <button 
              onClick={() => {
                setShowConfirm(false);
                setEmergencyType(null);
              }} 
              className="btn-back"
            >
              ← Go Back
            </button>
          </div>

          <div className="confirm-call">
            <p>Or call directly:</p>
            <button 
              onClick={() => callEmergencyNumber(emergencyType.number)}
              className="btn-call-direct"
            >
              📞 Call {emergencyType.number}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main emergency selection screen
  return (
    <div className="emergency-page">
      <div className="emergency-container">
        <div className="emergency-header">
          <div className="emergency-icon">🚨</div>
          <h1>Emergency Response Center</h1>
          <p className="emergency-subtitle">
            Select your emergency type. Help will be dispatched immediately.
          </p>
        </div>

        {location && (
          <div className="location-card">
            <div className="location-icon">📍</div>
            <div className="location-info">
              <h3>Your Current Location</h3>
              <p>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
              <small>Accuracy: ±{location.accuracy.toFixed(0)}m</small>
              <small>Last updated: {location.timestamp.toLocaleTimeString()}</small>
            </div>
            <button onClick={getUserLocation} className="btn-refresh">
              🔄 Refresh
            </button>
          </div>
        )}

        {!location && (
          <div className="location-warning">
            ⚠️ Getting your location... Please enable GPS for emergency services.
          </div>
        )}

        <div className="emergency-types-grid">
          {emergencyTypes.map(type => (
            <button
              key={type.id}
              className="emergency-type-card"
              onClick={() => handleEmergencySelect(type)}
              disabled={loading || !location}
            >
              <div 
                className="emergency-card-icon" 
                style={{ background: type.color }}
              >
                {type.icon}
              </div>
              <h3>{type.name}</h3>
              <p className="emergency-description">{type.description}</p>
              <span className="emergency-number">📞 {type.number}</span>
            </button>
          ))}
        </div>

        <div className="emergency-info">
          <h3>ℹ️ How It Works</h3>
          <div className="info-steps">
            <div className="info-step">
              <span className="step-number">1</span>
              <p>Select emergency type</p>
            </div>
            <div className="info-step">
              <span className="step-number">2</span>
              <p>Confirm details</p>
            </div>
            <div className="info-step">
              <span className="step-number">3</span>
              <p>Emergency activated</p>
            </div>
            <div className="info-step">
              <span className="step-number">4</span>
              <p>Help dispatched</p>
            </div>
          </div>
        </div>

        <div className="emergency-contacts-preview">
          <h3>👥 Your Emergency Contacts</h3>
          {user?.emergencyContacts && user.emergencyContacts.length > 0 ? (
            <ul>
              {user.emergencyContacts.slice(0, 3).map((contact, idx) => (
                <li key={idx}>
                  {contact.name} - {contact.phone}
                </li>
              ))}
              {user.emergencyContacts.length > 3 && (
                <li>+ {user.emergencyContacts.length - 3} more</li>
              )}
            </ul>
          ) : (
            <p className="no-contacts">
              ⚠️ No emergency contacts set. 
              <button onClick={() => navigate('/profile')}>Add Now</button>
            </p>
          )}
        </div>

        <div className="emergency-footer">
          <button onClick={() => navigate('/dashboard')} className="btn-back-dashboard">
            ← Back to Dashboard
          </button>
          <button 
            onClick={() => navigate('/emergency/history')} 
            className="btn-history"
          >
            📋 Emergency History
          </button>
        </div>

        <div className="emergency-disclaimer">
          <small>
            ⚠️ Only use emergency features in genuine emergency situations. 
            False alarms may result in fines and account suspension.
          </small>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPage;