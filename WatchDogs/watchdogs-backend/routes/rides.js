const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const { protect } = require('../middleware/auth');
const googleMapsService = require('../services/googleMaps');

// @route   POST /api/rides/estimate
// @desc    Get fare estimate with Google Maps
// @access  Private
router.post('/estimate', protect, async (req, res) => {
  try {
    const { pickup, dropoff, rideType } = req.body;

    if (!pickup || !dropoff || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'Pickup, dropoff, and ride type are required'
      });
    }

    // Get directions from Google Maps
    const directions = await googleMapsService.getDirections(
      { latitude: pickup.coordinates[1], longitude: pickup.coordinates[0] },
      { latitude: dropoff.coordinates[1], longitude: dropoff.coordinates[0] }
    );

    if (!directions) {
      return res.status(400).json({
        success: false,
        message: 'Could not calculate route'
      });
    }

    // Calculate fare for different ride types
    const baseFares = {
      bike: { base: 20, perKm: 10, perMin: 1 },
      auto: { base: 30, perKm: 12, perMin: 1.5 },
      mini: { base: 50, perKm: 15, perMin: 2 },
      sedan: { base: 80, perKm: 18, perMin: 2.5 },
      suv: { base: 120, perKm: 22, perMin: 3 }
    };

    // Check surge pricing (simplified - in production check real-time demand)
    const currentHour = new Date().getHours();
    let surge = 1.0;
    if (currentHour >= 8 && currentHour <= 10) surge = 1.3; // Morning rush
    if (currentHour >= 17 && currentHour <= 20) surge = 1.5; // Evening rush

    const estimates = {};
    Object.keys(baseFares).forEach(type => {
      const fare = baseFares[type];
      const baseFare = fare.base;
      const distanceFare = directions.distance * fare.perKm;
      const timeFare = directions.duration * fare.perMin;
      const subtotal = baseFare + distanceFare + timeFare;
      const gst = Math.round(subtotal * 0.05);
      const serviceFee = Math.round(subtotal * 0.02);
      const total = Math.round((subtotal + gst + serviceFee) * surge);

      estimates[type] = {
        baseFare,
        distanceFare: Math.round(distanceFare),
        timeFare: Math.round(timeFare),
        subtotal: Math.round(subtotal),
        gst,
        serviceFee,
        surge,
        estimatedFare: total,
        distance: directions.distance.toFixed(2),
        duration: Math.round(directions.duration)
      };
    });

    res.json({
      success: true,
      estimates,
      selectedType: estimates[rideType],
      polyline: directions.polyline
    });
  } catch (error) {
    console.error('Estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating estimate',
      error: error.message
    });
  }
});

// @route   POST /api/rides/book
// @desc    Book a ride with driver search
// @access  Private
router.post('/book', protect, async (req, res) => {
  try {
    const { pickup, dropoff, rideType, paymentMethod, notes } = req.body;

    if (!pickup || !dropoff || !rideType || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Get route details from Google Maps
    const directions = await googleMapsService.getDirections(
      { latitude: pickup.coordinates[1], longitude: pickup.coordinates[0] },
      { latitude: dropoff.coordinates[1], longitude: dropoff.coordinates[0] }
    );

    // Create ride
    const ride = new Ride({
      user: req.user.id,
      pickup: {
        address: pickup.address,
        coordinates: {
          type: 'Point',
          coordinates: pickup.coordinates
        }
      },
      dropoff: {
        address: dropoff.address,
        coordinates: {
          type: 'Point',
          coordinates: dropoff.coordinates
        }
      },
      rideType,
      distance: directions.distance,
      estimatedDuration: Math.round(directions.duration),
      routePolyline: directions.polyline,
      paymentMethod,
      notes,
      status: 'searching'
    });

    // Calculate fare
    ride.estimatedFare = ride.calculateFare();

    await ride.save();
    await ride.populate('user', 'firstName lastName phone profilePicture');

    // Search for nearby available drivers
    const nearbyDrivers = await Driver.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickup.coordinates
          },
          $maxDistance: 5000 // 5km radius
        }
      },
      isOnline: true,
      isAvailable: true,
      accountStatus: 'active',
      verificationStatus: 'approved',
      'vehicle.type': rideType,
      currentRide: null
    }).limit(10);

    console.log(`Found ${nearbyDrivers.length} nearby drivers`);

    if (nearbyDrivers.length > 0) {
      // Notify drivers via Socket.io
      const io = req.app.get('io');
      nearbyDrivers.forEach(driver => {
        io.to(`driver:${driver._id}`).emit('new-ride-request', {
          rideId: ride._id,
          pickup: pickup.address,
          dropoff: dropoff.address,
          fare: ride.estimatedFare,
          distance: directions.distance,
          duration: Math.round(directions.duration)
        });
      });

      // Auto-assign to closest driver after 30 seconds if no one accepts
      setTimeout(async () => {
        const updatedRide = await Ride.findById(ride._id);
        if (updatedRide.status === 'searching') {
          updatedRide.status = 'no_driver_found';
          await updatedRide.save();
          
          io.to(`ride:${ride._id}`).emit('no-driver-found');
        }
      }, 30000);
    } else {
      ride.status = 'no_driver_found';
      await ride.save();
    }

    res.status(201).json({
      success: true,
      ride,
      message: nearbyDrivers.length > 0 
        ? 'Ride booked! Searching for drivers...' 
        : 'No drivers available nearby. Please try again.'
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error booking ride',
      error: error.message
    });
  }
});

// @route   POST /api/rides/:id/accept
// @desc    Driver accepts ride
// @access  Private (Driver)
router.post('/:id/accept', async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('user', 'firstName lastName phone');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (ride.status !== 'searching') {
      return res.status(400).json({
        success: false,
        message: 'Ride is no longer available'
      });
    }

    const driver = await Driver.findById(req.body.driverId);

    if (!driver || !driver.canAcceptRide()) {
      return res.status(403).json({
        success: false,
        message: 'Driver cannot accept rides'
      });
    }

    // Assign driver
    ride.driver = driver._id;
    ride.status = 'driver_accepted';
    ride.timestamps.driverAccepted = new Date();
    ride.vehicle = {
      type: driver.vehicle.type,
      make: driver.vehicle.make,
      model: driver.vehicle.model,
      color: driver.vehicle.color,
      registrationNumber: driver.vehicle.registrationNumber
    };

    // Generate OTP for ride verification
    const otp = ride.generateOTP();

    await ride.save();

    // Update driver
    driver.currentRide = ride._id;
    driver.isAvailable = false;
    await driver.save();

    // Notify user
    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit('driver-accepted', {
      driver: {
        id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        rating: driver.rating.average,
        vehicle: ride.vehicle
      },
      otp: otp
    });

    // Send SMS with OTP (implement your SMS service)
    // await sendSMS(ride.user.phone, `Your ride OTP is: ${otp}`);

    res.json({
      success: true,
      message: 'Ride accepted successfully',
      ride,
      otp: otp // Send OTP in response (remove in production, only send via SMS)
    });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting ride',
      error: error.message
    });
  }
});

// @route   PUT /api/rides/:id/update-location
// @desc    Update driver location
// @access  Private (Driver)
router.put('/:id/update-location', async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Update driver location
    ride.updateDriverLocation(longitude, latitude);
    ride.addTrackingPoint([longitude, latitude], speed, heading);

    // Calculate ETA using Google Maps
    let destination;
    if (ride.status === 'driver_accepted' || ride.status === 'driver_arriving') {
      destination = {
        latitude: ride.pickup.coordinates.coordinates[1],
        longitude: ride.pickup.coordinates.coordinates[0]
      };
    } else if (ride.status === 'ride_started') {
      destination = {
        latitude: ride.dropoff.coordinates.coordinates[1],
        longitude: ride.dropoff.coordinates.coordinates[0]
      };
    }

    if (destination) {
      const eta = await googleMapsService.getETA(
        { latitude, longitude },
        destination
      );
      
      if (eta) {
        ride.driverETA = Math.round(eta.duration);
        ride.driverDistance = eta.distance;
      }
    }

    await ride.save();

    // Broadcast location to user
    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit('driver:location:update', {
      latitude,
      longitude,
      speed,
      heading,
      eta: ride.driverETA,
      distance: ride.driverDistance
    });

    res.json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

// @route   POST /api/rides/:id/verify-otp
// @desc    Verify OTP and start ride
// @access  Private
router.post('/:id/verify-otp', protect, async (req, res) => {
  try {
    const { otp } = req.body;

    const ride = await Ride.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    const result = ride.verifyOTP(otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    ride.status = 'ride_started';
    ride.timestamps.rideStarted = new Date();
    await ride.save();

    // Notify driver
    const io = req.app.get('io');
    io.to(`driver:${ride.driver}`).emit('ride-started', {
      rideId: ride._id
    });

    res.json({
      success: true,
      message: 'OTP verified! Ride started.',
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
});

// @route   PUT /api/rides/:id/complete
// @desc    Complete ride
// @access  Private (Driver)
router.put('/:id/complete', async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('user', 'firstName lastName')
      .populate('driver', 'firstName lastName');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (ride.status !== 'ride_started') {
      return res.status(400).json({
        success: false,
        message: 'Ride not in progress'
      });
    }

    ride.status = 'ride_completed';
    ride.timestamps.rideCompleted = new Date();
    
    // Calculate actual duration
    const duration = (ride.timestamps.rideCompleted - ride.timestamps.rideStarted) / (1000 * 60);
    ride.actualDuration = Math.round(duration);
    
    // Set actual fare (could be different if route changed)
    ride.actualFare = ride.totalFare;

    await ride.save();

    // Update driver stats
    const driver = await Driver.findById(ride.driver);
    driver.stats.completedRides += 1;
    driver.stats.totalDistance += ride.distance;
    driver.earnings.pending += ride.actualFare;
    driver.earnings.total += ride.actualFare;
    driver.currentRide = null;
    driver.isAvailable = true;
    await driver.save();

    // Notify user
    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit('ride-completed', {
      fare: ride.actualFare,
      duration: ride.actualDuration
    });

    res.json({
      success: true,
      message: 'Ride completed successfully',
      ride,
      fare: ride.actualFare
    });
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing ride',
      error: error.message
    });
  }
});

// @route   PUT /api/rides/:id/cancel
// @desc    Cancel a ride
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason, reasonCategory } = req.body;

    const ride = await Ride.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (!['searching', 'driver_accepted', 'driver_arriving', 'driver_arrived'].includes(ride.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel ride at this stage'
      });
    }

    // Calculate cancellation fee
    let cancellationFee = 0;
    if (!ride.canCancelFree()) {
      cancellationFee = Math.round(ride.estimatedFare * 0.1);
    }

    ride.status = 'cancelled_by_user';
    ride.timestamps.cancelled = new Date();
    ride.cancellation = {
      cancelledBy: 'user',
      reason,
      reasonCategory,
      fee: cancellationFee
    };

    await ride.save();

    // Free up driver if assigned
    if (ride.driver) {
      const driver = await Driver.findById(ride.driver);
      if (driver) {
        driver.currentRide = null;
        driver.isAvailable = true;
        await driver.save();

        // Notify driver
        const io = req.app.get('io');
        io.to(`driver:${driver._id}`).emit('ride-cancelled', {
          rideId: ride._id,
          reason: 'Cancelled by user'
        });
      }
    }

    res.json({
      success: true,
      ride,
      cancellationFee,
      message: cancellationFee > 0 
        ? `Ride cancelled. Cancellation fee: ₹${cancellationFee}` 
        : 'Ride cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling ride',
      error: error.message
    });
  }
});

// @route   POST /api/rides/:id/rate
// @desc    Rate a ride
// @access  Private
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating, review, tips, tags } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const ride = await Ride.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: 'ride_completed'
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Completed ride not found'
      });
    }

    if (ride.userRating && ride.userRating.rating) {
      return res.status(400).json({
        success: false,
        message: 'Ride already rated'
      });
    }

    ride.userRating = {
      rating,
      review: review || '',
      tips: tips || 0,
      tags: tags || [],
      ratedAt: new Date()
    };

    await ride.save();

    // Update driver rating
    if (ride.driver) {
      const driver = await Driver.findById(ride.driver);
      if (driver) {
        await driver.updateRating(rating);
        
        // Add tips to earnings
        if (tips > 0) {
          driver.earnings.pending += tips;
          driver.earnings.total += tips;
          await driver.save();
        }
      }
    }

    res.json({
      success: true,
      message: 'Thank you for your rating!',
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rating ride',
      error: error.message
    });
  }
});

// @route   GET /api/rides/active
// @desc    Get user's active ride
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      user: req.user.id,
      status: { 
        $in: [
          'searching', 
          'driver_accepted', 
          'driver_arriving', 
          'driver_arrived',
          'otp_verified',
          'ride_started'
        ] 
      }
    })
    .populate('user', 'firstName lastName phone profilePicture')
    .populate('driver', 'firstName lastName phone profilePicture rating vehicle')
    .sort({ createdAt: -1 });

    if (!ride) {
      return res.json({
        success: true,
        hasActiveRide: false
      });
    }

    res.json({
      success: true,
      hasActiveRide: true,
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active ride',
      error: error.message
    });
  }
});

// @route   GET /api/rides/history
// @desc    Get user's ride history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const rides = await Ride.find({
      user: req.user.id,
      status: { $in: ['ride_completed', 'cancelled_by_user', 'cancelled_by_driver'] }
    })
    .populate('driver', 'firstName lastName vehicle rating')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Ride.countDocuments({
      user: req.user.id,
      status: { $in: ['ride_completed', 'cancelled_by_user', 'cancelled_by_driver'] }
    });

    res.json({
      success: true,
      rides,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ride history',
      error: error.message
    });
  }
});

// @route   GET /api/rides/:id
// @desc    Get ride details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate('user', 'firstName lastName phone profilePicture')
    .populate('driver', 'firstName lastName phone profilePicture rating vehicle');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    res.json({
      success: true,
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ride details',
      error: error.message
    });
  }
});

module.exports = router;