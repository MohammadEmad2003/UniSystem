/**
 * Input Validation Middleware
 * Provides validation and sanitization for API inputs
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation result checker
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    return res.status(400).json({
      success: false,
      status: 'fail',
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  next();
};

/**
 * Common validation rules
 */
const validators = {
  // User ID validation
  userId: () => [
    param('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isInt({ min: 1 })
      .withMessage('User ID must be a positive integer'),
    validate
  ],

  // Student ID validation
  studentId: () => [
    param('studentId')
      .notEmpty()
      .withMessage('Student ID is required')
      .isInt({ min: 1 })
      .withMessage('Student ID must be a positive integer'),
    validate
  ],

  // Class ID validation
  classId: () => [
    param('classId')
      .notEmpty()
      .withMessage('Class ID is required')
      .isInt({ min: 1 })
      .withMessage('Class ID must be a positive integer'),
    validate
  ],

  // Lecture ID validation
  lectureId: () => [
    param('lectureId')
      .notEmpty()
      .withMessage('Lecture ID is required')
      .isInt({ min: 1 })
      .withMessage('Lecture ID must be a positive integer'),
    validate
  ],

  // Course code validation
  courseCode: () => [
    param('courseCode')
      .notEmpty()
      .withMessage('Course code is required')
      .matches(/^[A-Z]{3,4}\d{3,4}$/i)
      .withMessage('Course code must be in format like CS101 or MATH2001'),
    validate
  ],

  // Grade validation
  grade: () => [
    body('grade')
      .notEmpty()
      .withMessage('Grade is required')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Grade must be between 0 and 100'),
    body('type')
      .notEmpty()
      .withMessage('Grade type is required')
      .isIn(['midterm', 'final', 'project', 'attendance', 'practical'])
      .withMessage('Grade type must be one of: midterm, final, project, attendance, practical'),
    validate
  ],

  // User registration validation
  register: () => [
    body('f_name')
      .notEmpty()
      .withMessage('First name is required')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('l_name')
      .notEmpty()
      .withMessage('Last name is required')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['student', 'doctor', 'admin'])
      .withMessage('Role must be one of: student, doctor, admin'),
    
    validate
  ],

  // Login validation
  login: () => [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    validate
  ],

  // Class creation validation
  createClass: () => [
    body('course_code')
      .notEmpty()
      .withMessage('Course code is required')
      .matches(/^[A-Z]{3,4}\d{3,4}$/i)
      .withMessage('Course code must be in format like CS101 or MATH2001'),
    
    body('level')
      .notEmpty()
      .withMessage('Level is required')
      .isInt({ min: 1, max: 4 })
      .withMessage('Level must be between 1 and 4'),
    
    body('semester')
      .notEmpty()
      .withMessage('Semester is required')
      .isIn(['Fall', 'Spring'])
      .withMessage('Semester must be either Fall or Spring'),
    
    body('room_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Room ID must be a positive integer'),
    
    validate
  ],

  // Enrollment validation
  enroll: () => [
    body('student_id')
      .notEmpty()
      .withMessage('Student ID is required')
      .isInt({ min: 1 })
      .withMessage('Student ID must be a positive integer'),
    
    validate
  ],

  // Attendance validation
  attendance: () => [
    body('status')
      .notEmpty()
      .withMessage('Attendance status is required')
      .isIn(['Early_Check', 'Late_Check', 'Absent', 'Present'])
      .withMessage('Status must be one of: Early_Check, Late_Check, Absent, Present'),
    
    body('method')
      .optional()
      .isIn(['nfc', 'manual', 'online'])
      .withMessage('Method must be one of: nfc, manual, online'),
    
    validate
  ],

  // Material validation
  material: () => [
    body('name')
      .notEmpty()
      .withMessage('Material name is required')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Material name must be between 1 and 255 characters'),
    
    body('type')
      .notEmpty()
      .withMessage('Material type is required')
      .isIn(['pdf', 'video', 'link', 'image', 'document'])
      .withMessage('Type must be one of: pdf, video, link, image, document'),
    
    body('url')
      .optional()
      .isURL()
      .withMessage('URL must be a valid URL'),
    
    validate
  ],

  // Payment validation
  payment: () => [
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    
    validate
  ],

  // Query pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    
    validate
  ]
};

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/[<>]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      Object.keys(obj).forEach(key => {
        sanitized[key] = sanitize(obj[key]);
      });
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
};

module.exports = {
  validate,
  validators,
  sanitizeInput
};
