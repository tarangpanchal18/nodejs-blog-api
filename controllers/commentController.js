const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const buildCommentTree = require('../helpers/buildCommentTree');
const sendCommentNotificationEmail = require('../helpers/sendCommentNotificationEmail');
const sendReplyNotificationEmail = require('../helpers/sendReplyNotificationEmail');

// Configuration for spam management
const SPAM_CONFIG = {
  AUTO_FLAG_THRESHOLD: 3,        // Auto-flag after 3 reports
  AUTO_HIDE_THRESHOLD: 10,       // Auto-hide after 10 reports
  MAX_REPORTS_PER_USER_PER_DAY: 5 // User can report max 5 comments per day
};

/**
 * Get all comments for a blog (nested tree)
 * GET /api/blogs/:slug/comments
 * Public access - but only shows 'active' comments to non-admins
 */
exports.getComments = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Find blog by slug
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }
    
    // Build query - filter by status based on user role
    const query = { blog_id: blog._id };
    
    // Check if user is admin
    const isAdmin = req.user && req.user.isAdmin;
    
    // Only admins can see all comments, regular users only see active
    if (!isAdmin) {
      query.status = 'active';
    }
    
    // Fetch all comments for the blog
    const allComments = await Comment.find(query)
      .populate('user_id', 'name username avatar')
      .sort({ createdAt: -1 })
      .lean();
    
    // Build nested tree structure
    const commentTree = buildCommentTree(allComments);
    
    // Count total top-level comments
    const totalTopLevel = commentTree.length;
    
    // Paginate only top-level comments (replies come with their parents)
    const startIndex = (page - 1) * limit;
    const paginatedTree = commentTree.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
      success: true,
      message: 'Comments fetched successfully',
      data: paginatedTree,
      pagination: {
        total: totalTopLevel,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalTopLevel / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new top-level comment
 * POST /api/blogs/:slug/comments
 * Protected - requires authentication
 */
exports.createComment = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    
    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }
    
    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 500 characters'
      });
    }
    
    // Find blog - must be published
    const blog = await Blog.findOne({ slug, status: 'published' }).populate('user_id', 'name email');
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found or not published'
      });
    }
    
    // Create top-level comment
    const comment = await Comment.create({
      blog_id: blog._id,
      user_id: userId,
      content: content.trim(),
      depth: 0,
      parent_id: null,
      status: 'active'
    });
    
    // Populate user data
    await comment.populate('user_id', 'name username avatar');

    // Email notification rules:
    // 1) Send only for top-level comments (no parent).
    // 2) Do not send if top-level comment count for this blog is greater than 10.
    const isTopLevelComment = !comment.parent_id;
    if (isTopLevelComment) {
      const topLevelCommentCount = await Comment.countDocuments({
        blog_id: blog._id,
        parent_id: null
      });

      const shouldSendNotification = topLevelCommentCount <= 10;
      const isSelfComment = blog.user_id && blog.user_id._id.toString() === userId.toString();
      const hasOwnerEmail = blog.user_id && blog.user_id.email;

      if (shouldSendNotification && !isSelfComment && hasOwnerEmail) {
        sendCommentNotificationEmail({
          ownerEmail: blog.user_id.email,
          ownerName: blog.user_id.name || 'there',
          blogTitle: blog.title,
          blogSlug: blog.slug,
          commentAuthor: comment.user_id.name || comment.user_id.username || 'Someone',
          commentContent: comment.content
        }).catch((error) => {
          console.error('Failed to send comment notification email:', error);
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: {
        id: comment._id.toString(),
        author: {
          id: comment.user_id._id.toString(),
          name: comment.user_id.name,
          username: comment.user_id.username,
          avatar: comment.user_id.avatar || null
        },
        content: comment.content,
        depth: comment.depth,
        status: comment.status,
        spam_report_count: 0,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        canReply: true,
        replies: []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reply to an existing comment
 * POST /api/comments/:commentId/reply
 * Protected - requires authentication
 */
exports.replyToComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    
    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }
    
    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Reply cannot exceed 500 characters'
      });
    }
    
    // Find parent comment
    const parentComment = await Comment.findById(commentId)
      .populate('user_id', 'name email')
      .populate('blog_id', 'title slug');
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }
    
    // Check if parent comment is active
    if (parentComment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to this comment'
      });
    }
    
    // Check depth limit - max depth is 4 (0, 1, 2, 3, 4 = 5 levels)
    if (parentComment.depth >= 4) {
      return res.status(400).json({
        success: false,
        message: 'Maximum reply depth reached. Cannot reply to this comment.'
      });
    }
    
    // Calculate reply depth
    const replyDepth = parentComment.depth + 1;
    
    // Create reply
    const reply = await Comment.create({
      blog_id: parentComment.blog_id,
      user_id: userId,
      parent_id: parentComment._id,
      content: content.trim(),
      depth: replyDepth,
      status: 'active'
    });
    
    // Populate user data
    await reply.populate('user_id', 'name username avatar');

    // Notify parent comment owner about the new reply.
    const parentCommentOwnerId = parentComment.user_id && parentComment.user_id._id
      ? parentComment.user_id._id.toString()
      : parentComment.user_id.toString();
    const isReplyToOwnComment = parentCommentOwnerId === userId.toString();
    const hasRecipientEmail = parentComment.user_id && parentComment.user_id.email;
    const hasBlogContext = parentComment.blog_id && parentComment.blog_id.slug;

    if (!isReplyToOwnComment && hasRecipientEmail && hasBlogContext) {
      sendReplyNotificationEmail({
        recipientEmail: parentComment.user_id.email,
        recipientName: parentComment.user_id.name || 'there',
        blogTitle: parentComment.blog_id.title,
        blogSlug: parentComment.blog_id.slug,
        replyAuthor: reply.user_id.name || reply.user_id.username || 'Someone',
        replyContent: reply.content
      }).catch((error) => {
        console.error('Failed to send reply notification email:', error);
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Reply posted successfully',
      data: {
        id: reply._id.toString(),
        author: {
          id: reply.user_id._id.toString(),
          name: reply.user_id.name,
          username: reply.user_id.username,
          avatar: reply.user_id.avatar || null
        },
        content: reply.content,
        depth: reply.depth,
        status: reply.status,
        spam_report_count: 0,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        canReply: reply.depth < 4,
        replies: []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete own comment (soft delete)
 * DELETE /api/comments/:commentId
 * Protected - user can only delete their own comments
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    
    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Check ownership
    if (comment.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments'
      });
    }
    
    // Soft delete - change status to 'deleted'
    comment.status = 'deleted';
    comment.content = '[Comment deleted by user]';
    await comment.save();
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report a comment as spam
 * POST /api/comments/:commentId/report
 * Protected - requires authentication
 */
exports.reportComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { reason = 'spam' } = req.body;
    const userId = req.user._id;
    
    // Validate reason
    const validReasons = ['spam', 'offensive', 'harassment', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report reason'
      });
    }
    
    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Can't report your own comment
    if (comment.user_id.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own comment'
      });
    }
    
    // Check if user already reported this comment
    if (comment.hasUserReported(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this comment'
      });
    }
    
    // Check daily report limit for this user (optional - can implement later)
    // For now, we'll skip this to keep it simple
    
    // Add report to the array
    comment.spam_reports.push({
      reported_by: userId,
      reported_at: new Date(),
      reason: reason
    });
    
    // Increment count
    comment.spam_report_count += 1;
    
    // Auto-moderation logic
    if (comment.spam_report_count >= SPAM_CONFIG.AUTO_HIDE_THRESHOLD) {
      // Auto-hide if threshold reached
      comment.status = 'hidden';
      comment.is_auto_flagged = true;
      comment.moderation_reason = `Automatically hidden after ${comment.spam_report_count} spam reports`;
    } else if (comment.spam_report_count >= SPAM_CONFIG.AUTO_FLAG_THRESHOLD) {
      // Auto-flag for review if threshold reached
      if (comment.status === 'active') {
        comment.status = 'pending_review';
        comment.is_auto_flagged = true;
      }
    }
    
    await comment.save();
    
    // Return appropriate message based on action taken
    let message = 'Comment reported successfully';
    if (comment.status === 'hidden') {
      message = 'Comment has been automatically hidden due to multiple reports';
    } else if (comment.status === 'pending_review') {
      message = 'Comment has been flagged for moderator review';
    }
    
    res.json({
      success: true,
      message: message,
      data: {
        status: comment.status,
        spam_report_count: comment.spam_report_count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get flagged comments for admin review
 * GET /api/admin/comments/flagged
 * Admin only
 */
exports.getFlaggedComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    // Build query - get comments that need review
    const query = {
      $or: [
        { status: 'pending_review' },
        { spam_report_count: { $gt: 0 } }
      ]
    };
    
    // Filter by specific status if provided
    if (status && ['pending_review', 'hidden', 'active'].includes(status)) {
      query.status = status;
    }
    
    // Count total
    const total = await Comment.countDocuments(query);
    
    // Fetch flagged comments
    const comments = await Comment.find(query)
      .populate('user_id', 'name username avatar email')
      .populate('blog_id', 'title slug')
      .populate('moderated_by', 'name username')
      .sort({ spam_report_count: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit)
      .lean();
    
    // Transform to include blog info
    const flaggedComments = comments.map(comment => ({
      id: comment._id.toString(),
      content: comment.content,
      author: {
        id: comment.user_id._id.toString(),
        name: comment.user_id.name,
        username: comment.user_id.username,
        avatar: comment.user_id.avatar,
        email: comment.user_id.email
      },
      blog: {
        id: comment.blog_id._id.toString(),
        title: comment.blog_id.title,
        slug: comment.blog_id.slug
      },
      status: comment.status,
      depth: comment.depth,
      spam_report_count: comment.spam_report_count,
      is_auto_flagged: comment.is_auto_flagged,
      spam_reports: comment.spam_reports.length,
      createdAt: comment.createdAt,
      moderated_by: comment.moderated_by ? {
        id: comment.moderated_by._id.toString(),
        name: comment.moderated_by.name,
        username: comment.moderated_by.username
      } : null,
      moderated_at: comment.moderated_at,
      moderation_reason: comment.moderation_reason
    }));
    
    res.json({
      success: true,
      message: 'Flagged comments fetched successfully',
      data: flaggedComments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Moderate a comment (admin action)
 * PATCH /api/admin/comments/:commentId/moderate
 * Admin only
 */
exports.moderateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user._id;
    
    // Validate action
    const validActions = ['approve', 'hide', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid moderation action. Must be: approve, hide, or delete'
      });
    }
    
    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Apply moderation action
    let newStatus;
    let message;
    
    switch (action) {
      case 'approve':
        newStatus = 'active';
        message = 'Comment approved and set to active';
        break;
      case 'hide':
        newStatus = 'hidden';
        message = 'Comment hidden from public view';
        break;
      case 'delete':
        newStatus = 'deleted';
        comment.content = '[Comment removed by moderator]';
        message = 'Comment deleted';
        break;
    }
    
    // Update comment
    comment.status = newStatus;
    comment.moderated_by = adminId;
    comment.moderated_at = new Date();
    comment.moderation_reason = reason || `Moderated by admin: ${action}`;
    
    await comment.save();
    
    res.json({
      success: true,
      message: message,
      data: {
        id: comment._id,
        status: comment.status,
        moderated_at: comment.moderated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed spam reports for a specific comment
 * GET /api/admin/comments/:commentId/reports
 * Admin only
 */
exports.getCommentReports = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    
    // Find comment with populated reports
    const comment = await Comment.findById(commentId)
      .populate('user_id', 'name username avatar email')
      .populate('spam_reports.reported_by', 'name username email')
      .populate('blog_id', 'title slug')
      .lean();
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Format the response
    const reports = comment.spam_reports.map(report => ({
      reporter: {
        id: report.reported_by._id.toString(),
        name: report.reported_by.name,
        username: report.reported_by.username,
        email: report.reported_by.email
      },
      reason: report.reason,
      reported_at: report.reported_at
    }));
    
    res.json({
      success: true,
      message: 'Comment reports fetched successfully',
      data: {
        comment: {
          id: comment._id.toString(),
          content: comment.content,
          author: {
            id: comment.user_id._id.toString(),
            name: comment.user_id.name,
            username: comment.user_id.username,
            email: comment.user_id.email
          },
          blog: {
            title: comment.blog_id.title,
            slug: comment.blog_id.slug
          },
          status: comment.status,
          spam_report_count: comment.spam_report_count,
          createdAt: comment.createdAt
        },
        reports: reports,
        total_reports: reports.length
      }
    });
  } catch (error) {
    next(error);
  }
};
