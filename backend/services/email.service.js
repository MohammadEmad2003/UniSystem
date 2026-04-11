const nodemailer = require("nodemailer");
require("dotenv").config();

// ================== Check ENV ==================
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn("⚠️ EMAIL_USER or EMAIL_PASS not set — email sending will fail");
}

// ================== Transporter ==================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Debug
const debugLog = (...args) => {
  if (process.env.DEBUG_EMAIL === "true") console.log(...args);
};

// Verify SMTP
transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP Error:", err.message);
  } else {
    debugLog("✅ SMTP Ready");
  }
});

// ================== Send Mail ==================
const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || "UniSystem"} <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    debugLog(`✅ Email sent to ${to}`);
    return info;
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    throw err;
  }
};

// ================== Gmail Check ==================
const isGmailAddress = (email) => {
  if (!email) return false;

  return (
    typeof email === "string" &&
    (email.toLowerCase().endsWith("@gmail.com") ||
      email.toLowerCase().endsWith("@googlemail.com"))
  );
};

// ================== Email Verification Template ==================
const buildEmailVerificationHTML = (user, verificationToken) => {
  const verificationUrl = `${process.env.BASE_URL}/api/auth/verify/${verificationToken}`;

  return `
  <div style="font-family: Arial; max-width: 600px; margin: auto;">
    <h2 style="color:#2c3e50;">Welcome to UniSystem 🎓</h2>
    
    <p>Hello ${user.F_Name || ""},</p>
    
    <p>Please verify your email by clicking the button below:</p>

    <div style="margin:20px 0;">
      <a href="${verificationUrl}" 
         style="background:#3498db; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">
         Verify Email
      </a>
    </div>

    <p>If the button doesn't work, copy this link:</p>
    <p>${verificationUrl}</p>

    <p style="color:gray; font-size:12px;">
      This link expires in 24 hours.
    </p>
  </div>
  `;
};

// ================== Password Reset Template ==================
const buildPasswordResetHTML = (user, resetToken) => {
  const resetUrl = `${process.env.BASE_URL}/api/auth/reset-password/${resetToken}`;

  return `
  <div style="font-family: Arial; max-width: 600px; margin: auto;">
    <h2 style="color:#e67e22;">Reset Your Password 🔐</h2>
    
    <p>Hello ${user.F_Name || ""},</p>
    
    <p>You requested to reset your password.</p>

    <div style="margin:20px 0;">
      <a href="${resetUrl}" 
         style="background:#e67e22; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">
         Reset Password
      </a>
    </div>

    <p>If the button doesn't work, copy this link:</p>
    <p>${resetUrl}</p>

    <p style="color:gray; font-size:12px;">
      This link expires in 1 hour.
    </p>
  </div>
  `;
};

// ================== Send Verification Email ==================
const sendVerificationEmail = async (user, verificationToken) => {
  if (!user?.Email) throw new Error("User email is required");

  const html = buildEmailVerificationHTML(user, verificationToken);

  return sendMail({
    to: user.Email,
    subject: "Verify Your Email - UniSystem",
    html,
  });
};

// ================== Send Password Reset Email ==================
const sendPasswordResetEmail = async (user, resetToken) => {
  if (!user?.Email) throw new Error("User email is required");

  const html = buildPasswordResetHTML(user, resetToken);

  return sendMail({
    to: user.Email,
    subject: "Reset Your Password - UniSystem",
    html,
  });
};

// ================== EXPORT ==================
module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  isGmailAddress,
};