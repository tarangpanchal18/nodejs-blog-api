const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const upload = require('../middleware/upload');
const authenticate = require('../middleware/auth');

// Public routes
router.get('/', blogController.getAllBlogs);
router.get('/tags/search', blogController.searchTags);

// Protected routes (require authentication)
// IMPORTANT: Specific routes must come before parameterized routes (/:slug)
router.get('/my-blogs', authenticate, blogController.getMyBlogs);
router.post('/import', authenticate, upload.single('file'), blogController.importBlogsFromCSV);
router.post('/', authenticate, blogController.createBlog);

// Parameterized routes (must come after specific routes)
router.get('/:slug', blogController.getBlogBySlug);
router.put('/:slug', authenticate, blogController.updateBlog);


module.exports = router;
