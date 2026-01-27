/**
 * Standardized API Response Helper Functions
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send success response with pagination
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} pagination - Pagination information
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const sendSuccessWithPagination = (
  res,
  data,
  pagination,
  message = 'Success',
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {*} error - Error details (optional, only in development)
 */
const sendError = (res, message = 'Something went wrong!', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
  };

  // Only include error details in development mode
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {String} message - Not found message
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message,
  });
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {String} message - Validation error message
 * @param {*} errors - Validation errors details
 */
const sendValidationError = (res, message = 'Validation failed', errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(400).json(response);
};

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {String} message - Unauthorized message
 */
const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return res.status(401).json({
    success: false,
    message,
  });
};

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {String} message - Forbidden message
 */
const sendForbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    message,
  });
};

module.exports = {
  sendSuccess,
  sendSuccessWithPagination,
  sendError,
  sendNotFound,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
};
