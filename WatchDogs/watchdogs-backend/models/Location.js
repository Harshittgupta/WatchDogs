const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  accuracy: {
    type: Number,
    default: 0
  },
  altitude: Number,
  heading: Number,
  speed: Number,
  timestamp: {
    type: Date,
    default: Date.now
  },
  formattedAddress: String,
  country: String,
  city: String,
  isCheckIn: {
    type: Boolean,
    default: false
  },
  checkInMessage: String,
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create geospatial index for nearby queries
locationSchema.index({ coordinates: '2dsphere' });
locationSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('Location', locationSchema);
