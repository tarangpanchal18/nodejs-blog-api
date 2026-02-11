const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { commentRateLimiter, reportRateLimiter } = require('../middleware/commentRateLimiter');

/**
 * Public Routes
 * These routes can be accessed without authentication
 */

/**
 * @route   GET /api/blogs/:slug/comments
 * @desc    Get all comments for a blog (nested tree structure)
 * @access  Public (but only shows 'active' comments to non-admins)
 */
router.get('/blogs/:slug/comments', commentController.getComments);

/**
 * Protected Routes (User Authentication Required)
 * These routes require a valid JWT token
 */

/**
 * @route   POST /api/blogs/:slug/comments
 * @desc    Create a new top-level comment on a blog
 * @access  Protected (authenticated users only)
 */
router.post('/blogs/:slug/comments', authenticate, commentRateLimiter, commentController.createComment);

/**
 * @route   POST /api/comments/:commentId/reply
 * @desc    Reply to an existing comment
 * @access  Protected (authenticated users only)
 */
router.post('/comments/:commentId/reply', authenticate, commentRateLimiter, commentController.replyToComment);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete own comment (soft delete)
 * @access  Protected (comment owner only)
 */
router.delete('/comments/:commentId', authenticate, commentController.deleteComment);

/**
 * @route   POST /api/comments/:commentId/report
 * @desc    Report a comment as spam/offensive
 * @access  Protected (authenticated users only)
 */
router.post('/comments/:commentId/report', authenticate, reportRateLimiter, commentController.reportComment);

/**
 * Admin Routes
 * These routes require admin privileges
 */

/**
 * @route   GET /api/admin/comments/flagged
 * @desc    Get all flagged comments for moderation
 * @access  Admin only
 */
router.get('/admin/comments/flagged', adminAuth, commentController.getFlaggedComments);

/**
 * @route   PATCH /api/admin/comments/:commentId/moderate
 * @desc    Moderate a comment (approve, hide, or delete)
 * @access  Admin only
 */
router.patch('/admin/comments/:commentId/moderate', adminAuth, commentController.moderateComment);

/**
 * @route   GET /api/admin/comments/:commentId/reports
 * @desc    Get detailed spam reports for a specific comment
 * @access  Admin only
 */
router.get('/admin/comments/:commentId/reports', adminAuth, commentController.getCommentReports);

module.exports = router;
