const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    console.log('📖 Loading profile for user:', req.user.id);
    console.log('Emergency contacts count:', user.emergencyContacts?.length || 0);
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile (including emergency contacts and medical info)
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    console.log('📝 Profile update request received');
    console.log('User ID:', req.user.id);
    console.log('Request body keys:', Object.keys(req.body));

    const allowedUpdates = [
      'firstName', 
      'lastName', 
      'nationality', 
      'phone', 
      'dateOfBirth', 
      'profilePicture', 
      'preferences',
      'emergencyContacts',  // ← NOW ALLOWED
      'medicalInfo'         // ← NOW ALLOWED
    ];
    
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
        console.log(`✓ Updating ${field}:`, 
          field === 'emergencyContacts' ? `${req.body[field].length} contacts` :
          field === 'medicalInfo' ? 'medical data' :
          req.body[field]
        );
      }
    });

    console.log('Performing update with fields:', Object.keys(updates));

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Profile updated successfully');
    
    if (updates.emergencyContacts) {
      console.log('✅ Emergency contacts saved:', user.emergencyContacts.length);
      console.log('Contact details:', user.emergencyContacts.map(c => ({
        name: c.name,
        phone: c.phone
      })));
    }

    if (updates.medicalInfo) {
      console.log('✅ Medical info saved');
    }

    res.json({
      success: true,
      user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   POST /api/users/emergency-contacts
// @desc    Add emergency contact (alternative method)
// @access  Private
router.post('/emergency-contacts', protect, async (req, res) => {
  try {
    const { name, relationship, phone, email, priorityOrder } = req.body;

    console.log('➕ Adding emergency contact:', name);

    const user = await User.findById(req.user.id);
    
    user.emergencyContacts.push({
      name,
      relationship,
      phone,
      email,
      priorityOrder: priorityOrder || user.emergencyContacts.length + 1
    });

    await user.save();

    console.log('✅ Contact added. Total contacts:', user.emergencyContacts.length);

    res.json({
      success: true,
      emergencyContacts: user.emergencyContacts,
      message: 'Emergency contact added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding emergency contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding emergency contact',
      error: error.message
    });
  }
});

// @route   PUT /api/users/emergency-contacts/:contactId
// @desc    Update emergency contact
// @access  Private
router.put('/emergency-contacts/:contactId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const contact = user.emergencyContacts.id(req.params.contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    Object.assign(contact, req.body);
    await user.save();

    console.log('✅ Contact updated');

    res.json({
      success: true,
      emergencyContacts: user.emergencyContacts
    });
  } catch (error) {
    console.error('❌ Error updating emergency contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating emergency contact',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/emergency-contacts/:contactId
// @desc    Delete emergency contact
// @access  Private
router.delete('/emergency-contacts/:contactId', protect, async (req, res) => {
  try {
    console.log('🗑️ Deleting contact:', req.params.contactId);
    
    const user = await User.findById(req.user.id);
    user.emergencyContacts.pull(req.params.contactId);
    await user.save();

    console.log('✅ Contact deleted. Remaining:', user.emergencyContacts.length);

    res.json({
      success: true,
      emergencyContacts: user.emergencyContacts
    });
  } catch (error) {
    console.error('❌ Error deleting emergency contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting emergency contact',
      error: error.message
    });
  }
});

// @route   PUT /api/users/medical-info
// @desc    Update medical information
// @access  Private
router.put('/medical-info', protect, async (req, res) => {
  try {
    const { bloodType, allergies, medications, medicalConditions, emergencyNotes } = req.body;

    console.log('🏥 Updating medical info');

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        medicalInfo: {
          bloodType,
          allergies,
          medications,
          medicalConditions,
          emergencyNotes
        }
      },
      { new: true, runValidators: true }
    );

    console.log('✅ Medical info updated');

    res.json({
      success: true,
      medicalInfo: user.medicalInfo,
      message: 'Medical information updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating medical information:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating medical information',
      error: error.message
    });
  }
});

// @route   GET /api/users/settings
// @desc    Get user settings
// @access  Private
router.get('/settings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    
    res.json({
      success: true,
      settings: user.preferences || {}
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading settings',
      error: error.message
    });
  }
});

// @route   PUT /api/users/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', protect, async (req, res) => {
  try {
    const { settings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { preferences: settings } },
      { new: true }
    );

    res.json({
      success: true,
      settings: user.preferences,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving settings',
      error: error.message
    });
  }
});

// @route   GET /api/users/export-data
// @desc    Export all user data
// @access  Private
router.get('/export-data', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    // Get user's emergencies
    const Emergency = require('../models/Emergency');
    const emergencies = await Emergency.find({ user: req.user.id });

    // Compile all user data
    const exportData = {
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        nationality: user.nationality,
        dateOfBirth: user.dateOfBirth,
        role: user.role
      },
      emergencyContacts: user.emergencyContacts || [],
      medicalInfo: user.medicalInfo || {},
      preferences: user.preferences || {},
      emergencyHistory: emergencies.map(e => ({
        type: e.emergencyType,
        triggeredAt: e.triggeredAt,
        status: e.status,
        location: e.locationName
      })),
      accountInfo: {
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        accountStatus: user.accountStatus
      },
      exportedAt: new Date(),
      exportVersion: '1.0'
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', protect, async (req, res) => {
  try {
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation. Type DELETE to confirm.'
      });
    }

    // Delete user's emergencies
    const Emergency = require('../models/Emergency');
    await Emergency.deleteMany({ user: req.user.id });

    // Delete user
    await User.findByIdAndDelete(req.user.id);
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
});

module.exports = router;