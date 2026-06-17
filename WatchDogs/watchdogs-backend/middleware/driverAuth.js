const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Check if it's a driver token
      if (decoded.type !== 'driver') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized as driver'
        });
      }

      // Get driver from token
      req.driver = await Driver.findById(decoded.id).select('-password');

      if (!req.driver) {
        return res.status(401).json({
          success: false,
          message: 'Driver not found'
        });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

module.exports = { protect };