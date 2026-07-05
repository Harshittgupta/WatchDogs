import socketService from './socket';
import api from '../config/api';

class DriverLocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.isTracking = false;
    this.updateInterval = null;
  }

  /**
   * Start tracking driver location
   * @param {string} driverId - Driver ID
   * @param {string} rideId - Active ride ID (optional)
   * @returns {boolean} Success status
   */
  startTracking(driverId, rideId = null) {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported by this browser');
      alert('Location tracking is not supported by your browser');
      return false;
    }

    if (this.isTracking) {
      console.log('⚠️ Location tracking already active');
      return true;
    }

    console.log('🗺️ Starting location tracking for driver:', driverId);

    // Watch position with high accuracy
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          timestamp: new Date()
        };

        this.currentLocation = location;
        this.isTracking = true;

        console.log('📍 Location update:', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: Math.round(location.accuracy) + 'm'
        });

        // Update backend
        this.updateBackend(driverId, location, rideId);
        
        // Emit via Socket.IO if ride is active
        if (rideId) {
          this.emitLocationToRide(driverId, rideId, location);
        }
      },
      (error) => {
        console.error('❌ Location error:', error);
        this.handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        distanceFilter: 10 // Update every 10 meters
      }
    );

    return true;
  }

  /**
   * Stop tracking location
   */
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isTracking = false;
    this.currentLocation = null;
    
    console.log('❌ Location tracking stopped');
  }

  /**
   * Update backend with current location (using api.js)
   * @param {string} driverId 
   * @param {Object} location 
   * @param {string} rideId 
   */
  async updateBackend(driverId, location, rideId) {
    try {
      // Use driverToken specifically for driver routes
      const driverToken = localStorage.getItem('driverToken');

      if (!driverToken) {
        console.error('❌ No driver token found');
        return;
      }

      // Make API call using api.js (but with driver token)
      const response = await api.put('/driver/location/update', {
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading
      }, {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });

      if (response.data && !response.data.success) {
        console.error('❌ Failed to update location:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Failed to update backend location:', error);
    }
  }

  /**
   * Emit location update via Socket.IO
   * @param {string} driverId 
   * @param {string} rideId 
   * @param {Object} location 
   */
  emitLocationToRide(driverId, rideId, location) {
    try {
      // Ensure socket is connected
      if (!socketService.isConnected()) {
        socketService.connect();
      }

      // Emit location update
      socketService.emit('driver:location', {
        driverId,
        rideId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: location.timestamp.toISOString()
      });

      console.log('📡 Location emitted via Socket.IO');
    } catch (error) {
      console.error('❌ Failed to emit location:', error);
    }
  }

  /**
   * Handle location errors
   * @param {Object} error 
   */
  handleLocationError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        alert('❌ Location permission denied. Please enable location access in your browser settings.');
        this.stopTracking();
        break;
      case error.POSITION_UNAVAILABLE:
        console.warn('⚠️ Location information unavailable');
        break;
      case error.TIMEOUT:
        console.warn('⚠️ Location request timeout');
        break;
      default:
        console.error('❌ Unknown location error:', error);
    }
  }

  /**
   * Get current location (one-time)
   * @returns {Promise} Location object
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          console.log('📍 Current location:', location);
          resolve(location);
        },
        (error) => {
          console.error('❌ Error getting location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    });
  }

  /**
   * Check location permission status
   * @returns {Promise} Permission state
   */
  async checkPermission() {
    try {
      if (!navigator.permissions) {
        return 'unknown';
      }

      const result = await navigator.permissions.query({ name: 'geolocation' });
      console.log('📍 Location permission:', result.state);
      return result.state; // 'granted', 'denied', 'prompt'
    } catch (error) {
      console.error('Error checking permission:', error);
      return 'unknown';
    }
  }

  /**
   * Request location permission
   * @returns {Promise} Whether permission was granted
   */
  async requestPermission() {
    try {
      const location = await this.getCurrentLocation();
      return true;
    } catch (error) {
      if (error.code === 1) { // PERMISSION_DENIED
        alert('Please enable location permissions to use driver features');
      }
      return false;
    }
  }

  /**
   * Get tracking status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      currentLocation: this.currentLocation,
      lastUpdate: this.currentLocation?.timestamp
    };
  }

  /**
   * Get current location from backend
   * @returns {Promise} Current saved location
   */
  async getCurrentLocationFromBackend() {
    try {
      const driverToken = localStorage.getItem('driverToken');
      
      if (!driverToken) {
        throw new Error('No driver token found');
      }

      const response = await api.get('/driver/location/current', {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get location from backend:', error);
      throw error;
    }
  }

  /**
   * Get nearby rides
   * @returns {Promise} Nearby rides
   */
  async getNearbyRides() {
    try {
      const driverToken = localStorage.getItem('driverToken');
      
      if (!driverToken) {
        throw new Error('No driver token found');
      }

      const response = await api.get('/driver/location/nearby-rides', {
        headers: {
          'Authorization': `Bearer ${driverToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get nearby rides:', error);
      throw error;
    }
  }
}

// Create singleton instance
const driverLocationService = new DriverLocationService();

export default driverLocationService;