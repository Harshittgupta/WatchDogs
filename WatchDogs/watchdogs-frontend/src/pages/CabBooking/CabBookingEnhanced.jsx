import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socket';
import './CabBookingEnhanced.css';

// Google Maps component will be loaded separately
const CabBookingEnhanced = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('book');
  const [step, setStep] = useState(1);
  
  const [pickup, setPickup] = useState({ address: '', coordinates: null });
  const [dropoff, setDropoff] = useState({ address: '', coordinates: null });
  
  const [estimates, setEstimates] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [polyline, setPolyline] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [rideHistory, setRideHistory] = useState([]);
  
  // Google Maps refs
  const mapRef = useRef(null);
  const pickupAutocompleteRef = useRef(null);
  const dropoffAutocompleteRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);

  const rideTypes = [
    { 
      id: 'bike', 
      name: 'Bike', 
      icon: '🏍️', 
      description: 'Affordable bike rides',
      capacity: '1 person'
    },
    { 
      id: 'auto', 
      name: 'Auto', 
      icon: '🛺', 
      description: 'Quick and economical',
      capacity: '3 people'
    },
    { 
      id: 'mini', 
      name: 'Mini', 
      icon: '🚗', 
      description: 'Compact & comfortable',
      capacity: '4 people'
    },
    { 
      id: 'sedan', 
      name: 'Sedan', 
      icon: '🚙', 
      description: 'Spacious sedans',
      capacity: '4 people'
    },
    { 
      id: 'suv', 
      name: 'SUV', 
      icon: '🚐', 
      description: 'Premium SUVs',
      capacity: '6-7 people'
    }
  ];

  useEffect(() => {
    checkActiveRide();
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadRideHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeRide) {
      connectSocketAndTrack();
    }
  }, [activeRide]);

  const loadGoogleMapsScript = () => {
    if (window.google) {
      initializeAutocomplete();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = initializeAutocomplete;
    document.head.appendChild(script);
  };

  const initializeAutocomplete = () => {
    if (!window.google) return;

    // Pickup autocomplete
    if (pickupAutocompleteRef.current) {
      const pickupAutocomplete = new window.google.maps.places.Autocomplete(
        pickupAutocompleteRef.current,
        { types: ['geocode'] }
      );

      pickupAutocomplete.addListener('place_changed', () => {
        const place = pickupAutocomplete.getPlace();
        if (place.geometry) {
          setPickup({
            address: place.formatted_address,
            coordinates: [
              place.geometry.location.lng(),
              place.geometry.location.lat()
            ]
          });
        }
      });
    }

    // Dropoff autocomplete
    if (dropoffAutocompleteRef.current) {
      const dropoffAutocomplete = new window.google.maps.places.Autocomplete(
        dropoffAutocompleteRef.current,
        { types: ['geocode'] }
      );

      dropoffAutocomplete.addListener('place_changed', () => {
        const place = dropoffAutocomplete.getPlace();
        if (place.geometry) {
          setDropoff({
            address: place.formatted_address,
            coordinates: [
              place.geometry.location.lng(),
              place.geometry.location.lat()
            ]
          });
        }
      });
    }
  };

  const handleGetCurrentLocation = (type) => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = [position.coords.longitude, position.coords.latitude];
          
          // Reverse geocode
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            const address = data.results[0]?.formatted_address || 'Current Location';
            
            if (type === 'pickup') {
              setPickup({ address, coordinates: coords });
            } else {
              setDropoff({ address, coordinates: coords });
            }
            
            alert('✅ Location captured!');
          } catch (error) {
            console.error('Geocoding error:', error);
            if (type === 'pickup') {
              setPickup({ 
                address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                coordinates: coords 
              });
            } else {
              setDropoff({ 
                address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                coordinates: coords 
              });
            }
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          setLoading(false);
          alert('Failed to get location. Please enter manually or check permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const checkActiveRide = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/rides/active', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.hasActiveRide) {
        setActiveRide(data.ride);
        setActiveTab('tracking');
        
        // Show OTP modal if driver accepted
        if (data.ride.status === 'driver_accepted' && !data.ride.otp?.verified) {
          setShowOTPModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking active ride:', error);
    }
  };

  const connectSocketAndTrack = () => {
    socketService.connect();
    socketService.joinRide(activeRide._id);
    
    // Listen for driver location updates
    socketService.onDriverLocationUpdate((location) => {
      console.log('Driver location update:', location);
      setDriverLocation(location);
      updateDriverMarkerOnMap(location);
    });

    // Listen for driver accepted
    socketService.on('driver-accepted', (data) => {
      console.log('Driver accepted:', data);
      setActiveRide(prev => ({ ...prev, driver: data.driver, otp: data.otp }));
      setShowOTPModal(true);
      alert('🎉 Driver found! Please verify OTP to start ride.');
    });

    // Listen for ride started
    socketService.on('ride-started', () => {
      setShowOTPModal(false);
      alert('🚀 Ride started! Enjoy your journey.');
    });

    // Listen for ride completed
    socketService.on('ride-completed', (data) => {
      alert(`✅ Ride completed! Total fare: ₹${data.fare}`);
      setActiveRide(null);
      setActiveTab('book');
    });
  };

  const handleGetEstimates = async () => {
    if (!pickup.address || !pickup.coordinates) {
      alert('❌ Please enter pickup location');
      return;
    }

    if (!dropoff.address || !dropoff.coordinates) {
      alert('❌ Please enter dropoff location');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/rides/estimate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickup: {
            address: pickup.address,
            coordinates: pickup.coordinates
          },
          dropoff: {
            address: dropoff.address,
            coordinates: dropoff.coordinates
          },
          rideType: 'mini'
        })
      });

      const data = await response.json();

      if (data.success) {
        setEstimates(data.estimates);
        setPolyline(data.polyline);
        setStep(2);
      } else {
        alert('Failed to get estimates: ' + data.message);
      }
    } catch (error) {
      console.error('Error getting estimates:', error);
      alert('Failed to get estimates');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!selectedRide) {
      alert('❌ Please select a ride type');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/rides/book', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickup: {
            address: pickup.address,
            coordinates: pickup.coordinates
          },
          dropoff: {
            address: dropoff.address,
            coordinates: dropoff.coordinates
          },
          rideType: selectedRide,
          paymentMethod: 'cash'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Ride booked! Searching for drivers...');
        setActiveRide(data.ride);
        setActiveTab('tracking');
        
        // Reset booking form
        setStep(1);
        setPickup({ address: '', coordinates: null });
        setDropoff({ address: '', coordinates: null });
        setEstimates(null);
        setSelectedRide(null);
      } else {
        alert('Failed to book ride: ' + data.message);
      }
    } catch (error) {
      console.error('Error booking ride:', error);
      alert('Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      alert('❌ Please enter 4-digit OTP');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/rides/${activeRide._id}/verify-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ OTP verified! Ride starting...');
        setShowOTPModal(false);
        setOtp('');
        setActiveRide(data.ride);
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Failed to verify OTP');
    }
  };

  const handleCancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/rides/${activeRide._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'User cancelled',
          reasonCategory: 'changed_plans'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setActiveRide(null);
        setActiveTab('book');
        socketService.disconnect();
      } else {
        alert('Failed to cancel ride: ' + data.message);
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      alert('Failed to cancel ride');
    }
  };

  const loadRideHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/rides/history', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRideHistory(data.rides);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const initializeTrackingMap = () => {
    if (!window.google || !mapRef.current || !activeRide) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: {
        lat: activeRide.pickup.coordinates.coordinates[1],
        lng: activeRide.pickup.coordinates.coordinates[0]
      },
      zoom: 14,
      styles: [/* Add dark theme styles */]
    });

    mapInstanceRef.current = map;

    // Add pickup marker
    new window.google.maps.Marker({
      position: {
        lat: activeRide.pickup.coordinates.coordinates[1],
        lng: activeRide.pickup.coordinates.coordinates[0]
      },
      map,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      },
      title: 'Pickup'
    });

    // Add dropoff marker
    new window.google.maps.Marker({
      position: {
        lat: activeRide.dropoff.coordinates.coordinates[1],
        lng: activeRide.dropoff.coordinates.coordinates[0]
      },
      map,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
      },
      title: 'Dropoff'
    });

    // Draw route if polyline exists
    if (activeRide.routePolyline) {
      const decodedPath = window.google.maps.geometry.encoding.decodePath(activeRide.routePolyline);
      routePolylineRef.current = new window.google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });
    }
  };

  const updateDriverMarkerOnMap = (location) => {
    if (!mapInstanceRef.current || !window.google) return;

    const position = {
      lat: location.latitude,
      lng: location.longitude
    };

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(position);
    } else {
      driverMarkerRef.current = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Driver'
      });
    }

    // Center map on driver
    mapInstanceRef.current.panTo(position);
  };

  useEffect(() => {
    if (activeTab === 'tracking' && activeRide) {
      setTimeout(() => initializeTrackingMap(), 500);
    }
  }, [activeTab, activeRide]);

  const getStatusText = (status) => {
    const statusMap = {
      searching: '🔍 Searching for driver...',
      driver_accepted: '✅ Driver accepted!',
      driver_arriving: '🚗 Driver is on the way',
      driver_arrived: '📍 Driver has arrived',
      ride_started: '🏁 Ride in progress',
      ride_completed: '✅ Ride completed',
      cancelled_by_user: '❌ Ride cancelled',
      cancelled_by_driver: '❌ Cancelled by driver'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      searching: '#f59e0b',
      driver_accepted: '#10b981',
      driver_arriving: '#3b82f6',
      driver_arrived: '#8b5cf6',
      ride_started: '#06b6d4',
      ride_completed: '#10b981',
      cancelled_by_user: '#ef4444',
      cancelled_by_driver: '#ef4444'
    };
    return colorMap[status] || '#6b7280';
  };

  // Render functions for each step/tab
  const renderBookingStep1 = () => (
    <div className="booking-step">
      <h3>📍 Where to?</h3>

      <div className="location-input-group">
        <label>Pickup Location</label>
        <div className="input-with-button">
          <input
            ref={pickupAutocompleteRef}
            type="text"
            value={pickup.address}
            onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
            placeholder="Search or enter pickup address"
          />
          <button 
            className="location-btn"
            onClick={() => handleGetCurrentLocation('pickup')}
            disabled={loading}
          >
            📍
          </button>
        </div>
      </div>

      <div className="location-input-group">
        <label>Dropoff Location</label>
        <div className="input-with-button">
          <input
            ref={dropoffAutocompleteRef}
            type="text"
            value={dropoff.address}
            onChange={(e) => setDropoff({ ...dropoff, address: e.target.value })}
            placeholder="Search or enter dropoff address"
          />
          <button 
            className="location-btn"
            onClick={() => handleGetCurrentLocation('dropoff')}
            disabled={loading}
          >
            📍
          </button>
        </div>
      </div>

      <button 
        className="btn-primary full-width"
        onClick={handleGetEstimates}
        disabled={loading || !pickup.coordinates || !dropoff.coordinates}
      >
        {loading ? 'Getting Estimates...' : '🔍 Get Fare Estimates'}
      </button>
    </div>
  );

  const renderBookingStep2 = () => (
    <div className="booking-step">
      <button className="back-btn" onClick={() => setStep(1)}>
        ← Back
      </button>

      <h3>🚗 Choose Your Ride</h3>

      <div className="route-summary">
        <div className="route-item">
          <span className="route-label">From:</span>
          <span className="route-value">{pickup.address}</span>
        </div>
        <div className="route-item">
          <span className="route-label">To:</span>
          <span className="route-value">{dropoff.address}</span>
        </div>
      </div>

      <div className="ride-types-list">
        {rideTypes.map(type => {
          const estimate = estimates?.[type.id];
          if (!estimate) return null;

          return (
            <div 
              key={type.id}
              className={`ride-type-card ${selectedRide === type.id ? 'selected' : ''}`}
              onClick={() => setSelectedRide(type.id)}
            >
              <div className="ride-icon">{type.icon}</div>
              <div className="ride-info">
                <h4>{type.name}</h4>
                <p className="ride-description">{type.description}</p>
                <p className="ride-capacity">{type.capacity}</p>
                <div className="ride-details">
                  <span>🕐 {estimate.duration} min</span>
                  <span>📏 {estimate.distance} km</span>
                </div>
              </div>
              <div className="ride-price">
                <span className="price">₹{estimate.estimatedFare}</span>
                {estimate.surge > 1 && (
                  <span className="surge">{estimate.surge}x</span>
                )}
                <small className="price-breakdown">
                  Base: ₹{estimate.baseFare} + Distance: ₹{estimate.distanceFare}
                </small>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        className="btn-primary full-width"
        onClick={handleBookRide}
        disabled={!selectedRide || loading}
      >
        {loading ? 'Booking...' : '🎯 Confirm Booking'}
      </button>
    </div>
  );

  const renderTracking = () => {
    if (!activeRide) return null;

    return (
      <div className="tracking-container">
        <div 
          className="status-banner"
          style={{ background: getStatusColor(activeRide.status) }}
        >
          {getStatusText(activeRide.status)}
        </div>

        {/* Google Map for tracking */}
        <div ref={mapRef} className="tracking-map"></div>

        {activeRide.driver && (
          <div className="driver-card">
            <div className="driver-header">
              <div className="driver-avatar">
                {activeRide.driver.profilePicture ? (
                  <img src={activeRide.driver.profilePicture} alt="Driver" />
                ) : (
                  <span>👨‍✈️</span>
                )}
              </div>
              <div className="driver-info">
                <h4>{activeRide.driver.firstName} {activeRide.driver.lastName}</h4>
                <div className="driver-rating">
                  ⭐ {activeRide.driver.rating?.average?.toFixed(1) || '5.0'}
                </div>
                <div className="vehicle-info">
                  {activeRide.vehicle.color} {activeRide.vehicle.make} {activeRide.vehicle.model}
                  <br />
                  <strong>{activeRide.vehicle.registrationNumber}</strong>
                </div>
              </div>
            </div>

            {driverLocation && (
              <div className="eta-info">
                <div className="eta-item">
                  <span className="eta-label">ETA:</span>
                  <span className="eta-value">{activeRide.driverETA} min</span>
                </div>
                <div className="eta-item">
                  <span className="eta-label">Distance:</span>
                  <span className="eta-value">{activeRide.driverDistance?.toFixed(1)} km</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="ride-details-card">
          <div className="detail-row">
            <span className="label">Pickup:</span>
            <span className="value">{activeRide.pickup.address}</span>
          </div>
          <div className="detail-row">
            <span className="label">Dropoff:</span>
            <span className="value">{activeRide.dropoff.address}</span>
          </div>
          <div className="detail-row">
            <span className="label">Fare:</span>
            <span className="value">₹{activeRide.estimatedFare}</span>
          </div>
        </div>

        {['searching', 'driver_accepted', 'driver_arriving', 'driver_arrived'].includes(activeRide.status) && (
          <button 
            className="btn-danger full-width"
            onClick={handleCancelRide}
          >
            ❌ Cancel Ride
          </button>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="history-container">
      <h3>📜 Ride History</h3>

      {rideHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚗</div>
          <p>No rides yet</p>
        </div>
      ) : (
        <div className="history-list">
          {rideHistory.map(ride => (
            <div key={ride._id} className="history-card">
              <div className="history-header">
                <span className="ride-type">{ride.rideType}</span>
                <span className="ride-date">
                  {new Date(ride.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="history-route">
                <div className="route-point">
                  <span className="point-icon">🟢</span>
                  <span>{ride.pickup.address}</span>
                </div>
                <div className="route-line"></div>
                <div className="route-point">
                  <span className="point-icon">🔴</span>
                  <span>{ride.dropoff.address}</span>
                </div>
              </div>

              <div className="history-footer">
                <span 
                  className="status-badge"
                  style={{ background: getStatusColor(ride.status) }}
                >
                  {ride.status.replace(/_/g, ' ')}
                </span>
                <span className="fare">₹{ride.actualFare || ride.estimatedFare}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // OTP Modal
  const renderOTPModal = () => {
    if (!showOTPModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowOTPModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowOTPModal(false)}>
            ×
          </button>

          <h2>🔐 Verify OTP</h2>
          <p>Enter the 4-digit OTP shared by your driver</p>

          <input
            type="text"
            className="otp-input"
            maxLength="4"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter OTP"
            autoFocus
          />

          <button 
            className="btn-primary full-width"
            onClick={handleVerifyOTP}
            disabled={otp.length !== 4}
          >
            ✅ Verify & Start Ride
          </button>

          {activeRide?.otp?.code && (
            <small className="otp-hint">OTP: {activeRide.otp.code}</small>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="cab-booking-enhanced">
      <div className="cab-header">
        <h1>🚕 WatchDogs Rides</h1>
        <p>Safe, reliable rides with real-time tracking</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'book' ? 'active' : ''}`}
          onClick={() => setActiveTab('book')}
        >
          🎯 Book Ride
        </button>
        <button
          className={`tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => {
            if (activeRide) {
              setActiveTab('tracking');
            } else {
              alert('No active ride');
            }
          }}
          disabled={!activeRide}
        >
          📍 Track
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'book' && (
          step === 1 ? renderBookingStep1() : renderBookingStep2()
        )}
        {activeTab === 'tracking' && renderTracking()}
        {activeTab === 'history' && renderHistory()}
      </div>

      {renderOTPModal()}
    </div>
  );
};

export default CabBookingEnhanced;