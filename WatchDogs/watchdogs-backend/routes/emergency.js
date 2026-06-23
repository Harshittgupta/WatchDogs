const express = require('express');
const router = express.Router();
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Twilio Setup (optional - only if configured)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Twilio SMS enabled');
} else {
  console.log('⚠️ Twilio not configured - SMS notifications disabled');
}

// Helper function to send SMS
const sendEmergencySMS = async (phoneNumber, message) => {
  if (!twilioClient) {
    console.log('SMS not sent - Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    console.log(`📱 Sending SMS to ${phoneNumber}`);
    console.log(`📏 Message length: ${message.length} characters`);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`✅ SMS sent to ${phoneNumber}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  // Remove spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Add + if not present
  if (!cleaned.startsWith('+')) {
    // Assume India if 10 digits
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
};

// Helper to shorten location name (keep under 160 total chars)
const shortenLocation = (locationName) => {
  if (!locationName) return 'Unknown';
  
  // If location is too long, truncate it
  if (locationName.length > 30) {
    // Take first part before comma
    const parts = locationName.split(',');
    return parts[0].substring(0, 30);
  }
  
  return locationName.substring(0, 30);
};

// @route   POST /api/emergency/trigger
// @desc    Trigger emergency alert
// @access  Private
router.post('/trigger', protect, async (req, res) => {
  try {
    const { emergencyLevel, latitude, longitude, locationName, emergencyType, notes } = req.body;

    // Get user with emergency contacts and medical info
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create emergency record
    const emergency = await Emergency.create({
      user: req.user.id,
      emergencyLevel: emergencyLevel || 3,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      locationName,
      emergencyType,
      notes,
      status: 'active'
    });

    // Create notification records for emergency contacts
    const notifications = [];
    const smsPromises = [];
    
    // Send SMS to emergency contacts
    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
      user.emergencyContacts.forEach(contact => {
        if (contact.phone) {
          const formattedPhone = formatPhoneNumber(contact.phone);
          
          // ULTRA SHORT SMS for Twilio trial (must be under 160 chars)
          const firstName = user.firstName || 'User';
          const shortLocation = shortenLocation(locationName);
          const type = emergencyType?.toUpperCase() || 'ALERT';
          
          // Use bit.ly style shortened coordinates
          const lat = latitude.toFixed(2);
          const lng = longitude.toFixed(2);
          
          // Ultra short format (target: 120-140 chars)
          const smsMessage = `🚨${type}: ${firstName}
${shortLocation}
maps.google.com/?q=${lat},${lng}
${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

          console.log(`📏 SMS length: ${smsMessage.length} chars (limit: 160)`);

          // Send SMS (async)
          const smsPromise = sendEmergencySMS(formattedPhone, smsMessage)
            .then(result => {
              notifications.push({
                recipientType: 'contact',
                recipientId: contact._id,
                recipientName: contact.name,
                recipientPhone: formattedPhone,
                notificationMethod: 'sms',
                status: result.success ? 'sent' : 'failed',
                sentAt: result.success ? new Date() : null,
                error: result.error || null
              });
            })
            .catch(error => {
              notifications.push({
                recipientType: 'contact',
                recipientId: contact._id,
                recipientName: contact.name,
                recipientPhone: formattedPhone,
                notificationMethod: 'sms',
                status: 'failed',
                error: error.message
              });
            });
          
          smsPromises.push(smsPromise);
        }

        // Email notification record (if email exists)
        if (contact.email) {
          notifications.push({
            recipientType: 'contact',
            recipientId: contact._id,
            recipientName: contact.name,
            recipientEmail: contact.email,
            notificationMethod: 'email',
            status: 'pending', // Implement email separately
          });
        }
      });
    }

    // Wait for all SMS to be sent
    await Promise.all(smsPromises);

    // Add platform notification
    notifications.push({
      recipientType: 'platform',
      recipientName: 'WatchDogs Emergency Team',
      notificationMethod: 'push',
      status: 'sent',
      sentAt: new Date()
    });

    // Update emergency with notifications
    emergency.notifications = notifications;
    await emergency.save();

    // Broadcast emergency via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:alert', {
        id: emergency._id,
        user: {
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone
        },
        emergencyLevel,
        emergencyType,
        location: {
          latitude,
          longitude,
          name: locationName
        },
        medicalInfo: user.medicalInfo,
        timestamp: emergency.triggeredAt
      });
    }

    // Count successful notifications
    const sentCount = notifications.filter(n => n.status === 'sent').length;
    const failedCount = notifications.filter(n => n.status === 'failed').length;

    res.status(201).json({
      success: true,
      emergency,
      message: `Emergency alert triggered. ${sentCount} notifications sent${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      notificationsSent: sentCount,
      notificationsFailed: failedCount
    });
  } catch (error) {
    console.error('Emergency trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering emergency',
      error: error.message
    });
  }
});

// @route   PUT /api/emergency/:id/resolve
// @desc    Resolve emergency
// @access  Private
router.put('/:id/resolve', protect, async (req, res) => {
  try {
    const emergency = await Emergency.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    emergency.status = 'resolved';
    emergency.resolvedAt = new Date();
    emergency.notes = req.body.notes || emergency.notes;

    await emergency.save();

    // Get user info
    const user = await User.findById(req.user.id);

    // Send ultra-short "I'm safe" SMS
    if (twilioClient && user.emergencyContacts) {
      const firstName = user.firstName || 'User';
      const safeMessage = `✅${firstName} is SAFE`;

      console.log(`📏 Resolution SMS length: ${safeMessage.length} chars`);

      user.emergencyContacts.forEach(contact => {
        if (contact.phone) {
          const formattedPhone = formatPhoneNumber(contact.phone);
          sendEmergencySMS(formattedPhone, safeMessage)
            .catch(err => console.error('Failed to send resolution SMS:', err));
        }
      });
    }

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:resolved', {
        id: emergency._id,
        userId: req.user.id,
        timestamp: emergency.resolvedAt
      });
    }

    res.json({
      success: true,
      emergency,
      message: 'Emergency resolved successfully. Contacts have been notified.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resolving emergency',
      error: error.message
    });
  }
});

// @route   PUT /api/emergency/:id/cancel
// @desc    Cancel emergency
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const emergency = await Emergency.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    emergency.status = 'cancelled';
    emergency.resolvedAt = new Date();

    await emergency.save();

    // Notify that emergency was cancelled
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:cancelled', {
        id: emergency._id,
        userId: req.user.id
      });
    }

    res.json({
      success: true,
      emergency,
      message: 'Emergency cancelled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling emergency',
      error: error.message
    });
  }
});

// @route   GET /api/emergency/status
// @desc    Get active emergency status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const activeEmergency = await Emergency.findOne({
      user: req.user.id,
      status: 'active'
    }).sort({ triggeredAt: -1 });

    if (!activeEmergency) {
      return res.json({
        success: true,
        hasActiveEmergency: false
      });
    }

    res.json({
      success: true,
      hasActiveEmergency: true,
      emergency: activeEmergency
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency status',
      error: error.message
    });
  }
});

// @route   GET /api/emergency/history
// @desc    Get emergency history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const emergencies = await Emergency.find({ user: req.user.id })
      .sort({ triggeredAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Emergency.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      emergencies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency history',
      error: error.message
    });
  }
});

// @route   POST /api/emergency/:id/response
// @desc    Add response to emergency (for responders)
// @access  Private
router.post('/:id/response', protect, async (req, res) => {
  try {
    const { responder, responderType, message } = req.body;

    const emergency = await Emergency.findById(req.params.id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    emergency.responses.push({
      responder,
      responderType,
      message,
      timestamp: new Date()
    });

    await emergency.save();

    // Notify user of response
    const io = req.app.get('io');
    if (io) {
      io.to(emergency.user.toString()).emit('emergency:response', {
        emergencyId: emergency._id,
        response: {
          responder,
          message,
          timestamp: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: 'Response added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding response',
      error: error.message
    });
  }
});

// @route   GET /api/emergency/test-sms
// @desc    Test SMS sending (for debugging)
// @access  Private
router.get('/test-sms', protect, async (req, res) => {
  try {
    if (!twilioClient) {
      return res.json({
        success: false,
        message: 'Twilio not configured. Add TWILIO credentials to .env file.'
      });
    }

    const user = await User.findById(req.user.id);
    const testPhone = user.phone || req.query.phone;

    if (!testPhone) {
      return res.status(400).json({
        success: false,
        message: 'No phone number provided. Add ?phone=+1234567890 to URL'
      });
    }

    const formattedPhone = formatPhoneNumber(testPhone);
    
    // Ultra-short test message
    const testMessage = `🧪 WatchDogs test OK`;

    console.log(`📏 Test message length: ${testMessage.length} chars`);

    const result = await sendEmergencySMS(formattedPhone, testMessage);

    res.json({
      success: result.success,
      message: result.success 
        ? `Test SMS sent successfully to ${formattedPhone}` 
        : `Failed to send SMS: ${result.error}`,
      phone: formattedPhone,
      twilioConfigured: true,
      messageLength: testMessage.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending test SMS',
      error: error.message
    });
  }
});

module.exports = router;