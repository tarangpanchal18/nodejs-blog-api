/**
 * Blog Validation Helper
 * Reusable validation functions for blog operations
 */

/**
 * Validate blog title
 */
const validateTitle = (title, isRequired = true) => {
    const errors = [];
    
    if (isRequired && (!title || title.trim() === '')) {
      errors.push('Title is required');
    } else if (title) {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 10) {
        errors.push('Title must be at least 10 characters');
      } else if (trimmedTitle.length > 200) {
        errors.push('Title cannot exceed 200 characters');
      }
    }
    
    return { isValid: errors.length === 0, errors, value: title ? title.trim() : null };
  };
  
  /**
   * Validate blog content
   */
  const validateContent = (content, isRequired = true) => {
    const errors = [];
    
    if (isRequired && (!content || content.trim() === '')) {
      errors.push('Content is required');
    }
    
    return { isValid: errors.length === 0, errors, value: content ? content.trim() : null };
  };
  
  /**
   * Validate description
   */
  const validateDescription = (description, isRequired = false) => {
    const errors = [];
    
    if (isRequired && (!description || description.trim() === '')) {
      errors.push('Description is required');
    } else if (description) {
      const trimmedDesc = description.trim();
      if (trimmedDesc.length < 10) {
        errors.push('Description must be at least 10 characters');
      } else if (trimmedDesc.length > 5000) {
        errors.push('Description cannot exceed 5000 characters');
      }
    }
    
    return { isValid: errors.length === 0, errors, value: description ? description.trim() : null };
  };
  
  /**
   * Process and validate tags
   */
  const processTags = (tags) => {
    const errors = [];
    let tagArray = [];
    
    if (tags === undefined || tags === null) {
      return { isValid: true, errors: [], value: [] };
    }
    
    if (Array.isArray(tags)) {
      tagArray = tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : String(tag).trim()))
        .filter((tag) => tag.length > 0);
    } else if (typeof tags === 'string') {
      tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    } else {
      errors.push('Tags must be an array or comma-separated string');
      return { isValid: false, errors, value: [] };
    }
    
    // Remove duplicate tags and normalize to lowercase
    const uniqueTags = [];
    const seenTags = new Set();
    
    for (const tag of tagArray) {
      const normalizedTag = tag.toLowerCase();
      if (!seenTags.has(normalizedTag)) {
        seenTags.add(normalizedTag);
        uniqueTags.push(normalizedTag); // Store as lowercase for consistency
      }
    }
    
    if (uniqueTags.length > 5) {
      errors.push('Cannot have more than 5 tags');
    }
    
    return { isValid: errors.length === 0, errors, value: uniqueTags };
  };
  
  /**
   * Validate status
   */
  const validateStatus = (status) => {
    const errors = [];
    
    if (status !== undefined && !['draft', 'published'].includes(status.toLowerCase())) {
      errors.push('Status must be either "draft" or "published"');
    }
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      value: status ? status.toLowerCase() : 'published' 
    };
  };
  
  /**
   * Generate slug from title
   */
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };
  
  /**
   * Validate blog data (for create/update)
   */
  const validateBlogData = (data, options = {}) => {
    const { requireTitle = true, requireContent = true, requireDescription = false } = options;
    const errors = [];
    const validatedData = {};
    
    // Validate title
    const titleResult = validateTitle(data.title, requireTitle);
    if (!titleResult.isValid) errors.push(...titleResult.errors);
    if (titleResult.value) validatedData.title = titleResult.value;
    
    // Validate content
    const contentResult = validateContent(data.content, requireContent);
    if (!contentResult.isValid) errors.push(...contentResult.errors);
    if (contentResult.value) validatedData.content = contentResult.value;
    
    // Validate description
    if (data.description !== undefined || requireDescription) {
      const descResult = validateDescription(data.description, requireDescription);
      if (!descResult.isValid) errors.push(...descResult.errors);
      if (descResult.value !== null) validatedData.description = descResult.value;
    }
    
    // Process tags
    if (data.tags !== undefined) {
      const tagsResult = processTags(data.tags);
      if (!tagsResult.isValid) errors.push(...tagsResult.errors);
      if (tagsResult.value.length > 0) validatedData.tags = tagsResult.value;
    }
    
    // Validate status
    if (data.status !== undefined) {
      const statusResult = validateStatus(data.status);
      if (!statusResult.isValid) errors.push(...statusResult.errors);
      validatedData.status = statusResult.value;
    }
    
    // Handle cover_image
    if (data.cover_image !== undefined && data.cover_image) {
      validatedData.cover_image = data.cover_image.trim();
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: validatedData,
    };
  };
  
  module.exports = {
    validateTitle,
    validateContent,
    validateDescription,
    processTags,
    validateStatus,
    generateSlug,
    validateBlogData,
  };