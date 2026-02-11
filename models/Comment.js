const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  blog_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    minlength: [1, 'Comment must be at least 1 character'],
    maxlength: [500, 'Comment cannot exceed 500 characters'],
    trim: true
  },
  depth: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  
  // Spam Management
  status: {
    type: String,
    enum: ['active', 'pending_review', 'hidden', 'deleted'],
    default: 'active',
    index: true
  },
  spam_reports: [{
    reported_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reported_at: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      enum: ['spam', 'offensive', 'harassment', 'other'],
      default: 'spam'
    }
  }],
  spam_report_count: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Moderation
  is_auto_flagged: {
    type: Boolean,
    default: false
  },
  moderated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  moderated_at: {
    type: Date,
    default: null
  },
  moderation_reason: {
    type: String,
    default: null,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Compound indexes for performance
commentSchema.index({ blog_id: 1, status: 1, createdAt: -1 }); // For fetching blog comments
commentSchema.index({ parent_id: 1, status: 1 }); // For fetching replies
commentSchema.index({ status: 1, spam_report_count: -1 }); // For admin panel

/**
 * Instance method to check if replies are allowed on this comment
 * @returns {Boolean}
 */
commentSchema.methods.canReply = function() {
  return this.depth < 4 && this.status === 'active';
};

/**
 * Instance method to check if a user has already reported this comment
 * @param {ObjectId} userId - User ID to check
 * @returns {Boolean}
 */
commentSchema.methods.hasUserReported = function(userId) {
  return this.spam_reports.some(report => 
    report.reported_by.toString() === userId.toString()
  );
};

/**
 * Static method to get comments for a blog with population
 * @param {ObjectId} blogId - Blog ID
 * @param {String} status - Filter by status (optional)
 * @returns {Promise<Array>}
 */
commentSchema.statics.getByBlogId = async function(blogId, status = null) {
  const query = { blog_id: blogId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('user_id', 'name username avatar')
    .sort({ createdAt: -1 })
    .lean();
};

module.exports = mongoose.model('Comment', commentSchema);
