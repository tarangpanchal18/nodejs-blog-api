require('dotenv').config();
const rateLimit = require('express-rate-limit');

/**
 * Stricter rate limiter specifically for comment creation
 * Prevents comment spam by limiting how many comments a user can post
 * 
 * Configurable via environment variables:
 * - COMMENT_RATE_LIMIT_WINDOW_MS: Time window (default: 60000 = 1 minute)
 * - COMMENT_RATE_LIMIT_MAX: Maximum comments per window (default: 10)
 */
const commentRateLimiter = rateLimit({
  windowMs: parseInt(process.env.COMMENT_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.COMMENT_RATE_LIMIT_MAX) || 10, // 10 comments per minute
  message: {
    success: false,
    message: 'Too many comments from this IP, please slow down and try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use a custom key generator to rate limit per IP + user combination
  keyGenerator: (req) => {
    // If user is authenticated, use their user ID + IP
    if (req.user && req.user._id) {
      return `${req.ip}-${req.user._id}`;
    }
    // Otherwise just use IP
    return req.ip;
  },
});

/**
 * Rate limiter for spam reporting
 * Prevents abuse of the report system
 */
const reportRateLimiter = rateLimit({
  windowMs: parseInt(process.env.REPORT_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.REPORT_RATE_LIMIT_MAX) || 5, // 5 reports per minute
  message: {
    success: false,
    message: 'Too many reports from this IP, please wait before reporting again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `report-${req.ip}-${req.user._id}`;
    }
    return `report-${req.ip}`;
  },
});

module.exports = {
  commentRateLimiter,
  reportRateLimiter,
};
