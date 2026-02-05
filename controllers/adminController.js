const User = require('../models/User');
const Blog = require('../models/Blog');
const jwt = require('jsonwebtoken');

/**
 * Admin Controller
 * Handles all admin panel operations including user management and blog management
 */

/**
 * Render admin login page
 * GET /admin/login
 */
exports.getLogin = (req, res) => {
  res.render('admin/login', {
    error: req.query.error || null,
    success: req.query.success || null
  });
};

/**
 * Handle admin login
 * POST /admin/login
 */
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if password matches
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set cookie with token (HttpOnly for security)
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict'
    });

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token, // Also return token for localStorage fallback
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * Handle admin logout
 * GET /admin/logout
 */
exports.logout = (req, res) => {
  // Clear the admin token cookie
  res.clearCookie('adminToken');
  
  // Render a logout page that clears localStorage and redirects
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logging out...</title>
    </head>
    <body>
      <script>
        // Clear all tokens from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.clear();
        
        // Clear session storage
        sessionStorage.clear();
        
        // Redirect to login page (use replace to prevent back button)
        window.location.replace('/admin/login?success=Logged out successfully');
      </script>
      <p>Logging out...</p>
    </body>
    </html>
  `);
};

/**
 * Render admin dashboard home page
 * GET /admin
 */
exports.getDashboard = async (req, res) => {
  try {
    // Set cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Get some stats for the dashboard
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const draftBlogs = await Blog.countDocuments({ status: 'draft' });
    const pendingBlogs = await Blog.countDocuments({ status: 'pending_approval' });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.user,
      stats: {
        totalUsers,
        activeUsers,
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        pendingBlogs
      },
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'Failed to load dashboard',
      user: req.user
    });
  }
};

/**
 * Get all users and render users page
 * GET /admin/users
 */
exports.getUsers = async (req, res) => {
  try {
    // Set cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Fetch all users with basic information
    const users = await User.find({})
      .select('name email isActive isAdmin createdAt')
      .sort({ createdAt: -1 });

    res.render('admin/users', {
      title: 'Manage Users',
      users,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'Failed to fetch users',
      user: req.user
    });
  }
};

/**
 * Toggle user active/inactive status
 * PATCH /admin/users/:id
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (userId === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle the isActive status
    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

/**
 * Get all blogs and render blogs page
 * GET /admin/blogs
 */
exports.getBlogs = async (req, res) => {
  try {
    // Set cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Fetch all blogs with author information
    const blogs = await Blog.find({})
      .populate('user_id', 'name email')
      .select('title slug status impression createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.render('admin/blogs', {
      title: 'Manage Blogs',
      blogs,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'Failed to fetch blogs',
      user: req.user
    });
  }
};

/**
 * Toggle blog status (draft/published/pending_approval/rejected)
 * PATCH /admin/blogs/:id
 */
exports.toggleBlogStatus = async (req, res) => {
  try {
    const blogId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'published', 'pending_approval', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: draft, published, pending_approval, rejected'
      });
    }

    // Find the blog
    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // If status is provided, set it; otherwise toggle between draft and published
    if (status) {
      blog.status = status;
    } else {
      // Simple toggle logic: if published, make it draft; otherwise make it published
      blog.status = blog.status === 'published' ? 'draft' : 'published';
    }

    await blog.save();

    res.json({
      success: true,
      message: `Blog status updated to ${blog.status} successfully`,
      status: blog.status
    });
  } catch (error) {
    console.error('Error toggling blog status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog status'
    });
  }
};

/**
 * Delete a blog
 * DELETE /admin/blogs/:id
 */
exports.deleteBlog = async (req, res) => {
  try {
    const blogId = req.params.id;

    const blog = await Blog.findByIdAndDelete(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog'
    });
  }
};
