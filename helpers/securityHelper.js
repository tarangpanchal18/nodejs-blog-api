/**
 * Security Helper
 * Functions to prevent injection attacks and sanitize user inputs
 */

/**
 * Escape special regex characters to prevent regex injection
 */
const escapeRegex = (string) => {
  if (!string) return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate and sanitize status value
 */
const sanitizeStatus = (status) => {
  const allowedStatuses = ['draft', 'published'];
  if (!status || typeof status !== 'string') return null;
  const normalizedStatus = status.toLowerCase().trim();
  return allowedStatuses.includes(normalizedStatus) ? normalizedStatus : null;
};

/**
 * Sanitize slug (only allow alphanumeric, hyphens, underscores)
 */
const sanitizeSlug = (slug) => {
  if (!slug || typeof slug !== 'string') return '';
  return slug.replace(/[^a-z0-9-_]/gi, '');
};

/**
 * Sanitize array of strings (for tags)
 */
const sanitizeStringArray = (input) => {
  if (!input) return [];
  if (typeof input === 'string') {
    input = input.split(',');
  }
  if (!Array.isArray(input)) return [];
  
  return input
    .map((item) => {
      if (typeof item === 'string') {
        return sanitizeString(item.trim());
      }
      return sanitizeString(String(item).trim());
    })
    .filter((item) => item.length > 0)
    .slice(0, 10); // Limit to 10 items
};

/**
 * Sanitize pagination parameters
 */
const sanitizePagination = (page, limit, maxLimit = 100) => {
  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.max(Math.min(parseInt(limit) || 10, maxLimit), 1);
  return { page: pageNum, limit: limitNum };
};

/**
 * Sanitize MongoDB ObjectId
 */
const sanitizeObjectId = (id) => {
  if (!id) return null;
  const idString = String(id).trim();
  // MongoDB ObjectId is 24 hex characters
  if (/^[0-9a-fA-F]{24}$/.test(idString)) {
    return idString;
  }
  return null;
};

module.exports = {
  escapeRegex,
  sanitizeString,
  sanitizeStatus,
  sanitizeSlug,
  sanitizeStringArray,
  sanitizePagination,
  sanitizeObjectId,
};
