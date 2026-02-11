require('dotenv').config();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Stricter rate limiter specifically for comment creation
 * Prevents comment spam by limiting how many comments a user can post
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
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req);

    if (req.user && req.user._id) {
      return `${ipKey}-${req.user._id}`;
    }

    return ipKey;
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
    const ipKey = ipKeyGenerator(req);

    if (req.user && req.user._id) {
      return `report-${ipKey}-${req.user._id}`;
    }

    return `report-${ipKey}`;
  },
});

module.exports = {
  commentRateLimiter,
  reportRateLimiter,
};
