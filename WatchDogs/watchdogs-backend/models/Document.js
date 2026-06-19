const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    enum: ['passport', 'visa', 'insurance', 'vaccination', 'id', 'other'],
    required: true
  },
  documentName: {
    type: String,
    required: true
  },
  documentNumber: String,
  issueCountry: String,
  issueDate: Date,
  expiryDate: Date,
  fileUrl: {
    type: String,
    required: true
  },
  fileName: String,
  fileSize: Number,
  mimeType: String,
  thumbnailUrl: String,
  isEncrypted: {
    type: Boolean,
    default: true
  },
  provider: String, // For insurance
  notes: String,
  reminders: [{
    daysBeforeExpiry: { type: Number, default: 180 }, // 6 months
    reminderSent: { type: Boolean, default: false },
    sentAt: Date
  }],
  sharedWith: [{
    email: String,
    sharedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    accessToken: String
  }]
}, {
  timestamps: true
});

// Index for expiry queries
documentSchema.index({ user: 1, expiryDate: 1 });
documentSchema.index({ user: 1, documentType: 1 });

// Calculate days until expiry
documentSchema.virtual('daysToExpiry').get(function() {
  if (!this.expiryDate) return null;
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diff = expiry - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Get status based on expiry
documentSchema.virtual('status').get(function() {
  const days = this.daysToExpiry;
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days < 180) return 'expiring-soon'; // Less than 6 months
  return 'valid';
});

module.exports = mongoose.model('Document', documentSchema);
