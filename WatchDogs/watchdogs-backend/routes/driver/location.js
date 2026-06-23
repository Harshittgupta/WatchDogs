// backend/routes/driver/location.js

const express = require('express');
const router = express.Router();
const Driver = require('../../models/Driver');
const Ride = require('../../models/Ride');
const { protect } = require('../../middleware/driverAuth');

/**
 * @route   PUT /api/driver/location/update
 * @desc    Update driver's current location
 * @access  Private (Driver)
 */
router.put('/update', protect, async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const driver = await Driver.findById(req.driver.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Update driver location
    driver.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude] // [lng, lat] for MongoDB GeoJSON
    };
    driver.lastLocationUpdate = new Date();

    await driver.save();

    console.log(`📍 Driver ${driver._id} location updated: [${longitude}, ${latitude}]`);

    // If driver has active ride, update ride's driver location too
    if (driver.currentRide) {
      try {
        const ride = await Ride.findById(driver.currentRide);
        
        if (ride) {
          ride.updateDriverLocation(longitude, latitude);
          
          // Add tracking point if speed/heading provided
          if (speed !== undefined && heading !== undefined) {
            ride.addTrackingPoint([longitude, latitude], speed, heading);
          }
          
          await ride.save();
          console.log(`📍 Ride ${ride._id} driver location updated`);
        }
      } catch (rideError) {
        console.error('Error updating ride location:', rideError);
        // Continue anyway - driver location is updated
      }
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        timestamp: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('❌ Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/driver/location/current
 * @desc    Get driver's current location
 * @access  Private (Driver)
 */
router.get('/current', protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (!driver.currentLocation || !driver.currentLocation.coordinates) {
      return res.json({
        success: true,
        message: 'No location set yet',
        location: null
      });
    }

    res.json({
      success: true,
      location: {
        latitude: driver.currentLocation.coordinates[1],
        longitude: driver.currentLocation.coordinates[0],
        lastUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('❌ Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/driver/location/history
 * @desc    Get driver's location history for a ride
 * @access  Private (Driver)
 */
router.post('/history', protect, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID is required'
      });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check if driver owns this ride
    if (ride.driver.toString() !== req.driver.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ride'
      });
    }

    res.json({
      success: true,
      trackingPoints: ride.trackingPoints,
      totalPoints: ride.trackingPoints.length
    });
  } catch (error) {
    console.error('❌ Error fetching location history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location history',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/driver/location/nearby-rides
 * @desc    Get rides near driver's current location
 * @access  Private (Driver)
 */
router.get('/nearby-rides', protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (!driver.currentLocation || !driver.currentLocation.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Driver location not set'
      });
    }

    const maxDistance = driver.preferences.maxPickupDistance * 1000 || 5000; // Convert to meters

    // Find rides near driver
    const nearbyRides = await Ride.find({
      status: 'searching',
      rideType: driver.vehicle.type,
      'pickup.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: driver.currentLocation.coordinates
          },
          $maxDistance: maxDistance
        }
      }
    })
    .populate('user', 'firstName lastName phone profilePicture rating')
    .limit(10);

    res.json({
      success: true,
      rides: nearbyRides,
      count: nearbyRides.length
    });
  } catch (error) {
    console.error('❌ Error fetching nearby rides:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby rides',
      error: error.message
    });
  }
});

module.exports = router;