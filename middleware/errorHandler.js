const { sendError } = require('../helpers/responseHelper');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong!';
  const errorDetails = process.env.NODE_ENV === 'development' ? err.stack : null;

  return sendError(res, message, statusCode, errorDetails);
};

module.exports = errorHandler;
