const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to check if the user is authenticated and is an admin
 * This middleware verifies the JWT token and checks if the user has admin privileges
 * 
 * For admin panel pages, it redirects to login if not authenticated
 * For API endpoints, it returns a JSON error response
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check for token in multiple places (cookie, header, or query for flexibility)
    let token;
    
    // Priority 1: Cookie (for admin panel persistent sessions)
    if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }
    // Priority 2: Authorization header (for API requests)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Priority 3: Query parameter (fallback for initial redirect)
    else if (req.query.token) {
      token = req.query.token;
    }

    // Check if token exists
    if (!token) {
      // For HTML pages (browser requests), redirect to login page
      const acceptHeader = req.headers.accept || '';
      const isHtmlRequest = acceptHeader.includes('text/html');
      
      if (isHtmlRequest) {
        return res.redirect('/admin/login?error=Please login to access the admin panel');
      }
      
      // For API requests (AJAX), return JSON
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route - No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database and check if they're an admin
    const user = await User.findById(decoded.id).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Attach user to request object (without password)
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

module.exports = adminAuth;
