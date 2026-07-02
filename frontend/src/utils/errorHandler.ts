/**
 * Frontend Error Handler
 * Provides user-friendly error messages and error boundaries
 */

export interface ApiError {
  success: false;
  status: string;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  stack?: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Get user-friendly error message from API error
 */
export const getErrorMessage = (error: any): string => {
  // API error response
  if (error?.response?.data) {
    const data = error.response.data as ApiError;
    
    // If there are specific field errors
    if (data.errors && data.errors.length > 0) {
      return data.errors.map(e => e.message).join('. ');
    }
    
    // If there's a specific message
    if (data.message) {
      return data.message;
    }
  }
  
  // Network errors
  if (error?.code === 'ERR_NETWORK') {
    return 'Network error. Please check your internet connection.';
  }
  
  if (error?.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.';
  }
  
  // Validation errors
  if (error?.name === 'ValidationError') {
    return 'Invalid data provided. Please check your inputs.';
  }
  
  // Default error message
  if (error?.message) {
    return error.message;
  }
  
  return 'Something went wrong. Please try again later.';
};

/**
 * Handle API errors with user-friendly messages
 */
export const handleApiError = (error: any): AppError => {
  const message = getErrorMessage(error);
  const statusCode = error?.response?.status || 500;
  
  return new AppError(message, statusCode);
};

/**
 * Error types for better categorization
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Get error type from error object
 */
export const getErrorType = (error: any): ErrorType => {
  if (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED') {
    return ErrorType.NETWORK;
  }
  
  if (error?.response?.status === 400) {
    return ErrorType.VALIDATION;
  }
  
  if (error?.response?.status === 401) {
    return ErrorType.AUTHENTICATION;
  }
  
  if (error?.response?.status === 403) {
    return ErrorType.AUTHORIZATION;
  }
  
  if (error?.response?.status === 404) {
    return ErrorType.NOT_FOUND;
  }
  
  if (error?.response?.status >= 500) {
    return ErrorType.SERVER;
  }
  
  return ErrorType.UNKNOWN;
};

/**
 * User-friendly error messages by type
 */
export const getErrorTypeMessage = (type: ErrorType): string => {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Network error. Please check your internet connection.';
    case ErrorType.VALIDATION:
      return 'Please check your inputs and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Please log in to continue.';
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorType.SERVER:
      return 'Server error. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
};
