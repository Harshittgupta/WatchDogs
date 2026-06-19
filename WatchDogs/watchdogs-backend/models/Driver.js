const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const driverSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  alternatePhone: String,
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  profilePicture: String,
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  passwordResetToken: String,
  passwordResetExpire: Date,
  
  // Phone/Email Verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  phoneVerificationOTP: String,
  phoneVerificationExpiry: Date,
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'blocked', 'deactivated'],
    default: 'pending'
  },
  
  // Verification & Documents
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'resubmit_required'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: String,
  
  documents: {
    drivingLicense: {
      number: String,
      frontImage: String,
      backImage: String,
      issueDate: Date,
      expiryDate: Date,
      issuingAuthority: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      rejectionReason: String
    },
    aadhaar: {
      number: String,
      frontImage: String,
      backImage: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      rejectionReason: String
    },
    pan: {
      number: String,
      image: String,
      name: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      rejectionReason: String
    },
    vehicleRC: {
      number: String,
      image: String,
      ownerName: String,
      vehicleClass: String,
      issueDate: Date,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      rejectionReason: String
    },
    insurance: {
      policyNumber: String,
      provider: String,
      image: String,
      issueDate: Date,
      expiryDate: Date,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      rejectionReason: String
    },
    pollutionCert: {
      certificateNumber: String,
      image: String,
      issueDate: Date,
      expiryDate: Date,
      verified: { type: Boolean, default: false },
      verifiedAt: Date
    },
    policeVerification: {
      certificateNumber: String,
      image: String,
      issueDate: Date,
      verified: { type: Boolean, default: false },
      verifiedAt: Date
    }
  },
  
  // Vehicle Information
  vehicle: {
    type: {
      type: String,
      enum: ['bike', 'auto', 'mini', 'sedan', 'suv'],
      required: [true, 'Vehicle type is required']
    },
    make: {
      type: String,
      required: [true, 'Vehicle make is required']
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required']
    },
    year: {
      type: Number,
      required: [true, 'Manufacturing year is required'],
      min: 2000,
      max: new Date().getFullYear() + 1
    },
    color: {
      type: String,
      required: [true, 'Vehicle color is required']
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      uppercase: true
    },
    seatingCapacity: Number,
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'cng', 'electric', 'hybrid']
    },
    images: {
      front: String,
      back: String,
      left: String,
      right: String,
      interior: String
    }
  },
  
  // Location & Availability - UPDATED: Removed default [0,0]
  currentLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]  // [longitude, latitude] - NO DEFAULT
  },
  lastLocationUpdate: Date,
  homeLocation: {
    address: String,
    coordinates: [Number]
  },
  
  // Ratings & Reviews
  rating: {
    average: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  
  // Statistics
  stats: {
    totalRides: { type: Number, default: 0 },
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    cancelledByDriver: { type: Number, default: 0 },
    cancelledByUser: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 100 },
    cancellationRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5.0 },
    onTimePercentage: { type: Number, default: 100 },
    totalDistance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
  },
  
  // Earnings & Payments
  earnings: {
    total: { type: Number, default: 0 },
    today: { type: Number, default: 0 },
    thisWeek: { type: Number, default: 0 },
    thisMonth: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    lastPayout: Date
  },
  
  // Bank Details
  bankDetails: {
    accountNumber: String,
    accountHolderName: String,
    ifscCode: String,
    bankName: String,
    branch: String,
    accountType: {
      type: String,
      enum: ['savings', 'current']
    },
    upiId: String,
    verified: { type: Boolean, default: false },
    verifiedAt: Date
  },
  
  // Address
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    relation: String,
    phone: String,
    address: String
  },
  
  // Current Ride
  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  },
  
  // Work Schedule & Preferences
  workSchedule: {
    monday: { available: Boolean, startTime: String, endTime: String },
    tuesday: { available: Boolean, startTime: String, endTime: String },
    wednesday: { available: Boolean, startTime: String, endTime: String },
    thursday: { available: Boolean, startTime: String, endTime: String },
    friday: { available: Boolean, startTime: String, endTime: String },
    saturday: { available: Boolean, startTime: String, endTime: String },
    sunday: { available: Boolean, startTime: String, endTime: String }
  },
  
  preferences: {
    acceptAutoBookings: { type: Boolean, default: true },
    maxPickupDistance: { type: Number, default: 5 },
    minFare: { type: Number, default: 0 },
    preferredAreas: [String],
    avoidAreas: [String],
    languages: [String]
  },
  
  // Training & Certification
  training: {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    certificateUrl: String,
    expiryDate: Date
  },
  
  // Badges & Achievements
  badges: [{
    type: {
      type: String,
      enum: ['top_rated', 'safe_driver', '100_rides', '500_rides', '1000_rides', 'punctual', 'eco_friendly']
    },
    earnedAt: Date,
    description: String
  }],
  
  // Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  
  // Device Information
  device: {
    fcmToken: String,
    platform: String,
    model: String,
    osVersion: String,
    appVersion: String
  },
  
  // Login History
  lastLogin: Date,
  lastLogout: Date,
  loginCount: { type: Number, default: 0 },
  
  // Suspension/Block Details
  suspensionDetails: {
    reason: String,
    suspendedAt: Date,
    suspendedBy: mongoose.Schema.Types.ObjectId,
    suspensionEndDate: Date,
    notes: String
  },
  
  // Notes (internal)
  internalNotes: String

}, {
  timestamps: true
});

// Indexes
driverSchema.index({ email: 1 });
driverSchema.index({ phone: 1 });
driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ isOnline: 1, isAvailable: 1, accountStatus: 1 });
driverSchema.index({ 'vehicle.type': 1, isOnline: 1, isAvailable: 1 });
driverSchema.index({ 'vehicle.registrationNumber': 1 });
driverSchema.index({ referralCode: 1 });

// Virtual for full name
driverSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
driverSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Hash password before saving
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generate referral code before first save
driverSchema.pre('save', function(next) {
  if (!this.referralCode && this.isNew) {
    this.referralCode = 'DRV' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  next();
});

// Compare password
driverSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
driverSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      type: 'driver',
      email: this.email
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );
};

// Update rating
driverSchema.methods.updateRating = function(newRating) {
  this.rating.breakdown[newRating] = (this.rating.breakdown[newRating] || 0) + 1;
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  this.stats.averageRating = this.rating.average;
  return this.save();
};

// Check if driver can accept ride
driverSchema.methods.canAcceptRide = function() {
  return (
    this.isOnline &&
    this.isAvailable &&
    this.accountStatus === 'active' &&
    this.verificationStatus === 'approved' &&
    !this.currentRide &&
    this.emailVerified &&
    this.phoneVerified
  );
};

// Update location
driverSchema.methods.updateLocation = function(longitude, latitude) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  this.lastLocationUpdate = new Date();
  return this.save();
};

// Calculate acceptance rate
driverSchema.methods.calculateAcceptanceRate = function() {
  if (this.stats.totalRides === 0) return 100;
  const accepted = this.stats.totalRides - this.stats.cancelledByDriver;
  this.stats.acceptanceRate = Math.round((accepted / this.stats.totalRides) * 100);
  return this.stats.acceptanceRate;
};

// Calculate cancellation rate
driverSchema.methods.calculateCancellationRate = function() {
  if (this.stats.totalRides === 0) return 0;
  this.stats.cancellationRate = Math.round((this.stats.cancelledByDriver / this.stats.totalRides) * 100);
  return this.stats.cancellationRate;
};

// Check if all documents are verified
driverSchema.methods.areDocumentsVerified = function() {
  return (
    this.documents.drivingLicense?.verified &&
    this.documents.aadhaar?.verified &&
    this.documents.pan?.verified &&
    this.documents.vehicleRC?.verified &&
    this.documents.insurance?.verified
  );
};

// Generate phone verification OTP
driverSchema.methods.generatePhoneOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.phoneVerificationOTP = otp;
  this.phoneVerificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};

// Verify phone OTP
driverSchema.methods.verifyPhoneOTP = function(otp) {
  if (!this.phoneVerificationOTP || !this.phoneVerificationExpiry) {
    return { success: false, message: 'No OTP found' };
  }
  
  if (this.phoneVerificationExpiry < new Date()) {
    return { success: false, message: 'OTP expired' };
  }
  
  if (this.phoneVerificationOTP === otp.toString()) {
    this.phoneVerified = true;
    this.phoneVerificationOTP = undefined;
    this.phoneVerificationExpiry = undefined;
    return { success: true, message: 'Phone verified successfully' };
  }
  
  return { success: false, message: 'Invalid OTP' };
};

module.exports = mongoose.model('Driver', driverSchema);