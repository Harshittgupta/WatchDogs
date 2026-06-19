const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emergencyLevel: {
    type: Number,
    enum: [1, 2, 3], // 1: check-in, 2: track, 3: full emergency
    required: true,
    default: 3
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
  locationName: String,
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
  },
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  notes: String,
  emergencyType: {
    type: String,
    enum: ['medical', 'police', 'fire', 'assault', 'theft', 'accident', 'lost', 'other'],
    default: 'other'
  },
  notifications: [{
    recipientType: {
      type: String,
      enum: ['contact', 'embassy', 'authority', 'platform']
    },
    recipientId: mongoose.Schema.Types.ObjectId,
    recipientName: String,
    recipientPhone: String,
    recipientEmail: String,
    notificationMethod: {
      type: String,
      enum: ['sms', 'email', 'push', 'call']
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    error: String
  }],
  responses: [{
    responder: String,
    responderType: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  autoResolveAt: Date // Auto-resolve after certain time if not manually resolved
}, {
  timestamps: true
});

// Create geospatial index
emergencySchema.index({ location: '2dsphere' });
emergencySchema.index({ user: 1, status: 1, triggeredAt: -1 });

module.exports = mongoose.model('Emergency', emergencySchema);
