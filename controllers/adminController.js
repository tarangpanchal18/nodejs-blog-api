const User = require('../models/User');
const Blog = require('../models/Blog');

/**
 * Admin Controller
 * Handles all admin panel operations including user management and blog management
 */

/**
 * Render admin dashboard home page
 * GET /admin
 */
exports.getDashboard = async (req, res) => {
  try {
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
