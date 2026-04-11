const express = require("express");
const controller = require("../controllers/auth");
const verifyToken = require("../middleware/verifytoken");
const upload = require("../middleware/upload");

const router = express.Router();

// ============ AUTHENTICATION ROUTES ============

// REGISTER - Create new student account
router.route("/register")
  .post(
    upload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'document', maxCount: 1 }
    ]),
    controller.register
  );

// LOGIN - Authenticate user
router.route("/login")
  .post(controller.login);

// GET PROFILE - Get current user profile (requires authentication)
router.route("/profile")
  .get(verifyToken, controller.profile);

// VERIFY EMAIL - Verify email with token from email
router.route("/verify/:token")
  .get(controller.verifyEmail);

// FORGOT PASSWORD - Send password reset email
router.route("/forgot-password")
  .post(controller.forgotPassword);

// RESET PASSWORD - Reset password with token
router.route("/reset-password/:token")
  .post(controller.resetPassword);

// RESEND VERIFICATION EMAIL - Resend verification email
router.route("/resend-verification")
  .post(controller.resendVerificationEmail);

// RESEND PASSWORD RESET EMAIL - Resend password reset email
router.route("/resend-password-reset")
  .post(controller.resendPasswordResetEmail);

module.exports = router;