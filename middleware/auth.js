const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendUnauthorized, sendError } = require('../helpers/responseHelper');
const { sanitizeObjectId } = require('../helpers/securityHelper');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided. Please login first.');
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return sendUnauthorized(res, 'No token provided. Please login first.');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Sanitize and validate userId from token
      const userId = sanitizeObjectId(decoded.userId);
      if (!userId) {
        return sendUnauthorized(res, 'Invalid token. Please login again.');
      }

      // Get user from database
      const user = await User.findById(userId).select('-password');

      if (!user) {
        return sendUnauthorized(res, 'User not found. Token invalid.');
      }

      if (!user.isActive) {
        return sendUnauthorized(res, 'User account is inactive.');
      }

      // Attach user to request
      req.user = user;
      req.userId = userId;

      next();
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return sendUnauthorized(res, 'Token has expired. Please login again.');
      }
      if (tokenError.name === 'JsonWebTokenError') {
        return sendUnauthorized(res, 'Invalid token. Please login again.');
      }
      return sendUnauthorized(res, 'Token verification failed.');
    }
  } catch (error) {
    return sendError(res, 'Authentication error', 500, error.message);
  }
};

module.exports = authenticate;
