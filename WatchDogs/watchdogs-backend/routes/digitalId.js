const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const QRCode = require('qrcode'); // ← Install this: npm install qrcode
const DigitalID = require('../models/DigitalID');
const { protect } = require('../middleware/auth');

// Helper to generate QR code as base64 image
const generateQRCode = async (data) => {
  try {
    const qrData = JSON.stringify(data);
    // Generate as data URL (base64 PNG image)
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

// @route   POST /api/digital-id/generate
// @desc    Generate new digital ID
// @access  Private
router.post('/generate', protect, async (req, res) => {
  try {
    // Check if user already has a digital ID
    const existingId = await DigitalID.findOne({ user: req.user.id });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: 'Digital ID already exists for this user'
      });
    }

    const {
      personalInfo,
      kycDocuments,
      travelInfo,
      accessPin
    } = req.body;

    // ====== ADD VALIDATION ======
    // Validate personalInfo exists and has required fields
    if (!personalInfo) {
      return res.status(400).json({
        success: false,
        message: 'Personal information is required',
        error: 'personalInfo field is missing'
      });
    }

    const requiredPersonalFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'nationality'];
    const missingPersonalFields = requiredPersonalFields.filter(field => !personalInfo[field]);
    
    if (missingPersonalFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required personal information fields',
        error: `Required fields missing: ${missingPersonalFields.join(', ')}`,
        requiredFields: requiredPersonalFields
      });
    }

    // Validate dateOfBirth is a valid date
    const dob = new Date(personalInfo.dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date of birth',
        error: 'dateOfBirth must be a valid date'
      });
    }

    // Validate gender
    if (!['male', 'female', 'other'].includes(personalInfo.gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender value',
        error: 'gender must be one of: male, female, other'
      });
    }

    // Validate KYC documents if provided
    if (kycDocuments && Array.isArray(kycDocuments)) {
      for (let i = 0; i < kycDocuments.length; i++) {
        const doc = kycDocuments[i];
        if (!doc.documentType || !doc.documentNumber) {
          return res.status(400).json({
            success: false,
            message: `KYC document at index ${i} is missing required fields`,
            error: 'Each KYC document must have documentType and documentNumber'
          });
        }
        
        const validDocTypes = ['passport', 'visa', 'national_id', 'driving_license'];
        if (!validDocTypes.includes(doc.documentType)) {
          return res.status(400).json({
            success: false,
            message: `Invalid document type at index ${i}`,
            error: `documentType must be one of: ${validDocTypes.join(', ')}`
          });
        }
      }
    }

    // Validate travelInfo if provided
    if (travelInfo && travelInfo.entryType) {
      const validEntryTypes = ['airport', 'seaport', 'land_border'];
      if (!validEntryTypes.includes(travelInfo.entryType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entry type',
          error: `entryType must be one of: ${validEntryTypes.join(', ')}`
        });
      }
    }

    if (travelInfo && travelInfo.purposeOfVisit) {
      const validPurposes = ['tourism', 'business', 'education', 'medical', 'other'];
      if (!validPurposes.includes(travelInfo.purposeOfVisit)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purpose of visit',
          error: `purposeOfVisit must be one of: ${validPurposes.join(', ')}`
        });
      }
    }

    // Validate accessPin if provided
    if (accessPin) {
      if (!/^\d{6}$/.test(accessPin)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid access PIN',
          error: 'accessPin must be exactly 6 digits'
        });
      }
    }
    // ====== END VALIDATION ======

    // Generate QR code data
    const qrData = {
      id: crypto.randomBytes(16).toString('hex'),
      userId: req.user.id,
      timestamp: new Date().toISOString()
    };
    
    // Generate actual QR code image (base64 data URL)
    const qrCode = await generateQRCode(qrData);

    // Hash access PIN
    const hashedPin = accessPin ? 
      crypto.createHash('sha256').update(accessPin).digest('hex') : null;

    const digitalId = await DigitalID.create({
      user: req.user.id,
      personalInfo,
      kycDocuments: kycDocuments || [],
      travelInfo: travelInfo || {},
      qrCode,
      accessPin: hashedPin,
      verificationStatus: 'pending'
    });

    res.status(201).json({
      success: true,
      digitalId,
      message: 'Digital ID generated successfully. Awaiting verification.'
    });
  } catch (error) {
    console.error('Error generating digital ID:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating digital ID',
      error: error.message
    });
  }
});

// @route   GET /api/digital-id/me
// @desc    Get user's digital ID
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    res.json({
      success: true,
      digitalId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching digital ID',
      error: error.message
    });
  }
});

// @route   PUT /api/digital-id/update
// @desc    Update digital ID information
// @access  Private
router.put('/update', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    const allowedUpdates = ['personalInfo', 'travelInfo'];
    allowedUpdates.forEach(field => {
      if (req.body[field]) {
        digitalId[field] = { ...digitalId[field], ...req.body[field] };
      }
    });

    // If documents are updated, set verification back to pending
    if (req.body.kycDocuments) {
      digitalId.kycDocuments = req.body.kycDocuments;
      digitalId.verificationStatus = 'in_review';
    }

    await digitalId.save();

    res.json({
      success: true,
      digitalId,
      message: 'Digital ID updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating digital ID',
      error: error.message
    });
  }
});

// @route   POST /api/digital-id/verify-pin
// @desc    Verify access PIN
// @access  Private
router.post('/verify-pin', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    if (!digitalId.accessPin) {
      return res.status(400).json({
        success: false,
        message: 'No PIN set for this digital ID'
      });
    }

    const hashedPin = crypto.createHash('sha256').update(pin).digest('hex');
    
    if (hashedPin !== digitalId.accessPin) {
      digitalId.failedAccessAttempts += 1;
      digitalId.lastAccessAttempt = new Date();
      await digitalId.save();

      return res.status(401).json({
        success: false,
        message: 'Incorrect PIN',
        attemptsRemaining: Math.max(0, 3 - digitalId.failedAccessAttempts)
      });
    }

    // Reset failed attempts on success
    digitalId.failedAccessAttempts = 0;
    digitalId.lastUsed = new Date();
    digitalId.usageCount += 1;
    await digitalId.save();

    res.json({
      success: true,
      message: 'PIN verified successfully',
      digitalId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying PIN',
      error: error.message
    });
  }
});

// @route   POST /api/digital-id/checkpoint
// @desc    Record checkpoint usage
// @access  Private
router.post('/checkpoint', protect, async (req, res) => {
  try {
    const { location, checkpointType, verifiedBy } = req.body;
    
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    if (!digitalId.isActive || digitalId.isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Digital ID is not active or has expired'
      });
    }

    digitalId.checkpoints.push({
      location,
      checkpointType,
      verifiedBy,
      timestamp: new Date()
    });

    digitalId.lastUsed = new Date();
    digitalId.usageCount += 1;

    await digitalId.save();

    res.json({
      success: true,
      message: 'Checkpoint recorded successfully',
      checkpoint: digitalId.checkpoints[digitalId.checkpoints.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error recording checkpoint',
      error: error.message
    });
  }
});

// @route   GET /api/digital-id/checkpoints
// @desc    Get checkpoint history
// @access  Private
router.get('/checkpoints', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    res.json({
      success: true,
      checkpoints: digitalId.checkpoints.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching checkpoints',
      error: error.message
    });
  }
});

// @route   POST /api/digital-id/regenerate-qr
// @desc    Regenerate QR code
// @access  Private
router.post('/regenerate-qr', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    // Generate new QR code
    const qrData = {
      id: crypto.randomBytes(16).toString('hex'),
      userId: req.user.id,
      timestamp: new Date().toISOString()
    };
    digitalId.qrCode = await generateQRCode(qrData);

    await digitalId.save();

    res.json({
      success: true,
      qrCode: digitalId.qrCode,
      message: 'QR code regenerated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error regenerating QR code',
      error: error.message
    });
  }
});

// @route   GET /api/digital-id/status
// @desc    Get digital ID status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.json({
        success: true,
        hasDigitalId: false
      });
    }

    res.json({
      success: true,
      hasDigitalId: true,
      status: {
        verificationStatus: digitalId.verificationStatus,
        isActive: digitalId.isActive,
        isExpired: digitalId.isExpired,
        verificationPercentage: digitalId.verificationPercentage,
        expiresAt: digitalId.expiresAt,
        lastUsed: digitalId.lastUsed,
        usageCount: digitalId.usageCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching status',
      error: error.message
    });
  }
});

// @route   POST /api/digital-id/verify-qr
// @desc    Verify QR code and return Digital ID info
// @access  Private
router.post('/verify-qr', protect, async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData || !qrData.userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code data'
      });
    }

    // Find the digital ID
    const digitalId = await DigitalID.findOne({ 
      user: qrData.userId 
    }).populate('user', 'firstName lastName email');
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    // Check if expired
    if (digitalId.isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Digital ID has expired'
      });
    }

    // Check if active
    if (!digitalId.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Digital ID is not active'
      });
    }

    // Verify QR timestamp (should be recent)
    const qrTimestamp = new Date(qrData.timestamp);
    const now = new Date();
    const hoursDiff = (now - qrTimestamp) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return res.status(400).json({
        success: false,
        message: 'QR code is too old. Please regenerate.'
      });
    }

    res.json({
      success: true,
      message: 'Digital ID verified successfully',
      digitalId: {
        idNumber: digitalId.idNumber,
        personalInfo: digitalId.personalInfo,
        verificationStatus: digitalId.verificationStatus,
        expiresAt: digitalId.expiresAt,
        lastUsed: digitalId.lastUsed,
        usageCount: digitalId.usageCount
      }
    });
    
  } catch (error) {
    console.error('QR verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying QR code',
      error: error.message
    });
  }
});

module.exports = router;