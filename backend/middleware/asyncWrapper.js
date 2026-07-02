const { AppError } = require('./errorHandler');

/**
 * Async Wrapper for handling async errors
 * Wraps async route handlers and passes errors to the error handler middleware
 */
module.exports = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // If it's not an AppError, convert it to one
      if (!err.isOperational) {
        const appError = new AppError(
          err.message || 'Something went wrong',
          err.statusCode || 500,
          false
        );
        next(appError);
      } else {
        next(err);
      }
    });
  };
};