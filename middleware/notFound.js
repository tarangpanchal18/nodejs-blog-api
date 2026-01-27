const { sendNotFound } = require('../helpers/responseHelper');

/**
 * 404 Not Found handler middleware
 */
const notFound = (req, res) => {
  return sendNotFound(res, `Route not found: ${req.originalUrl}`);
};

module.exports = notFound;
