const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const { protect } = require('../middleware/auth');

// @route   POST /api/location/update
// @desc    Update user location
// @access  Private
router.post('/update', protect, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, altitude, heading, speed, formattedAddress, country, city } = req.body;

    const location = await Location.create({
      user: req.user.id,
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      accuracy,
      altitude,
      heading,
      speed,
      formattedAddress,
      country,
      city,
      timestamp: new Date()
    });

    // Emit real-time location update via socket
    const io = req.app.get('io');
    io.emit('location:new', {
      userId: req.user.id,
      location: {
        latitude,
        longitude,
        accuracy,
        timestamp: location.timestamp
      }
    });

    res.json({
      success: true,
      location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

// @route   GET /api/location/current
// @desc    Get user's current location
// @access  Private
router.get('/current', protect, async (req, res) => {
  try {
    const location = await Location.findOne({ user: req.user.id })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location found'
      });
    }

    res.json({
      success: true,
      location: {
        latitude: location.coordinates.coordinates[1],
        longitude: location.coordinates.coordinates[0],
        accuracy: location.accuracy,
        formattedAddress: location.formattedAddress,
        timestamp: location.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message
    });
  }
});

// @route   GET /api/location/history
// @desc    Get location history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { limit = 50, startDate, endDate } = req.query;

    const query = { user: req.user.id };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const locations = await Location.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: locations.length,
      locations: locations.map(loc => ({
        latitude: loc.coordinates.coordinates[1],
        longitude: loc.coordinates.coordinates[0],
        accuracy: loc.accuracy,
        formattedAddress: loc.formattedAddress,
        timestamp: loc.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching location history',
      error: error.message
    });
  }
});

// @route   POST /api/location/check-in
// @desc    Public safety check-in
// @access  Private
router.post('/check-in', protect, async (req, res) => {
  try {
    const { latitude, longitude, locationName, message, isPublic = true } = req.body;

    const checkIn = await Location.create({
      user: req.user.id,
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      formattedAddress: locationName,
      isCheckIn: true,
      checkInMessage: message,
      isPublic,
      timestamp: new Date()
    });

    // Populate user info for socket emission
    await checkIn.populate('user', 'firstName lastName profilePicture');

    // Emit check-in to nearby users
    const io = req.app.get('io');
    io.emit('checkin:added', {
      id: checkIn._id,
      user: {
        name: `${checkIn.user.firstName} ${checkIn.user.lastName}`,
        avatar: checkIn.user.profilePicture
      },
      location: locationName,
      time: checkIn.timestamp
    });

    res.json({
      success: true,
      checkIn
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating check-in',
      error: error.message
    });
  }
});

// @route   GET /api/location/nearby-checkins
// @desc    Get nearby user check-ins
// @access  Private
router.get('/nearby-checkins', protect, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Find check-ins within radius
    const checkIns = await Location.find({
      isCheckIn: true,
      isPublic: true,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    })
    .populate('user', 'firstName lastName profilePicture')
    .sort({ timestamp: -1 })
    .limit(50);

    res.json({
      success: true,
      count: checkIns.length,
      checkIns: checkIns.map(c => ({
        id: c._id,
        user: {
          name: `${c.user.firstName} ${c.user.lastName}`,
          avatar: c.user.profilePicture
        },
        location: c.formattedAddress,
        message: c.checkInMessage,
        time: c.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby check-ins',
      error: error.message
    });
  }
});

module.exports = router;
