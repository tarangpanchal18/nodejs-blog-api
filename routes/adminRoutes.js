const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

/**
 * Admin Routes
 * Public routes (login) are not protected
 * All other routes are protected by adminAuth middleware
 * Only users with isAdmin: true can access protected routes
 */

/**
 * Public Routes (No Authentication Required)
 */
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

/**
 * Protected Routes (Authentication Required)
 * Apply admin authentication middleware to all routes below
 */
router.use(adminAuth);

/**
 * Dashboard
 * GET /admin
 */
router.get('/', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.patch('/users/:id', adminController.toggleUserStatus);
router.get('/blogs', adminController.getBlogs);
router.patch('/blogs/:id', adminController.toggleBlogStatus);
router.delete('/blogs/:id', adminController.deleteBlog);

module.exports = router;
