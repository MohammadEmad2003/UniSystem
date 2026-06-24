const httpStatus = require("../utilities/httpstatustext");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const crypto = require("crypto");
const emailService = require("../services/email.service");
const userQueries = genericQueries("User", {
  primaryKey: "user_id",
  emailField: "email",
});
const studentQueries = genericQueries("Student", {
  primaryKey: "user_id",
});
const doctorQueries = genericQueries("Doctor", {
  primaryKey: "user_id",
});
const adminQueries = genericQueries("Admin", {
  primaryKey: "user_id",
});
const asyncWrapper = require('../middleware/asyncWrapper');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

// REGISTER - Create new student account
const register = asyncWrapper(async (req, res, next) => {
  const {
    f_name,
    l_name,
    email,
    password,
    ssn,
    academic_level,
    department_id,
  } = req.body;

  // Validate required fields
  if (!f_name || !l_name || !email || !password) {
    const error = new Error("Missing required fields");
    error.statusCode = 400;
    return next(error);
  }

  // Check if email already exists
  const existingUser = await userQueries.getByEmail(email);
  if (existingUser) {
    const error = new Error("Email already exists");
    error.statusCode = 400;
    return next(error);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Get document and image paths if files were uploaded
  let documentPath = null;
  let imageUrl = null;

  // Skip file upload for now - Vercel doesn't support persistent storage
  // Files would need to be uploaded to a cloud storage service like AWS S3
  if (req.files) {
    console.log('File upload detected but skipped for Vercel compatibility');
  }
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user with "pending" status for students
  const userResult = await userQueries.create({
    f_name: f_name,
    l_name: l_name,
    email: email,
    password: hashedPassword,
    role: "Student",
    account_status: "pending",
    document: documentPath,
    image_url: imageUrl,
    is_email_verified: false,
    email_verification_token: verificationToken,
    email_verification_expires: verificationExpires,
  });

  const userId = userResult.user_id;

  // Create student record with SSN, academic level, and department
  if (ssn || academic_level || department_id) {
    await studentQueries.create({
      user_id: userId,
      ssn: ssn,
      academic_level: academic_level,
      dept_id: department_id || null,
      payment_status: "Unpaid",
    });
  }

  // Create JWT token
  const token = jwt.sign(
    {
      user_id: userId,
      f_name: f_name,
      l_name: l_name,
      email: email,
      role: "Student",
    },
    jwtSecret,
    { expiresIn: "5h" },
  );

  // ============Send verification email=============
  try {
    const userForEmail = {
      f_name: f_name,
      l_name: l_name,
      email: email,
    };
    await emailService.sendVerificationEmail(userForEmail, verificationToken);
    console.log(`✅ Confirmation email sent to: ${email}`);
  } catch (emailError) {
    console.error("Error sending confirmation email:", emailError);
    // Continue even if email fails
  }

  // Return response with user data
  res.status(201).json({
    success: true,
    message:
      "Account created successfully! Please check your email to verify your account.",
    data: {
      //   token,
      //   user: {
      //     user_id: userId,
      //     f_name: f_name,
      //     l_name: l_name,
      //     email: email,
      //     role: "Student",
      //     account_status: "pending",
      //     ssn: ssn,
      //     academic_level: academic_level,
      //     department_id: department_id,
      //     document: documentPath,
      //     image_url: imageUrl,
      //     total_hours: 0,
      //     total_gpa: 0,
      //     payment_status: "unpaid",
      //   },
    },
  });
});

// LOGIN - Authenticate user and return token
const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    return next(error);
  }

  // Get user by email
  const user = await userQueries.getByEmail(email);
  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    return next(error);
  }

  // Check if email is verified
  if (!user.is_email_verified) {
    const error = new Error("Please verify your email first");
    error.statusCode = 403;
    return next(error);
  }

  // Check account status
  if (user.account_status === "Suspended") {
    const error = new Error("Account is suspended");
    error.statusCode = 403;
    return next(error);
  }

  console.log("Account Status:", user.account_status);

  if (user.account_status === "pending" && user.role === "Student") {
    const error = new Error("Account pending approval");
    error.statusCode = 403;
    return next(error);
  }

  // Validate password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    return next(error);
  }

  // Create JWT token
  const token = jwt.sign(
    {
      user_id: user.user_id,
      f_name: user.f_name,
      l_name: user.l_name,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: "5h" },
  );

  // Get additional student/doctor data if applicable
  let additionalData = {};
  if (user.role === "Student") {
    const student = await studentQueries.getById(user.user_id);
    if (student) {
      additionalData = {
        ssn: student.ssn,
        academic_level: student.academic_level,
        department_id: student.dept_id,
        total_hours: student.total_hours,
        total_gpa: student.total_gpa,
        payment_status: student.payment_status,
      };
    }
  } else if (user.role === "Doctor") {
    const doctor = await doctorQueries.getById(user.user_id);
    if (doctor) {
      // Find departments this doctor manages
      const managedDepts = await db.query(`SELECT dept_id FROM Department WHERE doctor_id = $1`, [user.user_id]);
      additionalData = {
        specialization: doctor.specialization,
        permissions_level: doctor.permission,
        managed_departments: managedDepts.rows.map(d => d.dept_id)
      };
    }
  } else if (user.role === "Admin") {
    const admin = await adminQueries.getById(user.user_id);
    if (admin) {
      additionalData = {
        permissions_level: admin.permissions_level,
      };
    }
  }

  // Return response with token and user data
  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        user_id: user.user_id,
        f_name: user.f_name,
        l_name: user.l_name,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        document: user.document,
        image_url: user.image_url,
        created_at: new Date().toISOString(),
        ...additionalData,
      },
    },
  });
});

// VERIFY EMAIL - Verify user email with token
const verifyEmail = asyncWrapper(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    const error = new Error("Verification token is required");
    error.statusCode = 400;
    return next(error);
  }

  // Find user with this token
  const user = await userQueries.findByField("email_verification_token", token);

  if (!user) {
    const error = new Error("Invalid verification token");
    error.statusCode = 400;
    return next(error);
  }

  // Check if token expired
  if (new Date() > new Date(user.email_verification_expires)) {
    const error = new Error("Verification token has expired");
    error.statusCode = 400;
    return next(error);
  }

  // Update user - email verified
  await userQueries.update(user.user_id, {
    is_email_verified: true,
    email_verification_token: null,
    email_verification_expires: null,
  });

  res.status(200).json({
    success: true,
    message: "✅ Email verified successfully! You can now log in.",
  });
});

// FORGOT PASSWORD - Send password reset email
const forgotPassword = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    return next(error);
  }

  // Find user by email
  const user = await userQueries.getByEmail(email);
  if (!user) {
    // Don't reveal if email exists or not for security
    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link will be sent.",
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Update user with reset token
  await userQueries.update(user.user_id, {
    password_reset_token: resetToken,
    password_reset_expires: resetExpires,
  });

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
    console.log(`✅ Password reset email sent to: ${email}`);
  } catch (emailError) {
    console.error("Error sending password reset email:", emailError);
    const error = new Error("Error sending reset email");
    error.statusCode = 500;
    return next(error);
  }

  res.status(200).json({
    success: true,
    message:
      "If an account with that email exists, a password reset link will be sent.",
  });
});

// RESET PASSWORD - Reset password with token
const resetPassword = asyncWrapper(async (req, res, next) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!token) {
    const error = new Error("Reset token is required");
    error.statusCode = 400;
    return next(error);
  }

  if (!password || !confirmPassword) {
    const error = new Error("Password and confirmation password are required");
    error.statusCode = 400;
    return next(error);
  }

  if (password !== confirmPassword) {
    const error = new Error("Passwords do not match");
    error.statusCode = 400;
    return next(error);
  }

  if (password.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.statusCode = 400;
    return next(error);
  }

  // Find user with this reset token
  const user = await userQueries.findByField("password_reset_token", token);

  if (!user) {
    const error = new Error("Invalid password reset token");
    error.statusCode = 400;
    return next(error);
  }

  // Check if token expired
  if (new Date() > new Date(user.password_reset_expires)) {
    const error = new Error("Password reset token has expired");
    error.statusCode = 400;
    return next(error);
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Update user - new password and clear reset token
  await userQueries.update(user.user_id, {
    password: hashedPassword,
    password_reset_token: null,
    password_reset_expires: null,
  });

  res.status(200).json({
    success: true,
    message:
      "✅ Password reset successfully! You can now log in with your new password.",
  });
});

// RESEND VERIFICATION EMAIL - Send verification email again
const resendVerificationEmail = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    return next(error);
  }

  // Find user by email
  const user = await userQueries.getByEmail(email);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  // Check if email already verified
  if (user.is_email_verified) {
    const error = new Error("Email is already verified");
    error.statusCode = 400;
    return next(error);
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Update user with new token
  await userQueries.update(user.user_id, {
    email_verification_token: verificationToken,
    email_verification_expires: verificationExpires,
  });

  // Send verification email
  try {
    await emailService.sendVerificationEmail(user, verificationToken);
    console.log(`✅ Verification email resent to: ${email}`);
  } catch (emailError) {
    console.error("Error sending verification email:", emailError);
    const error = new Error("Error sending verification email");
    error.statusCode = 500;
    return next(error);
  }

  res.status(200).json({
    success: true,
    message:
      "✅ Verification email resent successfully. Please check your email.",
  });
});

// RESEND PASSWORD RESET EMAIL - Send password reset email again
const resendPasswordResetEmail = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    return next(error);
  }

  // Find user by email
  const user = await userQueries.getByEmail(email);
  if (!user) {
    // Don't reveal if email exists or not for security
    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link will be sent.",
    });
  }

  // Generate new reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Update user with new reset token
  await userQueries.update(user.user_id, {
    password_reset_token: resetToken,
    password_reset_expires: resetExpires,
  });

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
    console.log(`✅ Password reset email resent to: ${email}`);
  } catch (emailError) {
    console.error("Error sending password reset email:", emailError);
    const error = new Error("Error sending reset email");
    error.statusCode = 500;
    return next(error);
  }

  res.status(200).json({
    success: true,
    message:
      "If an account with that email exists, a password reset link will be sent.",
  });
});

// GET PROFILE - Get current user profile based on their role
const profile = asyncWrapper(async (req, res, next) => {
  const currentUser = req.currentUser; // Set by verifyToken middleware

  if (!currentUser || !currentUser.user_id) {
    const error = new Error("Unauthorized - No user found");
    error.statusCode = 401;
    return next(error);
  }

  // Get user data from database
  const user = await userQueries.getById(currentUser.user_id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  // Build response object with user data
  let profileData = {
    user_id: user.user_id,
    f_name: user.f_name,
    l_name: user.l_name,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    document: user.document,
    image_url: user.image_url,
    created_at: user.created_at,
  };

  // Get role-specific data
  if (user.role === "Student") {
    const student = await studentQueries.getById(user.user_id);
    if (student) {
      profileData = {
        ...profileData,
        ssn: student.ssn,
        academic_level: student.academic_level,
        department_id: student.dept_id,
        nfc_tag_id: student.nfc_tag_id,
        payment_status: student.payment_status,
        total_hours: student.total_hours,
        total_gpa: student.total_gpa,
      };
    }
  } else if (user.role === "Doctor") {
    const doctor = await doctorQueries.getById(user.user_id);
    if (doctor) {
      profileData = {
        ...profileData,
        specialization: doctor.specialization,
        department_id: doctor.dept_id,
      };
    }
  } else if (user.role === "Admin") {
    const admin = await adminQueries.getById(user.user_id);
    if (admin) {
      profileData = {
        ...profileData,
        permissions_level: admin.permissions_level,
      };
    }
  }

  res.status(200).json({
    success: true,
    data: profileData,
  });
});

module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerificationEmail,
  resendPasswordResetEmail,
  profile,
};
