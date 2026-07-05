// services/socket.js
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  socket = null;
  
  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
  
  // Join ride room (for users)
  joinRide(rideId) {
    if (this.socket) {
      this.socket.emit('ride:join', rideId);
      console.log('Joined ride room:', rideId);
    }
  }

  // Join driver room (for drivers)
  joinDriver(driverId) {
    if (this.socket) {
      this.socket.emit('driver:join', driverId);
      console.log('Driver joined:', driverId);
    }
  }
  
  // Listen for driver location updates
  onDriverLocationUpdate(callback) {
    if (this.socket) {
      this.socket.on('driver:location:update', callback);
    }
  }

  // Remove driver location listener
  offDriverLocationUpdate() {
    if (this.socket) {
      this.socket.off('driver:location:update');
    }
  }
  
  // Send location update (for drivers)
  sendLocationUpdate(driverId, latitude, longitude, rideId, speed = 0, heading = 0) {
    if (this.socket) {
      this.socket.emit('driver:location', {
        driverId,
        latitude,
        longitude,
        rideId,
        speed,
        heading,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Listen for new ride requests (for drivers)
  onNewRideRequest(callback) {
    if (this.socket) {
      this.socket.on('new-ride-request', callback);
    }
  }

  // Listen for driver accepted
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Emit custom event
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Listen for ride status changes
  onRideStatusChange(callback) {
    if (this.socket) {
      this.socket.on('ride:status:changed', callback);
    }
  }

  // Listen for driver arrived
  onDriverArrived(callback) {
    if (this.socket) {
      this.socket.on('driver-arrived', callback);
    }
  }

  // Listen for ride started
  onRideStarted(callback) {
    if (this.socket) {
      this.socket.on('ride-started', callback);
    }
  }

  // Listen for ride completed
  onRideCompleted(callback) {
    if (this.socket) {
      this.socket.on('ride-completed', callback);
    }
  }

  // Listen for ride cancelled
  onRideCancelled(callback) {
    if (this.socket) {
      this.socket.on('ride-cancelled', callback);
    }
  }

  // Listen for no driver found
  onNoDriverFound(callback) {
    if (this.socket) {
      this.socket.on('no-driver-found', callback);
    }
  }
}

export default new SocketService();