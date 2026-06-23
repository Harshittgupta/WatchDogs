const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

// @route   GET /api/alerts
// @desc    Get all alerts with filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type, severity, status, page = 1, limit = 20 } = req.query;
    
    const query = { isActive: true };
    
    if (type) query.alertType = type;
    if (severity) query.severity = severity;
    
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('createdBy', 'firstName lastName');

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      count: alerts.length,
      total,
      alerts,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/active
// @desc    Get active alerts for user's location
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const query = {
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [
        { validUntil: { $gte: new Date() } },
        { validUntil: null }
      ]
    };

    // Add geospatial query
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: radius * 1000 // Convert km to meters
      }
    };

    const alerts = await Alert.find(query)
      .sort({ severity: 1, priority: -1, createdAt: -1 })
      .populate('createdBy', 'firstName lastName')
      .limit(50);

    // Group by severity
    const groupedAlerts = {
      critical: alerts.filter(a => a.severity === 'critical'),
      high: alerts.filter(a => a.severity === 'high'),
      medium: alerts.filter(a => a.severity === 'medium'),
      low: alerts.filter(a => a.severity === 'low'),
      info: alerts.filter(a => a.severity === 'info')
    };

    res.json({
      success: true,
      count: alerts.length,
      alerts,
      grouped: groupedAlerts,
      summary: {
        critical: groupedAlerts.critical.length,
        high: groupedAlerts.high.length,
        medium: groupedAlerts.medium.length,
        low: groupedAlerts.low.length,
        info: groupedAlerts.info.length
      }
    });
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/nearby
// @desc    Get alerts near location
// @access  Private
router.get('/nearby', protect, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const alerts = await Alert.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000
        }
      }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error fetching nearby alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get alert by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Increment view count
    alert.views += 1;
    await alert.save();

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert',
      error: error.message
    });
  }
});

// @route   POST /api/alerts
// @desc    Create new alert (admin only)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      createdBy: req.user.id
    };

    const alert = await Alert.create(alertData);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('alert:new', alert);
    }

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating alert',
      error: error.message
    });
  }
});

// @route   PUT /api/alerts/:id
// @desc    Update alert
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      alert[key] = req.body[key];
    });
    
    alert.lastUpdatedBy = req.user.id;
    await alert.save();

    res.json({
      success: true,
      message: 'Alert updated successfully',
      alert
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating alert',
      error: error.message
    });
  }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete alert
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.deleteOne();

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting alert',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/:id/acknowledge
// @desc    Acknowledge an alert
// @access  Private
router.post('/:id/acknowledge', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if already acknowledged
    if (!alert.acknowledgedBy.includes(req.user.id)) {
      alert.acknowledgedBy.push(req.user.id);
      await alert.save();
    }

    res.json({
      success: true,
      message: 'Alert acknowledged',
      acknowledgedCount: alert.acknowledgedBy.length
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error acknowledging alert',
      error: error.message
    });
  }
});

// @route   PATCH /api/alerts/:id/read
// @desc    Mark alert as read
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Add to acknowledgedBy if not already there
    if (!alert.acknowledgedBy.includes(req.user.id)) {
      alert.acknowledgedBy.push(req.user.id);
      await alert.save();
    }

    res.json({
      success: true,
      message: 'Alert marked as read'
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking alert as read',
      error: error.message
    });
  }
});

// @route   PATCH /api/alerts/read-all
// @desc    Mark all alerts as read
// @access  Private
router.patch('/read-all', protect, async (req, res) => {
  try {
    await Alert.updateMany(
      { isActive: true },
      { $addToSet: { acknowledgedBy: req.user.id } }
    );

    res.json({
      success: true,
      message: 'All alerts marked as read'
    });
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking alerts as read',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/unread/count
// @desc    Get unread alert count
// @access  Private
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Alert.countDocuments({
      isActive: true,
      acknowledgedBy: { $ne: req.user.id }
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/:id/share
// @desc    Share an alert
// @access  Private
router.post('/:id/share', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.sharedCount += 1;
    await alert.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('alert:shared', {
        alertId: alert._id,
        sharedBy: req.user.id,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Alert shared',
      sharedCount: alert.sharedCount
    });
  } catch (error) {
    console.error('Error sharing alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error sharing alert',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/:id/report
// @desc    Report false alert
// @access  Private
router.post('/:id/report', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // In production, you might want to store reports in a separate collection
    // For now, we'll just log it
    console.log(`Alert ${req.params.id} reported by user ${req.user.id}: ${reason}`);

    res.json({
      success: true,
      message: 'Alert reported successfully'
    });
  } catch (error) {
    console.error('Error reporting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error reporting alert',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/subscribe
// @desc    Subscribe to alert notifications
// @access  Private
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    // In production, store preferences in User model
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Subscribed to alert notifications',
      preferences
    });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({
      success: false,
      message: 'Error subscribing to alerts',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/unsubscribe
// @desc    Unsubscribe from alert notifications
// @access  Private
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    // In production, update User model
    
    res.json({
      success: true,
      message: 'Unsubscribed from alert notifications'
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsubscribing from alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/stats
// @desc    Get alert statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      activeAlerts,
      last24HoursAlerts,
      last7DaysAlerts,
      bySeverity,
      byType
    ] = await Promise.all([
      Alert.countDocuments({ isActive: true }),
      Alert.countDocuments({ 
        isActive: true, 
        createdAt: { $gte: last24Hours } 
      }),
      Alert.countDocuments({ 
        isActive: true, 
        createdAt: { $gte: last7Days } 
      }),
      Alert.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      Alert.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$alertType', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        activeAlerts,
        last24Hours: last24HoursAlerts,
        last7Days: last7DaysAlerts,
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/filter/by-type
// @desc    Get alerts by type
// @access  Private
router.get('/filter/by-type', protect, async (req, res) => {
  try {
    const { type, severity, limit = 20 } = req.query;

    const query = {
      isActive: true,
      validFrom: { $lte: new Date() }
    };

    if (type) query.alertType = type;
    if (severity) query.severity = severity;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error filtering alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error filtering alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/my/acknowledged
// @desc    Get user's acknowledged alerts
// @access  Private
router.get('/my/acknowledged', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({
      acknowledgedBy: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error fetching acknowledged alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching acknowledged alerts',
      error: error.message
    });
  }
});

module.exports = router;