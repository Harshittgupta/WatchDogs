const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  
  // Ride Details
  rideType: {
    type: String,
    enum: ['mini', 'sedan', 'suv', 'auto', 'bike'],
    required: true
  },
  
  // Locations with detailed tracking
  pickup: {
    address: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    landmark: String,
    arrivedAt: Date // When driver reached pickup
  },
  
  dropoff: {
    address: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    landmark: String,
    arrivedAt: Date // When reached destination
  },
  
  // Real-time Location Tracking
  routePolyline: String, // Encoded polyline from Google Maps
  trackingPoints: [{
    location: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    speed: Number, // km/h
    heading: Number // Degrees
  }],
  
  // Route Information
  distance: {
    type: Number, // in kilometers
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  actualDuration: Number,
  
  // ✅ FIXED: Current Driver Position (optional - only when driver is assigned)
  driverCurrentLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
    // ✅ NO DEFAULT - prevents empty array creation
  },
  driverETA: Number, // minutes to pickup/destination
  driverDistance: Number, // km from pickup/destination
  lastLocationUpdate: Date,
  
  // Pricing
  estimatedFare: {
    type: Number,
    required: true
  },
  actualFare: Number,
  baseFare: Number,
  distanceFare: Number,
  timeFare: Number,
  surge: {
    type: Number,
    default: 1.0
  },
  discount: {
    type: Number,
    default: 0
  },
  promoCode: {
    code: String,
    discountAmount: Number
  },
  taxes: {
    gst: Number,
    serviceFee: Number
  },
  
  // Status with detailed tracking
  status: {
    type: String,
    enum: [
      'searching',          // Looking for driver
      'driver_assigned',    // Driver found and assigned
      'driver_accepted',    // Driver accepted the ride
      'driver_arriving',    // Driver on the way to pickup
      'driver_arrived',     // Driver reached pickup
      'otp_verified',       // OTP verified, ready to start
      'ride_started',       // Ride in progress
      'ride_completed',     // Ride finished
      'payment_pending',    // Waiting for payment
      'payment_completed',  // Payment done
      'cancelled_by_user',  // User cancelled
      'cancelled_by_driver',// Driver cancelled
      'no_driver_found'     // No driver available
    ],
    default: 'searching'
  },
  
  // OTP for ride verification
  otp: {
    code: String,
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    expiresAt: Date
  },
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'upi', 'paytm', 'googlepay', 'phonepe'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String,
  paymentGateway: String,
  
  // Ratings & Review
  userRating: {
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    tips: Number,
    ratedAt: Date,
    tags: [String] // e.g., ['Clean Car', 'Polite', 'Safe Driving']
  },
  driverRating: {
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    ratedAt: Date
  },
  
  // Timestamps for each stage
  timestamps: {
    requested: { type: Date, default: Date.now },
    driverAssigned: Date,
    driverAccepted: Date,
    driverArriving: Date,
    driverArrived: Date,
    rideStarted: Date,
    rideCompleted: Date,
    paymentCompleted: Date,
    cancelled: Date
  },
  
  // Cancellation
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['user', 'driver', 'system', 'admin']
    },
    reason: String,
    reasonCategory: {
      type: String,
      enum: ['changed_plans', 'found_alternative', 'driver_not_arriving', 'long_wait', 'other']
    },
    fee: { type: Number, default: 0 },
    refundAmount: Number,
    refundStatus: String
  },
  
  // Safety Features
  safety: {
    emergencyContacts: [{
      name: String,
      phone: String,
      notified: { type: Boolean, default: false },
      notifiedAt: Date
    }],
    shareRide: {
      enabled: { type: Boolean, default: false },
      sharedWith: [{
        name: String,
        email: String,
        phone: String,
        shareUrl: String
      }]
    },
    sosActivated: {
      type: Boolean,
      default: false
    },
    sosTimestamp: Date,
    sosLocation: [Number],
    sosHandledBy: String
  },
  
  // Vehicle Info (cached from driver)
  vehicle: {
  type: {
    type: String,  
    enum: ['bike', 'auto', 'mini', 'sedan', 'suv']
  },
  make: { type: String },
  model: { type: String },
  color: { type: String },
  registrationNumber: { type: String }
},
  
  // Additional Info
  notes: String,
  specialRequests: [String],
  
  // Analytics
  analytics: {
    searchTime: Number, // seconds to find driver
    acceptanceTime: Number, // seconds for driver to accept
    arrivalTime: Number, // seconds for driver to arrive
    waitTime: Number, // seconds user waited at pickup
    deviceInfo: {
      platform: String,
      version: String,
      appVersion: String
    }
  }
  
}, {
  timestamps: true
});

// Geospatial indexes for location-based queries
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'dropoff.coordinates': '2dsphere' });
// ✅ FIXED: Sparse index - only indexes documents that have this field
rideSchema.index({ 'driverCurrentLocation': '2dsphere' }, { sparse: true });

// Regular indexes
rideSchema.index({ user: 1, status: 1, createdAt: -1 });
rideSchema.index({ driver: 1, status: 1, createdAt: -1 });
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ 'timestamps.requested': -1 });

// Virtual for total fare with all components
rideSchema.virtual('totalFare').get(function() {
  if (this.actualFare) return this.actualFare;
  
  let fare = this.estimatedFare * this.surge;
  fare -= this.discount;
  
  if (this.taxes) {
    fare += (this.taxes.gst || 0) + (this.taxes.serviceFee || 0);
  }
  
  return Math.round(fare);
});

// Virtual for ride duration in minutes
rideSchema.virtual('rideDuration').get(function() {
  if (this.timestamps.rideCompleted && this.timestamps.rideStarted) {
    return Math.round((this.timestamps.rideCompleted - this.timestamps.rideStarted) / (1000 * 60));
  }
  return null;
});

// Calculate fare based on distance, time, and ride type
rideSchema.methods.calculateFare = function() {
  const baseFares = {
    bike: { base: 20, perKm: 10, perMin: 1 },
    auto: { base: 30, perKm: 12, perMin: 1.5 },
    mini: { base: 50, perKm: 15, perMin: 2 },
    sedan: { base: 80, perKm: 18, perMin: 2.5 },
    suv: { base: 120, perKm: 22, perMin: 3 }
  };
  
  const fare = baseFares[this.rideType];
  if (!fare) return 0;
  
  this.baseFare = fare.base;
  this.distanceFare = this.distance * fare.perKm;
  this.timeFare = this.estimatedDuration * fare.perMin;
  
  const totalFare = this.baseFare + this.distanceFare + this.timeFare;
  
  // Add taxes
  this.taxes = {
    gst: Math.round(totalFare * 0.05), // 5% GST
    serviceFee: Math.round(totalFare * 0.02) // 2% service fee
  };
  
  return Math.round(totalFare);
};

// Check if ride can be cancelled without fee
rideSchema.methods.canCancelFree = function() {
  if (this.status === 'searching' || this.status === 'driver_assigned') {
    return true;
  }
  
  if (this.status === 'driver_accepted' && this.timestamps.driverAccepted) {
    const minutesSinceAccepted = (Date.now() - this.timestamps.driverAccepted) / (1000 * 60);
    return minutesSinceAccepted < 5; // Free cancellation within 5 minutes
  }
  
  return false;
};

// Generate OTP for ride verification
rideSchema.methods.generateOTP = function() {
  const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
  this.otp = {
    code: otp,
    verified: false,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
  };
  return otp;
};

// Verify OTP
rideSchema.methods.verifyOTP = function(code) {
  if (!this.otp || !this.otp.code) return false;
  
  if (this.otp.expiresAt < new Date()) {
    return { success: false, message: 'OTP expired' };
  }
  
  if (this.otp.code === code.toString()) {
    this.otp.verified = true;
    this.otp.verifiedAt = new Date();
    this.status = 'otp_verified';
    return { success: true, message: 'OTP verified successfully' };
  }
  
  return { success: false, message: 'Invalid OTP' };
};

// Add tracking point
rideSchema.methods.addTrackingPoint = function(location, speed, heading) {
  this.trackingPoints.push({
    location,
    speed,
    heading,
    timestamp: new Date()
  });
  
  // Keep only last 100 points to avoid document size issues
  if (this.trackingPoints.length > 100) {
    this.trackingPoints = this.trackingPoints.slice(-100);
  }
};

// Update driver location
rideSchema.methods.updateDriverLocation = function(longitude, latitude) {
  this.driverCurrentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  this.lastLocationUpdate = new Date();
};

module.exports = mongoose.model('Ride', rideSchema);