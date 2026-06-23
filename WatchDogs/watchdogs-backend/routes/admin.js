const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SafetyReport = require('../models/SafetyReport');
const Emergency = require('../models/Emergency');
const Alert = require('../models/Alert');
const DigitalID = require('../models/DigitalID');
const { protect } = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking admin status',
      error: error.message
    });
  }
};

// @route   GET /api/admin/dashboard
// @desc    Get comprehensive admin dashboard overview
// @access  Admin only
router.get('/dashboard', protect, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);

    // Get all statistics
    const [
      totalUsers,
      newUsersLast30Days,
      activeUsersLast7Days,
      premiumUsers,
      totalReports,
      pendingReports,
      verifiedReports,
      flaggedReports,
      reportsLast24Hours,
      activeEmergencies,
      totalEmergencies,
      resolvedEmergencies,
      activeAlerts,
      criticalAlerts,
      alertsCreatedLast7Days,
      verifiedDigitalIds,
      pendingDigitalIds,
      rejectedDigitalIds
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      User.countDocuments({ lastActive: { $gte: last7Days } }),
      User.countDocuments({ premiumStatus: true }),
      SafetyReport.countDocuments(),
      SafetyReport.countDocuments({ isVerified: false, isFlagged: false }),
      SafetyReport.countDocuments({ isVerified: true }),
      SafetyReport.countDocuments({ isFlagged: true }),
      SafetyReport.countDocuments({ createdAt: { $gte: last24Hours } }),
      Emergency.countDocuments({ status: 'active' }),
      Emergency.countDocuments(),
      Emergency.countDocuments({ status: 'resolved' }),
      Alert.countDocuments({ isActive: true }),
      Alert.countDocuments({ isActive: true, severity: 'critical' }),
      Alert.countDocuments({ createdAt: { $gte: last7Days } }),
      DigitalID.countDocuments({ verificationStatus: 'verified' }),
      DigitalID.countDocuments({ verificationStatus: 'pending' }),
      DigitalID.countDocuments({ verificationStatus: 'rejected' })
    ]);

    // Get user growth data (last 30 days)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get report distribution by type
    const reportDistribution = await SafetyReport.aggregate([
      {
        $group: {
          _id: '$reportType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get alert distribution by severity
    const alertBySeverity = await Alert.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get alert distribution by type
    const alertByType = await Alert.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$alertType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get emergency response times (average)
    const emergencyStats = await Emergency.aggregate([
      {
        $match: {
          status: 'resolved',
          resolvedAt: { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$resolvedAt', '$triggeredAt'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' }
        }
      }
    ]);

    // Get reports by country
    const reportsByCountry = await SafetyReport.aggregate([
      {
        $group: {
          _id: '$location.country',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get recent activity
    const recentAlerts = await Alert.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title severity createdAt alertType');

    const recentReports = await SafetyReport.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'firstName lastName')
      .select('reportType title createdAt isVerified');

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalUsers,
          newUsersLast30Days,
          activeUsersLast7Days,
          premiumUsers,
          totalReports,
          pendingReports,
          verifiedReports,
          flaggedReports,
          reportsLast24Hours,
          activeEmergencies,
          totalEmergencies,
          resolvedEmergencies,
          activeAlerts,
          criticalAlerts,
          alertsCreatedLast7Days,
          verifiedDigitalIds,
          pendingDigitalIds,
          rejectedDigitalIds
        },
        userGrowth,
        reportDistribution,
        alertBySeverity,
        alertByType,
        reportsByCountry,
        emergencyStats: {
          avgResponseTime: emergencyStats[0]?.avgResponseTime || 0,
          minResponseTime: emergencyStats[0]?.minResponseTime || 0,
          maxResponseTime: emergencyStats[0]?.maxResponseTime || 0
        },
        recentActivity: {
          alerts: recentAlerts,
          reports: recentReports
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filters and pagination
// @access  Admin only
router.get('/users', protect, isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      verified, 
      premium,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (verified !== undefined) query.isVerified = verified === 'true';
    if (premium !== undefined) query.premiumStatus = premium === 'true';
    if (role) query.role = role;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user details
// @access  Admin only
router.get('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's related data
    const [reports, emergencies, digitalId] = await Promise.all([
      SafetyReport.countDocuments({ user: req.params.id }),
      Emergency.countDocuments({ user: req.params.id }),
      DigitalID.findOne({ user: req.params.id })
    ]);

    res.json({
      success: true,
      user,
      stats: {
        totalReports: reports,
        totalEmergencies: emergencies,
        hasDigitalId: !!digitalId,
        digitalIdStatus: digitalId?.verificationStatus
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (verify, premium, role, etc.)
// @access  Admin only
router.put('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const { 
      isVerified, 
      premiumStatus, 
      premiumExpiry, 
      role,
      isActive
    } = req.body;

    const updates = {};
    if (isVerified !== undefined) updates.isVerified = isVerified;
    if (premiumStatus !== undefined) updates.premiumStatus = premiumStatus;
    if (premiumExpiry) updates.premiumExpiry = premiumExpiry;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user and all related data
// @access  Admin only
router.delete('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete all related data
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      SafetyReport.deleteMany({ user: req.params.id }),
      Emergency.deleteMany({ user: req.params.id }),
      DigitalID.deleteOne({ user: req.params.id })
    ]);

    res.json({
      success: true,
      message: 'User and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// @route   GET /api/admin/reports
// @desc    Get all reports with filters
// @access  Admin only
router.get('/reports', protect, isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      type,
      verified,
      flagged
    } = req.query;

    const query = {};
    if (type) query.reportType = type;
    if (verified !== undefined) query.isVerified = verified === 'true';
    if (flagged !== undefined) query.isFlagged = flagged === 'true';

    const reports = await SafetyReport.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SafetyReport.countDocuments(query);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

// @route   GET /api/admin/reports/pending
// @desc    Get pending/flagged reports for moderation
// @access  Admin only
router.get('/reports/pending', protect, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const reports = await SafetyReport.find({
      $or: [
        { isVerified: false },
        { isFlagged: true }
      ]
    })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SafetyReport.countDocuments({
      $or: [
        { isVerified: false },
        { isFlagged: true }
      ]
    });

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      reports
    });
  } catch (error) {
    console.error('Error fetching pending reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending reports',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/reports/:id/verify
// @desc    Verify a safety report
// @access  Admin only
router.put('/reports/:id/verify', protect, isAdmin, async (req, res) => {
  try {
    const report = await SafetyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.isVerified = true;
    report.verifiedBy = req.user.id;
    report.isFlagged = false;
    await report.save();

    res.json({
      success: true,
      report,
      message: 'Report verified successfully'
    });
  } catch (error) {
    console.error('Error verifying report:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying report',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/reports/:id/flag
// @desc    Flag a report as inappropriate
// @access  Admin only
router.put('/reports/:id/flag', protect, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const report = await SafetyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.isFlagged = true;
    report.flagReason = reason;
    await report.save();

    res.json({
      success: true,
      report,
      message: 'Report flagged successfully'
    });
  } catch (error) {
    console.error('Error flagging report:', error);
    res.status(500).json({
      success: false,
      message: 'Error flagging report',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/reports/:id
// @desc    Delete a report
// @access  Admin only
router.delete('/reports/:id', protect, isAdmin, async (req, res) => {
  try {
    const report = await SafetyReport.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message
    });
  }
});

// @route   GET /api/admin/alerts
// @desc    Get all alerts
// @access  Admin only
router.get('/alerts', protect, isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      active,
      severity,
      type
    } = req.query;

    const query = {};
    if (active !== undefined) query.isActive = active === 'true';
    if (severity) query.severity = severity;
    if (type) query.alertType = type;

    const alerts = await Alert.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      alerts
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

// @route   POST /api/admin/alerts/create
// @desc    Create new alert
// @access  Admin only
router.post('/alerts/create', protect, isAdmin, async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      createdBy: req.user.id,
      source: 'admin',
      isVerified: true
    };

    const alert = await Alert.create(alertData);

    // Broadcast alert via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('alert:new', alert);
    }

    res.status(201).json({
      success: true,
      alert,
      message: 'Alert created and broadcasted successfully'
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

// @route   PUT /api/admin/alerts/:id
// @desc    Update alert
// @access  Admin only
router.put('/alerts/:id', protect, isAdmin, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdatedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      alert,
      message: 'Alert updated successfully'
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

// @route   PUT /api/admin/alerts/:id/deactivate
// @desc    Deactivate alert
// @access  Admin only
router.put('/alerts/:id/deactivate', protect, isAdmin, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isActive: false, lastUpdatedBy: req.user.id },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      alert,
      message: 'Alert deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating alert',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/alerts/:id
// @desc    Delete alert
// @access  Admin only
router.delete('/alerts/:id', protect, isAdmin, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

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

// @route   GET /api/admin/digital-ids/pending
// @desc    Get pending digital ID verifications
// @access  Admin only
router.get('/digital-ids/pending', protect, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const digitalIds = await DigitalID.find({
      verificationStatus: { $in: ['pending', 'in_review'] }
    })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await DigitalID.countDocuments({
      verificationStatus: { $in: ['pending', 'in_review'] }
    });

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      digitalIds
    });
  } catch (error) {
    console.error('Error fetching pending digital IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending digital IDs',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/digital-ids/:id/verify
// @desc    Verify or reject digital ID
// @access  Admin only
router.put('/digital-ids/:id/verify', protect, isAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body; // status: 'verified' or 'rejected'

    const digitalId = await DigitalID.findById(req.params.id);

    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    digitalId.verificationStatus = status;
    digitalId.verificationNotes = notes;

    if (status === 'verified') {
      digitalId.kycDocuments.forEach(doc => {
        doc.isVerified = true;
        doc.verifiedAt = new Date();
        doc.verifiedBy = req.user.id;
      });
    }

    await digitalId.save();

    res.json({
      success: true,
      digitalId,
      message: `Digital ID ${status} successfully`
    });
  } catch (error) {
    console.error('Error verifying digital ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying digital ID',
      error: error.message
    });
  }
});

// @route   GET /api/admin/emergencies
// @desc    Get all emergencies with filters
// @access  Admin only
router.get('/emergencies', protect, isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      status,
      severity
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity) query.emergencyLevel = severity;

    const emergencies = await Emergency.find(query)
      .populate('user', 'firstName lastName email phone')
      .sort({ triggeredAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Emergency.countDocuments(query);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      emergencies
    });
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching emergencies',
      error: error.message
    });
  }
});

// @route   GET /api/admin/emergencies/active
// @desc    Get all active emergencies
// @access  Admin only
router.get('/emergencies/active', protect, isAdmin, async (req, res) => {
  try {
    const emergencies = await Emergency.find({ status: 'active' })
      .populate('user', 'firstName lastName email phone')
      .sort({ triggeredAt: -1 });

    res.json({
      success: true,
      count: emergencies.length,
      emergencies
    });
  } catch (error) {
    console.error('Error fetching active emergencies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active emergencies',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/emergencies/:id/resolve
// @desc    Resolve an emergency
// @access  Admin only
router.put('/emergencies/:id/resolve', protect, isAdmin, async (req, res) => {
  try {
    const { resolution } = req.body;
    
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolution
      },
      { new: true }
    );

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    res.json({
      success: true,
      emergency,
      message: 'Emergency resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving emergency:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving emergency',
      error: error.message
    });
  }
});

// @route   GET /api/admin/stats/analytics
// @desc    Get detailed analytics
// @access  Admin only
router.get('/stats/analytics', protect, isAdmin, async (req, res) => {
  try {
    const { timeRange = '30' } = req.query; // days
    const daysAgo = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);

    // User registration trend
    const userTrend = await User.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Reports trend
    const reportTrend = await SafetyReport.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Emergency trend
    const emergencyTrend = await Emergency.aggregate([
      { $match: { triggeredAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$triggeredAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        userTrend,
        reportTrend,
        emergencyTrend
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

module.exports = router;