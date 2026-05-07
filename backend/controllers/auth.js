const httpStatus = require("../utilities/httpstatustext");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const crypto = require("crypto");
const emailService = require("../services/email.service");
const userQueries = genericQueries("User", {
  primaryKey: "User_ID",
  emailField: "Email",
});
const studentQueries = genericQueries("Student", {
  primaryKey: "User_ID",
});
const doctorQueries = genericQueries("Doctor", {
  primaryKey: "User_ID",
});
const adminQueries = genericQueries("Admin", {
  primaryKey: "User_ID",
});
const asyncWrapper = require("../middleware/asyncWrapper");
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

  if (req.files) {
    if (req.files.document && req.files.document.length > 0) {
      documentPath = `/uploads/${req.files.document[0].filename}`;
    }
    if (req.files.image && req.files.image.length > 0) {
      imageUrl = `/uploads/${req.files.image[0].filename}`;
    }
  }
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  // Create user with "pending" status for students
  const userResult = await userQueries.create({
    F_Name: f_name,
    L_Name: l_name,
    Email: email,
    Password: hashedPassword,
    Role: "Student",
    Account_Status: "pending",
    Document: documentPath,
    Image_Url: imageUrl,
    is_email_verified: false,
    email_verification_token: verificationToken,
    email_verification_expires: verificationExpires,
  });

  const userId = userResult.lastID;

  // Create student record with SSN, academic level, and department
  if (ssn || academic_level || department_id) {
    await studentQueries.create({
      User_ID: userId,
      SSN: ssn,
      Academic_Level: academic_level,
      Dept_ID: department_id || null,
      Payment_Status: "Unpaid",
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
      F_Name: f_name,
      L_Name: l_name,
      Email: email,
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
  if (user.Account_Status === "Suspended") {
    const error = new Error("Account is suspended");
    error.statusCode = 403;
    return next(error);
  }

  console.log("Account Status:", user.Account_Status);

  if (user.Account_Status === "pending" && user.Role === "Student") {
    const error = new Error("Account pending approval");
    error.statusCode = 403;
    return next(error);
  }

  // Validate password
  const isValidPassword = await bcrypt.compare(password, user.Password);
  if (!isValidPassword) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    return next(error);
  }

  // Create JWT token
  const token = jwt.sign(
    {
      user_id: user.User_ID,
      f_name: user.F_Name,
      l_name: user.L_Name,
      email: user.Email,
      role: user.Role,
    },
    jwtSecret,
    { expiresIn: "5h" },
  );

  // Get additional student/doctor data if applicable
  let additionalData = {};
  if (user.Role === "Student") {
    const student = await studentQueries.getById(user.User_ID);
    if (student) {
      additionalData = {
        ssn: student.SSN,
        academic_level: student.Academic_Level,
        department_id: student.Dept_ID,
        total_hours: student.Total_Hours,
        total_gpa: student.Total_GPA,
        payment_status: student.Payment_Status,
      };
    }
  } else if (user.Role === "Doctor") {
    const doctor = await doctorQueries.getById(user.User_ID);
    if (doctor) {
      // Find departments this doctor manages
      const managedDepts = await new Promise((resolve, reject) => {
        db.all(`SELECT Dept_ID FROM Department WHERE Doctor_ID = ?`, [user.User_ID], (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        });
      });
      additionalData = {
        specialization: doctor.Specialization,
        permissions_level: doctor.Permission,
        managed_departments: managedDepts.map(d => d.Dept_ID)
      };
    }
  } else if (user.Role === "Admin") {
    const admin = await adminQueries.getById(user.User_ID);
    if (admin) {
      additionalData = {
        permissions_level: admin.Permissions_Level,
      };
    }
  }

  // Return response with token and user data
  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        user_id: user.User_ID,
        f_name: user.F_Name,
        l_name: user.L_Name,
        email: user.Email,
        role: user.Role,
        account_status: user.Account_Status,
        document: user.Document,
        image_url: user.Image_Url,
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
  await userQueries.update(user.User_ID, {
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
  const resetExpires = Date.now() + 60 * 60 * 1000; // 1 hour

  // Update user with reset token
  await userQueries.update(user.User_ID, {
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
  await userQueries.update(user.User_ID, {
    Password: hashedPassword,
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
  const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  // Update user with new token
  await userQueries.update(user.User_ID, {
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
  const resetExpires = Date.now() + 60 * 60 * 1000; // 1 hour

  // Update user with new reset token
  await userQueries.update(user.User_ID, {
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
    user_id: user.User_ID,
    f_name: user.F_Name,
    l_name: user.L_Name,
    email: user.Email,
    role: user.Role,
    account_status: user.Account_Status,
    document: user.Document,
    image_url: user.Image_Url,
    created_at: user.Created_at,
  };

  // Get role-specific data
  if (user.Role === "Student") {
    const student = await studentQueries.getById(user.User_ID);
    if (student) {
      profileData = {
        ...profileData,
        ssn: student.SSN,
        academic_level: student.Academic_Level,
        department_id: student.Dept_ID,
        nfc_tag_id: student.NFC_Tag_ID,
        payment_status: student.Payment_Status,
        total_hours: student.Total_Hours,
        total_gpa: student.Total_GPA,
      };
    }
  } else if (user.Role === "Doctor") {
    const doctor = await doctorQueries.getById(user.User_ID);
    if (doctor) {
      profileData = {
        ...profileData,
        specialization: doctor.Specialization,
        department_id: doctor.Dept_ID,
      };
    }
  } else if (user.Role === "Admin") {
    const admin = await adminQueries.getById(user.User_ID);
    if (admin) {
      profileData = {
        ...profileData,
        permissions_level: admin.Permissions_Level,
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
