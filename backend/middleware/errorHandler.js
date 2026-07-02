/**
 * Global Error Handler Middleware
 * Provides consistent error responses across all endpoints
 */

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle operational errors (known errors)
 */
const handleOperationalError = (err, res) => {
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Handle database errors
 */
const handleDatabaseError = (err, res) => {
  let message = 'Database operation failed';
  
  if (err.code === '23505') {
    message = 'Duplicate entry. This record already exists.';
  } else if (err.code === '23503') {
    message = 'Foreign key constraint violation. Related record not found.';
  } else if (err.code === '23502') {
    message = 'Required field is missing.';
  } else if (err.code === '22P02') {
    message = 'Invalid data format.';
  }

  return res.status(400).json({
    success: false,
    status: 'fail',
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message, code: err.code })
  });
};

/**
 * Handle JWT errors
 */
const handleJWTError = (res) => {
  return res.status(401).json({
    success: false,
    status: 'fail',
    message: 'Invalid token. Please log in again.'
  });
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = (res) => {
  return res.status(401).json({
    success: false,
    status: 'fail',
    message: 'Your token has expired. Please log in again.'
  });
};

/**
 * Handle validation errors
 */
const handleValidationError = (err, res) => {
  const errors = err.errors?.map(e => e.message) || [err.message];
  
  return res.status(400).json({
    success: false,
    status: 'fail',
    message: 'Validation failed',
    errors
  });
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR 💥:', err);
  }

  // Operational errors (trusted errors)
  if (err.isOperational) {
    return handleOperationalError(err, res);
  }

  // Database errors
  if (err.code && err.code.startsWith('23')) {
    return handleDatabaseError(err, res);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return handleJWTError(res);
  }

  if (err.name === 'TokenExpiredError') {
    return handleJWTExpiredError(res);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return handleValidationError(err, res);
  }

  // Programming or unknown errors
  return res.status(500).json({
    success: false,
    status: 'error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler
};
