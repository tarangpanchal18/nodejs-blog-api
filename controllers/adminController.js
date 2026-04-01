const User = require('../models/User');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const jwt = require('jsonwebtoken');

const parsePagination = (pageQuery, limitQuery, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(parseInt(pageQuery, 10) || 1, 1);
  const requestedLimit = parseInt(limitQuery, 10) || defaultLimit;
  const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Collect all descendant comment IDs for a parent comment.
 * Uses iterative BFS to avoid deep recursion issues.
 */
const getDescendantCommentIds = async (rootCommentId) => {
  const descendants = [];
  let currentLevel = [rootCommentId];

  while (currentLevel.length > 0) {
    const children = await Comment.find({ parent_id: { $in: currentLevel } })
      .select('_id')
      .lean();

    if (!children.length) {
      break;
    }

    const childIds = children.map((child) => child._id);
    descendants.push(...childIds);
    currentLevel = childIds;
  }

  return descendants;
};

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
    success: req.query.success || null,
    frontendUrl: process.env.FRONTEND_URL || '/',
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
    const flaggedComments = await Comment.countDocuments({
      $or: [
        { status: 'pending_review' },
        { spam_report_count: { $gt: 0 } },
      ],
    });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.user,
      stats: {
        totalUsers,
        activeUsers,
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        pendingBlogs,
        flaggedComments,
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
 * Get reported/flagged comments and render moderation page
 * GET /admin/comments
 */
exports.getComments = async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    const allowedStatuses = ['all', 'pending_review', 'hidden', 'active', 'deleted'];
    const filterStatus = allowedStatuses.includes(req.query.status) ? req.query.status : 'all';
    const query = {};

    if (filterStatus !== 'all') {
      query.status = filterStatus;
    } else {
      query.$or = [
        { status: 'pending_review' },
        { status: 'hidden' },
        { spam_report_count: { $gt: 0 } },
      ];
    }

    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
    const total = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate('user_id', 'name email')
      .populate('blog_id', 'title slug')
      .select('content status spam_report_count is_auto_flagged spam_reports createdAt depth')
      .sort({ spam_report_count: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const commentsWithReasons = comments.map((comment) => {
      const reasonCounts = {};
      (comment.spam_reports || []).forEach((report) => {
        const key = report.reason || 'other';
        reasonCounts[key] = (reasonCounts[key] || 0) + 1;
      });

      return {
        ...comment.toObject(),
        reportReasons: Object.entries(reasonCounts).map(([reason, count]) => ({
          reason,
          count,
        })),
      };
    });

    const stats = {
      totalFlagged: await Comment.countDocuments({
        $or: [
          { status: 'pending_review' },
          { status: 'hidden' },
          { spam_report_count: { $gt: 0 } },
        ],
      }),
      pendingReview: await Comment.countDocuments({ status: 'pending_review' }),
      hidden: await Comment.countDocuments({ status: 'hidden' }),
    };

    res.render('admin/comments', {
      title: 'Manage Comments',
      comments: commentsWithReasons,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
      filterStatus,
      user: req.user,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('Error fetching flagged comments:', error);
    res.status(500).render('admin/error', {
      title: 'Error',
      error: 'Failed to fetch flagged comments',
      user: req.user,
    });
  }
};

/**
 * Moderate a comment (approve/hide/delete)
 * PATCH /admin/comments/:id/moderate
 */
exports.moderateComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const { action, reason } = req.body;

    const validActions = ['approve', 'hide', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Allowed: approve, hide, delete',
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    let impactedCount = 1;

    if (action === 'approve') {
      comment.status = 'active';
      comment.is_auto_flagged = false;
      comment.spam_report_count = 0;
      comment.spam_reports = [];
      comment.moderated_by = req.user.id;
      comment.moderated_at = new Date();
      comment.moderation_reason = reason || `Moderated by admin: ${action}`;
      await comment.save();
    } else {
      const descendantIds = await getDescendantCommentIds(comment._id);
      const targetIds = [comment._id, ...descendantIds];
      impactedCount = targetIds.length;

      const updatePayload = {
        status: action === 'hide' ? 'hidden' : 'deleted',
        moderated_by: req.user.id,
        moderated_at: new Date(),
        moderation_reason: reason || `Moderated by admin: ${action}`,
      };

      if (action === 'delete') {
        updatePayload.content = '[Comment removed by admin]';
      }

      await Comment.updateMany(
        { _id: { $in: targetIds } },
        { $set: updatePayload }
      );
    }

    const actionMessageMap = {
      approve: 'Comment approved successfully',
      hide: 'Comment hidden successfully',
      delete: 'Comment deleted successfully',
    };

    return res.json({
      success: true,
      message: `${actionMessageMap[action]} (${impactedCount} comment(s) affected)`,
      data: {
        id: comment._id,
        status: action === 'approve' ? comment.status : (action === 'hide' ? 'hidden' : 'deleted'),
        impactedCount,
      },
    });
  } catch (error) {
    console.error('Error moderating comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to moderate comment',
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
    
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
    const total = await User.countDocuments({});

    // Fetch users with pagination
    const users = await User.find({})
      .select('name email isActive isAdmin createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render('admin/users', {
      title: 'Manage Users',
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
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
    
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
    const total = await Blog.countDocuments({});

    // Fetch blogs with pagination
    const blogs = await Blog.find({})
      .populate('user_id', 'name email')
      .select('title slug status impression createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render('admin/blogs', {
      title: 'Manage Blogs',
      blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
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
