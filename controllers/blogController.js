// Import User first to ensure it's registered before Blog uses it for populate
const User = require('../models/User');
const Blog = require('../models/Blog');
const {
  sendSuccess,
  sendSuccessWithPagination,
  sendError,
  sendNotFound,
  sendValidationError,
  sendUnauthorized,
} = require('../helpers/responseHelper');
const {
  validateBlogData,
  generateSlug,
} = require('../helpers/blogValidator');
const {
  escapeRegex,
  sanitizeStatus,
  sanitizeStringArray,
  sanitizePagination,
  sanitizeSlug,
} = require('../helpers/securityHelper');
const { parse } = require('csv-parse/sync');
const blogEvents = require('../events/blogEvents');

/**
 * Get all blogs with pagination and filtering
 * @route GET /blog
 */
const getAllBlogs = async (req, res) => {
  try {
    const defaultLimit = Number(process.env.PAGINATION_LIMIT) || 10;

    const { page, limit } = sanitizePagination(req.query.page, req.query.limit || defaultLimit);
    const search = req.query.search ? escapeRegex(req.query.search.trim()) : null;
    // const status = sanitizeStatus(req.query.status) || 'published';
    const status = 'published';
    const tagArray = req.query.tag ? sanitizeStringArray(req.query.tag) : null;
    const query = { status };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (tagArray?.length) {
      query.tags = { $in: tagArray };
    }

    // Fetch popular blogs
    const popularBlogs = await Blog.find(query)
      .populate('user_id', 'name avatar')
        .sort({ impression: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
      .select('-__v -content');

    // Fetch new blogs (last 72h)
    const now = new Date();
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const newBlogs = await Blog.find({
      status,
      createdAt: { $gte: seventyTwoHoursAgo },
      _id: { $nin: popularBlogs.map(b => b._id) },
    })
      .populate('user_id', 'name avatar')
      .sort({ createdAt: -1 })
      .select('-__v -content');

    // Split into buckets
    const todayBlogs = [];
    const recentBlogs = [];

    newBlogs.forEach(blog => {
      if (blog.createdAt >= twentyFourHoursAgo) {
        todayBlogs.push(blog);
      } else {
        recentBlogs.push(blog);
      }
    });

    // Pick boosted blogs
    const boosted = [];

    // Slot 2 → today blog first, fallback to recent
    if (todayBlogs.length) {
      boosted.push(todayBlogs.shift());
    } else if (recentBlogs.length) {
      boosted.push(recentBlogs.shift());
    }

    // Remaining pool for slot 3 & 4
    const remainingNewBlogs = [...todayBlogs, ...recentBlogs];

    // Shuffle remaining (controlled randomness)
    for (let i = remainingNewBlogs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingNewBlogs[i], remainingNewBlogs[j]] = [
        remainingNewBlogs[j],
        remainingNewBlogs[i],
      ];
    }

    if (remainingNewBlogs[0]) boosted.push(remainingNewBlogs[0]);
    if (remainingNewBlogs[1]) boosted.push(remainingNewBlogs[1]);

    // Inject into list
    const finalBlogs = [];
    let boostIndex = 0;

    popularBlogs.forEach((blog, index) => {
      // Inject at 2nd, 3rd, 4th positions
      if (index >= 1 && index <= 3 && boosted[boostIndex]) {
        finalBlogs.push({
          ...boosted[boostIndex].toObject(),
          isBoosted: true,
          boostType: 'new',
        });
        boostIndex++;
      }

      finalBlogs.push(blog);
    });

    // Pagination info
    const total = await Blog.countDocuments(query);

    const paginationInfo = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };

    return sendSuccessWithPagination(
      res,
      finalBlogs,
      paginationInfo,
      'Blogs fetched successfully'
    );
  } catch (error) {
    return sendError(res, 'Error fetching blogs', 500, error.message);
  }
};

/**
 * Get a single blog by slug
 * @route GET /blog/:slug
 */

const getBlogBySlug = async (req, res) => {
  try {
    const slug = sanitizeSlug(req.params.slug);
    if (!slug) {
      return sendNotFound(res, 'Blog not found');
    }

    // Fetch blog WITHOUT status filter
    const blog = await Blog.findOne({ slug })
      .populate('user_id', 'name email username avatar bio')
      .select('-__v');

    if (!blog) {
      return sendNotFound(res, 'Blog not found');
    }

    const isOwner =
      req.userId &&
      blog.user_id &&
      blog.user_id._id.toString() === req.userId;

    if (!isOwner && blog.status !== 'published') {
      return sendNotFound(res, 'Blog not found');
    }

    blog.impression += 1;
    await blog.save();

    const viewsThreshold = parseInt(process.env.BLOG_VIEWS_EMAIL_THRESHOLD, 10);
    if (blog.impression % viewsThreshold === 0) {
      blogEvents.emit('viewsThreshold', { blog, user: blog.user_id });
    }

    return sendSuccess(res, blog, 'Blog fetched successfully');
  } catch (error) {
    return sendError(res, 'Error fetching blog', 500, error.message);
  }
};

/**
 * Import blogs from CSV file
 * @route POST /blog/import
 */
const importBlogsFromCSV = async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return sendValidationError(res, 'CSV file is required');
    }

    // Enforce file size limit (5MB = 5 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (req.file.size > MAX_FILE_SIZE) {
      return sendValidationError(res, 'CSV file size must not exceed 5 MB');
    }

    // Parse CSV file
    let records;
    try {
      records = parse(req.file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle BOM (Byte Order Mark) if present
      });
    } catch (parseError) {
      return sendValidationError(res, 'Invalid CSV format', parseError.message);
    }

    // Check if CSV has data
    if (!records || records.length === 0) {
      return sendValidationError(res, 'CSV file is empty or has no valid data');
    }

    // Use authenticated user from request (set by auth middleware)
    const authenticatedUser = await User.findById(req.userId);
    if (!authenticatedUser) {
      return sendError(res, 'User not found.', 400);
    }

    const errors = [];
    const validBlogs = [];

    // Validate and process each record
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // +2 because CSV has header row and 0-indexed

      // Validate blog data using helper
      const validation = validateBlogData(row, {
        requireTitle: true,
        requireContent: true,
        requireDescription: true, // Description is required for CSV import
      });

      // Collect validation errors with row number
      if (!validation.isValid) {
        validation.errors.forEach((error) => {
          errors.push(`Row ${rowNumber}: ${error}`);
        });
        continue;
      }

      // Prepare blog data
      const blogData = {
        ...validation.data,
        user_id: authenticatedUser._id,
      };

      // Generate slug if not provided in CSV
      if (!row.slug && blogData.title) {
        blogData.slug = generateSlug(blogData.title);
      } else if (row.slug) {
        blogData.slug = row.slug.trim().toLowerCase();
      }

      // Handle impression (not in validation helper)
      if (row.impression) {
        const impression = parseInt(row.impression);
        if (!isNaN(impression) && impression >= 0) {
          blogData.impression = impression;
        }
      }

      validBlogs.push(blogData);
    }

    // If there are validation errors, return them
    if (errors.length > 0 && validBlogs.length === 0) {
      return sendValidationError(res, 'All rows have validation errors', errors);
    }

    // Insert valid blogs
    let insertedCount = 0;
    let skippedCount = 0;
    const insertErrors = [];

    for (const blogData of validBlogs) {
      try {
        // Generate slug from title
        blogData.slug = blogData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Create blog
        await Blog.create(blogData);
        insertedCount++;
      } catch (insertError) {
        skippedCount++;
        if (insertError.code === 11000) {
          // Duplicate slug error
          insertErrors.push(`Blog with slug "${blogData.slug || blogData.title}" already exists`);
        } else {
          insertErrors.push(`Error inserting blog "${blogData.title}": ${insertError.message}`);
        }
      }
    }

    // Prepare response
    const result = {
      totalRows: records.length,
      inserted: insertedCount,
      skipped: skippedCount,
      validationErrors: errors.length,
    };

    if (errors.length > 0) {
      result.validationErrorsDetails = errors;
    }

    if (insertErrors.length > 0) {
      result.insertErrors = insertErrors;
    }

    // Return appropriate response based on results
    if (insertedCount === 0) {
      return sendError(res, 'No blogs were imported', 400, result);
    }

    if (errors.length > 0 || insertErrors.length > 0) {
      return sendSuccess(res, result, `Imported ${insertedCount} blog(s) with some errors`, 207); // 207 Multi-Status
    }

    return sendSuccess(res, result, `Successfully imported ${insertedCount} blog(s)`);
  } catch (error) {
    return sendError(res, 'Error importing blogs from CSV', 500, error.message);
  }
};

/**
 * Update a blog by slug
 * @route PUT /blog/:slug
 */
const updateBlog = async (req, res) => {
  try {
    // Sanitize slug to prevent injection
    const slug = sanitizeSlug(req.params.slug);
    if (!slug) {
      return sendNotFound(res, 'Blog not found');
    }

    // Find the blog
    const blog = await Blog.findOne({ slug });
    if (!blog) {
      return sendNotFound(res, 'Blog not found');
    }

    // Check if user owns the blog
    if (blog.user_id.toString() !== req.userId.toString()) {
      return sendUnauthorized(res, 'You can only edit your own blogs');
    }

    // Validate blog data (title and content are optional for updates)
    const validation = validateBlogData(req.body, {
      requireTitle: false,
      requireContent: false,
    });

    if (!validation.isValid) {
      return sendValidationError(res, 'Validation failed', validation.errors);
    }

    // Check if no fields to update
    if (Object.keys(validation.data).length === 0) {
      return sendValidationError(res, 'No valid fields provided for update');
    }

    // Generate new slug if title is being updated
    if (validation.data.title) {
      const newSlug = generateSlug(validation.data.title);
      
      // Check if slug will be duplicate (only if it's different from current)
      if (newSlug !== slug) {
        const existingBlog = await Blog.findOne({ slug: newSlug });
        if (existingBlog) {
          return sendValidationError(res, `Blog with slug "${newSlug}" already exists`);
        }
      }
      validation.data.slug = newSlug;
    }

    // Moderation flow: if status is 'published', save as 'pending_approval'
    // Draft blogs are saved as-is
    const wasPendingApproval = blog.status === 'pending_approval';
    if (validation.data.status === 'published') {
      validation.data.status = 'pending_approval';
    }

    // Update the blog
    Object.assign(blog, validation.data);
    await blog.save();

    // Populate user data
    await blog.populate('user_id', 'name email username avatar bio');

    // Trigger moderation event if blog is now pending approval (non-blocking)
    // Only trigger if status changed to pending_approval (not if it was already pending)
    if (blog.status === 'pending_approval' && !wasPendingApproval) {
      blogEvents.emit('blogModeration', { blog });
    }

    return sendSuccess(res, blog, 'Blog updated successfully');
  } catch (error) {
    // Handle duplicate slug error
    if (error.code === 11000) {
      return sendValidationError(res, 'Blog with this slug already exists');
    }
    return sendError(res, 'Error updating blog', 500, error.message);
  }
};

/**
 * Create a new blog
 * @route POST /blog
 */
const createBlog = async (req, res) => {
  try {
    // Validate blog data
    const validation = validateBlogData(req.body, {
      requireTitle: true,
      requireContent: true,
      requireDescription: true, // Description is required for blog creation
    });

    if (!validation.isValid) {
      return sendValidationError(res, 'Validation failed', validation.errors);
    }

    // Generate slug from title
    const slug = generateSlug(validation.data.title);

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return sendValidationError(res, `Blog with slug "${slug}" already exists`);
    }

    // Prepare blog data
    const blogData = {
      ...validation.data,
      slug,
      user_id: req.userId, // Use authenticated user's ID
    };

    // Moderation flow: if status is 'published', save as 'pending_approval'
    // Draft blogs are saved as-is
    if (blogData.status === 'published') {
      blogData.status = 'pending_approval';
    }

    // Create blog
    const blog = await Blog.create(blogData);

    // Populate user data
    await blog.populate('user_id', 'name email username avatar bio');

    // Trigger moderation event if blog is pending approval (non-blocking)
    if (blog.status === 'pending_approval') {
      blogEvents.emit('blogModeration', { blog });
    }

    return sendSuccess(res, blog, 'Blog created successfully', 201);
  } catch (error) {
    // Handle duplicate slug error
    if (error.code === 11000) {
      return sendValidationError(res, 'Blog with this slug already exists');
    }
    return sendError(res, 'Error creating blog', 500, error.message);
  }
};

/**
 * Get all blogs created by the logged-in user
 * @route GET /blog/my-blogs
 */
const getMyBlogs = async (req, res) => {
  try {
    const defaultLimit = Number(process.env.PAGINATION_LIMIT) || 10;
    const { page, limit } = sanitizePagination(req.query.page, req.query.limit || defaultLimit);
    const search = req.query.search ? escapeRegex(req.query.search.trim()) : null;
    const status = req.query.status ? sanitizeStatus(req.query.status) : null;
    const tagArray = req.query.tag ? sanitizeStringArray(req.query.tag) : null;

    const query = {user_id: req.userId,};

    // Filter by title if provided
    if (search) {
      query.title = {
        $regex: search,
        $options: 'i', // case-insensitive
      };
    }
    
    // Filter by tag if provided
    if (tagArray && tagArray.length > 0) {
      query.tags = { $in: tagArray };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Fetch blogs, ordered by updatedAt descending (most recently updated first)
    const blogs = await Blog.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v -description -content -cover_image -user_id -tags');

    const total = await Blog.countDocuments(query);

    const paginationInfo = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };

    return sendSuccessWithPagination(
      res,
      blogs,
      paginationInfo,
      'Your blogs fetched successfully'
    );
  } catch (error) {
    return sendError(res, 'Error fetching your blogs', 500, error.message);
  }
};

/**
 * Search tags and return tags with count
 * @route GET /blog/tags/search
 */
const searchTags = async (req, res) => {
  try {
    const searchQuery = req.query.q || req.query.search || '';
    
    // Sanitize search query
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery || trimmedQuery.length === 0) {
      return sendValidationError(res, 'Search query is required');
    }

    // Escape regex special characters and convert to lowercase (tags are stored lowercase)
    const sanitizedQuery = escapeRegex(trimmedQuery.toLowerCase());

    // Use MongoDB aggregation pipeline for optimal performance
    const pipeline = [
      // Unwind tags array to get individual tags
      { $unwind: '$tags' },
      
      // Match tags that start with the search query
      // Since tags are stored lowercase, we can use exact match with regex
      {
        $match: {
          tags: {
            $regex: `^${sanitizedQuery}`,
            $options: 'i' // Case-insensitive for safety
          }
        }
      },
      
      // Group by tag and count occurrences
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      
      // Rename _id to tag and format output
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1
        }
      },
      
      // Sort by count descending (most popular first)
      { $sort: { count: -1 } },
      
      // Optional: Limit results (default to 50)
      { $limit: 50 }
    ];

    const tags = await Blog.aggregate(pipeline);

    return sendSuccess(res, tags, `Found ${tags.length} tag(s) matching "${trimmedQuery}"`);
  } catch (error) {
    return sendError(res, 'Error searching tags', 500, error.message);
  }
};

module.exports = {
  getAllBlogs,
  getBlogBySlug,
  createBlog,
  getMyBlogs,
  importBlogsFromCSV,
  updateBlog,
  searchTags,
};
