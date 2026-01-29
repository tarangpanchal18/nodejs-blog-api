const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [10, 'Title must be at least 10 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    cover_image: {
      type: String,
      trim: true,
    },
    impression: {
      type: Number,
      default: 0,
      min: 0,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags) {
          return tags.length <= 5;
        },
        message: 'Cannot have more than 5 tags',
      },
      set: function (tags) {
        // Normalize tags to lowercase when setting
        if (Array.isArray(tags)) {
          return tags.map((tag) => String(tag).toLowerCase().trim()).filter((tag) => tag.length > 0);
        }
        return tags;
      },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'pending_approval', 'rejected'],
      default: 'draft',
    },
    
    rejectionReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt
  }
);

// Index for faster queries
blogSchema.index({ slug: 1 });
blogSchema.index({ user_id: 1 });
blogSchema.index({ tags: 1 });

// Method to generate slug from title
blogSchema.methods.generateSlug = function () {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Pre-save middleware to auto-generate slug if not provided
blogSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.generateSlug();
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
