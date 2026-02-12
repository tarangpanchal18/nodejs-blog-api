const { sendError } = require('../helpers/responseHelper');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong!';

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum allowed size is 2MB';
    }
  }

  const errorDetails = process.env.NODE_ENV === 'development' ? err.stack : null;

  return sendError(res, message, statusCode, errorDetails);
};

module.exports = errorHandler;
