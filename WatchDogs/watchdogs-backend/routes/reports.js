const express = require('express');
const router = express.Router();
const SafetyReport = require('../models/SafetyReport');
const { protect } = require('../middleware/auth');

// @route   POST /api/reports/create
// @desc    Create safety report
// @access  Private
router.post('/create', protect, async (req, res) => {
  try {
    const { reportType, title, description, latitude, longitude, locationName } = req.body;

    const report = await SafetyReport.create({
      user: req.user.id,
      reportType,
      title,
      description,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      locationName
    });

    await report.populate('user', 'firstName lastName profilePicture isVerified');

    // Emit real-time report to all users
    const io = req.app.get('io');
    io.emit('report:added', {
      id: report._id,
      user: {
        name: `${report.user.firstName} ${report.user.lastName.charAt(0)}.`,
        avatar: report.user.profilePicture,
        verified: report.user.isVerified
      },
      reportType: report.reportType,
      title: report.title,
      description: report.description,
      location: locationName,
      timestamp: report.createdAt,
      upvotes: 0
    });

    res.status(201).json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating report',
      error: error.message
    });
  }
});

// @route   GET /api/reports/feed
// @desc    Get community safety feed
// @access  Private
router.get('/feed', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, reportType, sortBy = 'recent' } = req.query;

    const query = { isActive: true };
    if (reportType && reportType !== 'all') {
      query.reportType = reportType;
    }

    let sort = {};
    switch (sortBy) {
      case 'recent':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { upvotes: -1 };
        break;
      case 'score':
        // This would need a virtual field or aggregation
        sort = { upvotes: -1, downvotes: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const reports = await SafetyReport.find(query)
      .populate('user', 'firstName lastName profilePicture isVerified')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SafetyReport.countDocuments(query);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      reports: reports.map(r => ({
        id: r._id,
        user: {
          name: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
          avatar: r.user.profilePicture,
          verified: r.user.isVerified
        },
        reportType: r.reportType,
        title: r.title,
        description: r.description,
        location: r.locationName,
        upvotes: r.upvotes.length,
        downvotes: r.downvotes.length,
        hasUpvoted: r.upvotes.includes(req.user.id),
        hasDownvoted: r.downvotes.includes(req.user.id),
        timestamp: r.createdAt,
        isVerified: r.isVerified
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

// @route   GET /api/reports/nearby
// @desc    Get reports near location
// @access  Private
router.get('/nearby', protect, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, reportType } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    };

    if (reportType && reportType !== 'all') {
      query.reportType = reportType;
    }

    const reports = await SafetyReport.find(query)
      .populate('user', 'firstName lastName profilePicture isVerified')
      .limit(50);

    res.json({
      success: true,
      count: reports.length,
      reports: reports.map(r => ({
        id: r._id,
        user: {
          name: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
          avatar: r.user.profilePicture,
          verified: r.user.isVerified
        },
        reportType: r.reportType,
        title: r.title,
        description: r.description,
        location: r.locationName,
        coordinates: {
          latitude: r.location.coordinates[1],
          longitude: r.location.coordinates[0]
        },
        upvotes: r.upvotes.length,
        hasUpvoted: r.upvotes.includes(req.user.id),
        timestamp: r.createdAt,
        distance: null // Would calculate if needed
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby reports',
      error: error.message
    });
  }
});

// @route   POST /api/reports/:id/upvote
// @desc    Upvote a report
// @access  Private
router.post('/:id/upvote', protect, async (req, res) => {
  try {
    const report = await SafetyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Remove from downvotes if exists
    report.downvotes = report.downvotes.filter(id => !id.equals(req.user.id));

    // Toggle upvote
    const hasUpvoted = report.upvotes.some(id => id.equals(req.user.id));
    
    if (hasUpvoted) {
      report.upvotes = report.upvotes.filter(id => !id.equals(req.user.id));
    } else {
      report.upvotes.push(req.user.id);
    }

    await report.save();

    res.json({
      success: true,
      upvotes: report.upvotes.length,
      downvotes: report.downvotes.length,
      hasUpvoted: !hasUpvoted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error upvoting report',
      error: error.message
    });
  }
});

// @route   POST /api/reports/:id/downvote
// @desc    Downvote a report
// @access  Private
router.post('/:id/downvote', protect, async (req, res) => {
  try {
    const report = await SafetyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Remove from upvotes if exists
    report.upvotes = report.upvotes.filter(id => !id.equals(req.user.id));

    // Toggle downvote
    const hasDownvoted = report.downvotes.some(id => id.equals(req.user.id));
    
    if (hasDownvoted) {
      report.downvotes = report.downvotes.filter(id => !id.equals(req.user.id));
    } else {
      report.downvotes.push(req.user.id);
    }

    await report.save();

    res.json({
      success: true,
      upvotes: report.upvotes.length,
      downvotes: report.downvotes.length,
      hasDownvoted: !hasDownvoted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downvoting report',
      error: error.message
    });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete own report
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const report = await SafetyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user owns the report
    if (!report.user.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this report'
      });
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message
    });
  }
});

// @route   GET /api/reports/stats
// @desc    Get community statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const totalReports = await SafetyReport.countDocuments({ isActive: true });
    const totalUsers = await SafetyReport.distinct('user').then(users => users.length);
    
    // Calculate average helpfulness (upvotes / total votes)
    const reports = await SafetyReport.find({ isActive: true });
    let totalVotes = 0;
    let totalUpvotes = 0;
    
    reports.forEach(report => {
      const votes = report.upvotes.length + report.downvotes.length;
      totalVotes += votes;
      totalUpvotes += report.upvotes.length;
    });

    const helpfulRating = totalVotes > 0 ? ((totalUpvotes / totalVotes) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      stats: {
        totalReports,
        activeTravelers: totalUsers,
        helpfulRating: `${helpfulRating}%`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;
