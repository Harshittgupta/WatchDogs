const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertType: {
    type: String,
    enum: [
      'weather', 'natural_disaster', 'health', 'security', 
      'political', 'traffic', 'event', 'travel_advisory', 'other'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    required: true,
    default: 'medium'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  detailedInfo: {
    type: String,
    maxlength: 5000
  },

  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point', 'Polygon'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] or array of coordinates for polygon
      required: true
    }
  },
  affectedArea: {
    country: String,
    state: String,
    city: String,
    radius: Number, // in kilometers
    specificLocations: [String]
  },

  // Source Information
  source: {
    type: String,
    enum: ['government', 'embassy', 'local_authority', 'community', 'admin', 'system'],
    default: 'system'
  },
  sourceOrganization: String,
  sourceUrl: String,
  isVerified: { type: Boolean, default: false },

  // Validity
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: Date,
  isActive: {
    type: Boolean,
    default: true
  },

  // Actions & Recommendations
  recommendedActions: [String],
  safetyTips: [String],
  emergencyContacts: [{
    name: String,
    phone: String,
    type: String // police, hospital, embassy, etc.
  }],

  // Targeting
  targetAudience: {
    type: String,
    enum: ['all', 'tourists', 'residents', 'business_travelers'],
    default: 'all'
  },
  targetNationalities: [String], // Empty means all

  // Engagement
  views: { type: Number, default: 0 },
  acknowledgedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sharedCount: { type: Number, default: 0 },

  // Related Data
  relatedReports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SafetyReport' }],
  relatedAlerts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alert' }],
  attachments: [{
    url: String,
    type: String, // image, document, video
    caption: String
  }],

  // Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }

}, {
  timestamps: true
});

// Create geospatial index
alertSchema.index({ location: '2dsphere' });
alertSchema.index({ severity: 1, isActive: 1, validFrom: -1 });
alertSchema.index({ alertType: 1, isActive: 1 });
alertSchema.index({ validUntil: 1 });

// Auto-deactivate expired alerts
alertSchema.pre('save', function(next) {
  if (this.validUntil && this.validUntil < new Date()) {
    this.isActive = false;
  }
  next();
});

// Check if alert is currently valid
alertSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.validFrom <= now && (!this.validUntil || this.validUntil > now);
});

// Get time remaining
alertSchema.virtual('timeRemaining').get(function() {
  if (!this.validUntil) return null;
  const now = new Date();
  const diff = this.validUntil - now;
  if (diff < 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours} hours`;
  
  const days = Math.floor(hours / 24);
  return `${days} days`;
});

module.exports = mongoose.model('Alert', alertSchema);
