const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Driver = require('../../models/Driver');

// Import auth middleware
const { protect } = require('../../middleware/driverAuth');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/driver-documents';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'driver-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and PDFs are allowed'));
  }
});

// @route   POST /api/driver/auth/register
// @desc    Register new driver account (NO OTP VERIFICATION)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      registrationNumber
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'Driver with this email or phone already exists'
      });
    }

    // Create driver
    const driver = await Driver.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender,
      vehicle: {
        type: vehicleType,
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear,
        color: vehicleColor,
        registrationNumber: registrationNumber.toUpperCase()
      },
      // Auto-verify phone and email (skip OTP)
      phoneVerified: true,
      emailVerified: true,
      accountStatus: 'pending',
      verificationStatus: 'pending'
    });

    // Generate auth token
    const token = driver.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully! Please upload documents.',
      driver: {
        id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        accountStatus: driver.accountStatus,
        verificationStatus: driver.verificationStatus,
        phoneVerified: true,
        emailVerified: true
      },
      token,
      nextStep: 'upload_documents'
    });
  } catch (error) {
    console.error('Driver registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email, phone, or vehicle registration number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering driver',
      error: error.message
    });
  }
});

// @route   POST /api/driver/auth/login
// @desc    Driver login (NO OTP)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find driver and include password
    const driver = await Driver.findOne({ email }).select('+password');

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (driver.accountStatus === 'blocked' || driver.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: `Account is ${driver.accountStatus}. Please contact support.`
      });
    }

    // Verify password
    const isPasswordMatch = await driver.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update login stats
    driver.lastLogin = new Date();
    driver.loginCount += 1;
    await driver.save();

    // Generate token
    const token = driver.generateAuthToken();

    // Remove password from response
    driver.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      driver: {
        id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        profilePicture: driver.profilePicture,
        accountStatus: driver.accountStatus,
        verificationStatus: driver.verificationStatus,
        isOnline: driver.isOnline,
        phoneVerified: driver.phoneVerified,
        emailVerified: driver.emailVerified,
        rating: driver.rating,
        vehicle: driver.vehicle
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// @route   POST /api/driver/auth/logout
// @desc    Driver logout
// @access  Private (driver)
router.post('/logout', protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);
    
    if (driver) {
      driver.lastLogout = new Date();
      driver.isOnline = false;
      driver.isAvailable = false;
      await driver.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
});

// @route   GET /api/driver/auth/me
// @desc    Get current driver
// @access  Private (driver)
router.get('/me', protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching driver',
      error: error.message
    });
  }
});

// @route   PUT /api/driver/auth/update-profile
// @desc    Update driver profile
// @access  Private (driver)
router.put('/update-profile', protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const allowedFields = [
      'firstName', 'lastName', 'alternatePhone', 'profilePicture',
      'address', 'emergencyContact', 'preferences', 'bankDetails'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] === 'object' && !Array.isArray(req.body[field])) {
          driver[field] = { ...driver[field], ...req.body[field] };
        } else {
          driver[field] = req.body[field];
        }
      }
    });

    await driver.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   POST /api/driver/auth/upload-documents
// @desc    Upload driver documents
// @access  Private (driver)
router.post('/upload-documents',
  protect,
  upload.fields([
    { name: 'drivingLicenseFront', maxCount: 1 },
    { name: 'drivingLicenseBack', maxCount: 1 },
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'vehicleRC', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
    { name: 'vehicleFront', maxCount: 1 },
    { name: 'vehicleBack', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const driver = await Driver.findById(req.driver.id);

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
      }

      // Update document paths
      if (req.files.drivingLicenseFront) {
        driver.documents.drivingLicense.frontImage = `/uploads/driver-documents/${req.files.drivingLicenseFront[0].filename}`;
      }
      if (req.files.drivingLicenseBack) {
        driver.documents.drivingLicense.backImage = `/uploads/driver-documents/${req.files.drivingLicenseBack[0].filename}`;
      }
      if (req.files.aadhaarFront) {
        driver.documents.aadhaar.frontImage = `/uploads/driver-documents/${req.files.aadhaarFront[0].filename}`;
      }
      if (req.files.aadhaarBack) {
        driver.documents.aadhaar.backImage = `/uploads/driver-documents/${req.files.aadhaarBack[0].filename}`;
      }
      if (req.files.panCard) {
        driver.documents.pan.image = `/uploads/driver-documents/${req.files.panCard[0].filename}`;
      }
      if (req.files.vehicleRC) {
        driver.documents.vehicleRC.image = `/uploads/driver-documents/${req.files.vehicleRC[0].filename}`;
      }
      if (req.files.insurance) {
        driver.documents.insurance.image = `/uploads/driver-documents/${req.files.insurance[0].filename}`;
      }
      if (req.files.vehicleFront) {
        driver.vehicle.images.front = `/uploads/driver-documents/${req.files.vehicleFront[0].filename}`;
      }
      if (req.files.vehicleBack) {
        driver.vehicle.images.back = `/uploads/driver-documents/${req.files.vehicleBack[0].filename}`;
      }

      // Update document details from body
      if (req.body.drivingLicenseNumber) {
        driver.documents.drivingLicense.number = req.body.drivingLicenseNumber;
      }
      if (req.body.drivingLicenseExpiry) {
        driver.documents.drivingLicense.expiryDate = req.body.drivingLicenseExpiry;
      }
      if (req.body.aadhaarNumber) {
        driver.documents.aadhaar.number = req.body.aadhaarNumber;
      }
      if (req.body.panNumber) {
        driver.documents.pan.number = req.body.panNumber;
      }
      if (req.body.vehicleRCNumber) {
        driver.documents.vehicleRC.number = req.body.vehicleRCNumber;
      }
      if (req.body.insurancePolicyNumber) {
        driver.documents.insurance.policyNumber = req.body.insurancePolicyNumber;
      }
      if (req.body.insuranceExpiry) {
        driver.documents.insurance.expiryDate = req.body.insuranceExpiry;
      }

      // Change status to under review
      driver.verificationStatus = 'under_review';

      await driver.save();

      res.json({
        success: true,
        message: 'Documents uploaded successfully. Under review.',
        driver
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading documents',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/driver/auth/toggle-online
// @desc    Toggle driver online/offline status
// @access  Private (driver)
router.put('/toggle-online', protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Check if driver can go online
    if (!driver.isOnline && driver.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account must be active to go online'
      });
    }

    if (!driver.isOnline && driver.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Account must be verified to go online'
      });
    }

    // Toggle online status
    driver.isOnline = !driver.isOnline;
    driver.isAvailable = driver.isOnline;

    await driver.save();

    res.json({
      success: true,
      message: driver.isOnline ? 'You are now online' : 'You are now offline',
      driver: {
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling online status',
      error: error.message
    });
  }
});

// @route   POST /api/driver/auth/approve/:id
// @desc    Approve driver (ADMIN ONLY)
// @access  Private (Admin)
router.post('/approve/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    driver.verificationStatus = 'approved';
    driver.accountStatus = 'active';
    driver.verifiedAt = new Date();

    await driver.save();

    res.json({
      success: true,
      message: 'Driver approved successfully',
      driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving driver',
      error: error.message
    });
  }
});

// @route   POST /api/driver/auth/reject/:id
// @desc    Reject driver (ADMIN ONLY)
// @access  Private (Admin)
router.post('/reject/:id', async (req, res) => {
  try {
    const { reason } = req.body;

    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    driver.verificationStatus = 'rejected';
    driver.rejectionReason = reason;

    await driver.save();

    res.json({
      success: true,
      message: 'Driver rejected',
      driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting driver',
      error: error.message
    });
  }
});

module.exports = router;