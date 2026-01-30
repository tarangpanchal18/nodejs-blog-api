const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

/**
 * Admin Routes
 * All routes are protected by adminAuth middleware
 * Only users with isAdmin: true can access these routes
 */

// Apply admin authentication middleware to all routes
router.use(adminAuth);

/**
 * Dashboard
 * GET /admin
 */
router.get('/', adminController.getDashboard);

/**
 * User Management Routes
 */

// GET /admin/users - Display all users
router.get('/users', adminController.getUsers);

// PATCH /admin/users/:id - Toggle user active/inactive status
router.patch('/users/:id', adminController.toggleUserStatus);

/**
 * Blog Management Routes
 */

// GET /admin/blogs - Display all blogs
router.get('/blogs', adminController.getBlogs);

// PATCH /admin/blogs/:id - Toggle blog status or update to specific status
router.patch('/blogs/:id', adminController.toggleBlogStatus);

// DELETE /admin/blogs/:id - Delete a blog (optional feature)
router.delete('/blogs/:id', adminController.deleteBlog);

module.exports = router;
