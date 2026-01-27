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
const { parse } = require('csv-parse/sync');
const blogEvents = require('../events/blogEvents');

/**
 * Get all blogs with pagination and filtering
 * @route GET /blog
 */
const getAllBlogs = async (req, res) => {
  try {
    const defaultLimit = Number(process.env.PAGINATION_LIMIT) || 10;

    // Sanitize pagination
    const { page, limit } = sanitizePagination(req.query.page, req.query.limit || defaultLimit);

    // Sanitize search input (escape regex special characters)
    const search = req.query.search ? escapeRegex(req.query.search.trim()) : null;
    
    // Sanitize status (only allow 'draft' or 'published')
    const status = sanitizeStatus(req.query.status) || 'published';
    
    // Sanitize tags
    const tagArray = req.query.tag ? sanitizeStringArray(req.query.tag) : null;

    const query = {};

    if (search) {
      query.title = {
        $regex: search,
        $options: 'i', // case-insensitive
      };
    }

    if (tagArray && tagArray.length > 0) {
      query.tags = { $in: tagArray };
    }

    query.status = status;

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .sort({ impression: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v -description -content -cover_image -user_id'),

      Blog.countDocuments(query),
    ]);

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
    // Sanitize slug to prevent injection
    const slug = sanitizeSlug(req.params.slug);
    if (!slug) {
      return sendNotFound(res, 'Blog not found');
    }

    const blog = await Blog.findOne({ slug })
      .populate('user_id', 'name email username avatar bio')
      .select('-__v');

    if (!blog) {
      return sendNotFound(res, 'Blog not found');
    }

    // increment views
    blog.impression += 1;
    await blog.save();

    // 🔥 emit event on every x views
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

    // Update the blog
    Object.assign(blog, validation.data);
    await blog.save();

    // Populate user data
    await blog.populate('user_id', 'name email username avatar bio');

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

    // Create blog
    const blog = await Blog.create(blogData);

    // Populate user data
    await blog.populate('user_id', 'name email username avatar bio');

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

    // Sanitize pagination
    const { page, limit } = sanitizePagination(req.query.page, req.query.limit || defaultLimit);

    // Sanitize search input (escape regex special characters)
    const search = req.query.search ? escapeRegex(req.query.search.trim()) : null;
    
    // Sanitize status (only allow 'draft' or 'published')
    const status = req.query.status ? sanitizeStatus(req.query.status) : null;
    
    // Sanitize tags
    const tagArray = req.query.tag ? sanitizeStringArray(req.query.tag) : null;

    // Build query - filter by logged-in user's ID
    const query = {
      user_id: req.userId, // Only blogs created by the authenticated user
    };

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

    // Fetch blogs
    const blogs = await Blog.find(query)
      .sort({ impression: -1, updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v -description -content -cover_image -user_id -tags -status');

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

module.exports = {
  getAllBlogs,
  getBlogBySlug,
  createBlog,
  getMyBlogs,
  importBlogsFromCSV,
  updateBlog,
};
