const mongoose = require('mongoose');

const digitalIdSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  idNumber: {
    type: String,
    unique: true,
    // REMOVED required: true - This is auto-generated in pre-save hook
  },
  qrCode: {
    type: String, // Base64 encoded QR code
    required: true
  },
  
  // Personal Information
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    nationality: { type: String, required: true },
    photo: String // Base64 encoded photo
  },

  // KYC Documents
  kycDocuments: [{
    documentType: {
      type: String,
      enum: ['passport', 'visa', 'national_id', 'driving_license'],
      required: true
    },
    documentNumber: { type: String, required: true },
    issuingCountry: String,
    issueDate: Date,
    expiryDate: Date,
    documentImage: String, // Base64 encoded
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Travel Information
  travelInfo: {
    entryPoint: String,
    entryType: {
      type: String,
      enum: ['airport', 'seaport', 'land_border']
    },
    entryDate: Date,
    exitDate: Date,
    destinations: [String],
    purposeOfVisit: {
      type: String,
      enum: ['tourism', 'business', 'education', 'medical', 'other']
    },
    accommodation: String
  },

  // Biometric Data (optional - for future enhancement)
  biometrics: {
    faceId: String,
    fingerprintId: String
  },

  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'in_review', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationNotes: String,

  // Usage Tracking
  lastUsed: Date,
  usageCount: { type: Number, default: 0 },
  checkpoints: [{
    location: String,
    checkpointType: {
      type: String,
      enum: ['airport_checkin', 'security', 'immigration', 'customs', 'hotel', 'tourist_site']
    },
    timestamp: { type: Date, default: Date.now },
    verifiedBy: String // Officer name/ID
  }],

  // Status
  isActive: { type: Boolean, default: true },
  expiresAt: Date,
  
  // Security
  accessPin: String, // Hashed 6-digit PIN
  lastAccessAttempt: Date,
  failedAccessAttempts: { type: Number, default: 0 }

}, {
  timestamps: true
});

// Generate unique ID number BEFORE validation
digitalIdSchema.pre('validate', function(next) {
  if (!this.idNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    this.idNumber = `WD${year}${random}`;
  }
  next();
});

// Calculate expiry date (1 year from creation)
digitalIdSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    this.expiresAt = expiry;
  }
  next();
});

// Check if expired
digitalIdSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Get verification percentage
digitalIdSchema.virtual('verificationPercentage').get(function() {
  const totalFields = 5; // personal info, kyc docs, travel info, biometrics, verification
  let completed = 0;
  
  if (this.personalInfo && this.personalInfo.firstName) completed++;
  if (this.kycDocuments && this.kycDocuments.length > 0) completed++;
  if (this.travelInfo && this.travelInfo.entryPoint) completed++;
  if (this.verificationStatus === 'verified') completed += 2;
  
  return Math.round((completed / totalFields) * 100);
});

module.exports = mongoose.model('DigitalID', digitalIdSchema);