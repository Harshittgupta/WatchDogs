const mongoose = require('mongoose');

const safetyReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['safe', 'caution', 'danger', 'info'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 1000
  },
  location: {
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
  locationName: {
    type: String,
    required: true
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flaggedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  images: [String],
  expiresAt: Date, // Reports can expire after certain time
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create geospatial index for nearby queries
safetyReportSchema.index({ location: '2dsphere' });
safetyReportSchema.index({ reportType: 1, createdAt: -1 });
safetyReportSchema.index({ user: 1 });

// Calculate upvote/downvote counts
safetyReportSchema.virtual('upvoteCount').get(function() {
  return this.upvotes.length;
});

safetyReportSchema.virtual('downvoteCount').get(function() {
  return this.downvotes.length;
});

safetyReportSchema.virtual('score').get(function() {
  return this.upvotes.length - this.downvotes.length;
});

module.exports = mongoose.model('SafetyReport', safetyReportSchema);
