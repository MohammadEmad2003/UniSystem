require("dotenv").config();
const nodemailer = require("nodemailer");

// ================== CONFIGURATION SETUP ==================
const EMAILJS_ENABLED = process.env.EMAILJS_ENABLED === "true";
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "service_nxaennn";
const EMAILJS_TEMPLATE_ID =
  process.env.EMAILJS_TEMPLATE_ID || "template_o8lik7f";
const EMAILJS_PUBLIC_KEY =
  process.env.EMAILJS_PUBLIC_KEY || "SEpLkEukl7VohBnIc";
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || null;
const EMAILJS_STRICT_MODE = process.env.EMAILJS_STRICT_MODE === "true";
const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";
const EMAIL_SMTP_FALLBACK = process.env.EMAIL_SMTP_FALLBACK === "true";

const EMAILJS_AVAILABLE =
  EMAILJS_ENABLED &&
  EMAILJS_SERVICE_ID &&
  EMAILJS_TEMPLATE_ID &&
  EMAILJS_PUBLIC_KEY &&
  (!EMAILJS_STRICT_MODE || EMAILJS_PRIVATE_KEY);

// ================== SMTP TRANSPORTER (FALLBACK) ==================
const smtpConfigured = Boolean(
  process.env.EMAIL_USER && process.env.EMAIL_PASS,
);
const transporter = smtpConfigured
  ? nodemailer.createTransport(
      process.env.EMAIL_HOST
        ? {
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === "true",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          }
        : {
            service: process.env.EMAIL_SERVICE || "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          },
    )
  : null;

// Debug Logger
const debugLog = (...args) => {
  if (process.env.DEBUG_EMAIL === "true") console.log(...args);
};

// Polling/Fetching Library Selector
const emailJsFetch = async (url, options) => {
  if (typeof fetch !== "undefined") return fetch(url, options);
  const fetchPkg = await import("node-fetch");
  return fetchPkg.default(url, options);
};

// ================== CORE EMAILJS SENDER ENGINE ==================
const sendEmailJS = async ({ to, templateParams }) => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    throw new Error("EmailJS configuration is missing");
  }

  if (EMAILJS_STRICT_MODE && !EMAILJS_PRIVATE_KEY) {
    throw new Error("EmailJS strict mode requires EMAILJS_PRIVATE_KEY in .env");
  }

  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    ...(EMAILJS_PRIVATE_KEY ? { accessToken: EMAILJS_PRIVATE_KEY } : {}),
    template_params: {
      ...templateParams,
      to_email: to,
    },
  };

  debugLog("Sending EmailJS Payload:", payload);

  const response = await emailJsFetch(EMAILJS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  debugLog("EmailJS Server Status:", response.status, bodyText);

  if (!response.ok)
    throw new Error(`EmailJS error ${response.status}: ${bodyText}`);
  return { success: true, text: bodyText };
};

// Verify SMTP if active
if (transporter) {
  transporter.verify((err) => {
    if (err) console.error("❌ SMTP Verification Error:", err.message);
    else debugLog("✅ SMTP Fallback System Ready");
  });
}

// ================== SMTP NATIVE SENDER ==================
const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "Capital University"}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };
  if (!transporter) throw new Error("SMTP is not configured for sendMail");
  return await transporter.sendMail(mailOptions);
};

const isGmailAddress = (email) => {
  if (!email) return false;
  return (
    typeof email === "string" &&
    (email.toLowerCase().endsWith("@gmail.com") ||
      email.toLowerCase().endsWith("@googlemail.com"))
  );
};

// ================== DYNAMIC FALLBACK HTML GENERATOR (FOR SMTP) ==================
const buildBaseTemplateHTML = (
  greeting,
  bodyText,
  actionUrl,
  actionBtnText,
  noticeText,
) => {
  return `
  <div style="background-color: #030712; color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 45px 30px; max-width: 550px; margin: 0 auto; border-radius: 16px; border: 1px solid #1f2937; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
    <div style="text-align: center; border-bottom: 1px solid #1f2937; padding-bottom: 25px; margin-bottom: 35px;">
      <div style="margin-bottom: 14px;">
        <img src="https://uni-system-sgjo.vercel.app/uni_logo.png" alt="Capital University Logo" style="width: 64px; height: 64px; display: inline-block; vertical-align: middle; object-fit: contain;" />
      </div>
      <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">Capital <span style="color: #06b6d4;">University</span></h1>
      <p style="color: #9ca3af; margin: 6px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">Future Smart Education Platform</p>
    </div>
    <div style="text-align: center; padding: 0 5px;">
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 18px; letter-spacing: -0.5px;">${greeting}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #9ca3af; margin-bottom: 35px; max-width: 450px; margin-left: auto; margin-right: auto;">${bodyText}</p>
      <div style="margin: 35px 0;">
        <a href="${actionUrl}" style="background-color: #2563eb; background-image: linear-gradient(to right, #2563eb, #06b6d4); color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); letter-spacing: 0.5px;">${actionBtnText}</a>
      </div>
      <p style="font-size: 13px; color: #4b5563; margin-top: 35px;">${noticeText}</p>
    </div>
    <div style="text-align: center; border-top: 1px solid #1f2937; padding-top: 25px; margin-top: 40px; font-size: 11px; color: #4b5563;">
      <p style="margin: 0 0 4px 0;">Automated account security email from Capital University Platform.</p>
      <p style="margin: 0;">&copy; 2026 Capital University Systems. All computational rights reserved.</p>
    </div>
  </div>`;
};

// ================== METHOD 1: SEND VERIFICATION EMAIL ==================
const sendVerificationEmail = async (user, verificationToken) => {
  if (!user?.email) throw new Error("User email is required");

  const frontendUrl = process.env.BASE_URL || "http://localhost:3000";
  const verificationUrl = `${frontendUrl}/api/auth/verify/${verificationToken}`;
  const userName =
    `${user.f_name || ""} ${user.l_name || ""}`.trim() || user.email;

  const templateParams = {
    subject: "🔐 Verify Your Email - Capital University",
    greeting: `Welcome, ${user.f_name || userName}! 👋`,
    body_text:
      "Thank you for registering at Capital University. Please verify your email address to secure your account and activate your smart educational dashboard.",
    action_url: verificationUrl,
    button_text: "Verify Email Address",
    notice_text:
      "This link is secure and will expire shortly. If you did not request this account creation, you can safely ignore this email.",
    from_name: "Capital University",
  };

  if (EMAILJS_AVAILABLE) {
    try {
      return await sendEmailJS({ to: user.email, templateParams });
    } catch (err) {
      debugLog(
        "EmailJS Verification process failed, testing SMTP backup:",
        err.message,
      );
      if (!EMAIL_SMTP_FALLBACK) throw err;
    }
  }

  // Local Fallback if EmailJS fails or is disabled
  const html = buildBaseTemplateHTML(
    templateParams.greeting,
    templateParams.body_text,
    verificationUrl,
    templateParams.button_text,
    templateParams.notice_text,
  );
  return sendMail({ to: user.email, subject: templateParams.subject, html });
};

// ================== METHOD 2: SEND PASSWORD RESET EMAIL ==================
const sendPasswordResetEmail = async (user, resetToken) => {
  if (!user?.email) throw new Error("User email is required");

  const frontendUrl = process.env.BASE_URL || "http://localhost:3000";
  const resetUrl = `${frontendUrl}/api/users/reset-password/${resetToken}`;
  const userName =
    `${user.f_name || ""} ${user.l_name || ""}`.trim() || user.email;

  const templateParams = {
    subject: "🔐 Reset Your Password - Capital University",
    greeting: "Reset Your Password 🔐",
    body_text: `Hello ${userName}, we received a request to reset the password for your account at Capital University. Click the secure button below to set up a new password:`,
    action_url: resetUrl,
    button_text: "Reset Password",
    notice_text:
      "This reset link is secure and will expire in 1 hour. If you did not make this request, you can safely ignore this email.",
    from_name: "Capital University",
  };

  if (EMAILJS_AVAILABLE) {
    try {
      return await sendEmailJS({ to: user.email, templateParams });
    } catch (err) {
      debugLog(
        "EmailJS Reset Password process failed, testing SMTP backup:",
        err.message,
      );
      if (!EMAIL_SMTP_FALLBACK) throw err;
    }
  }

  // Local Fallback if EmailJS fails or is disabled
  const html = buildBaseTemplateHTML(
    templateParams.greeting,
    templateParams.body_text,
    resetUrl,
    templateParams.button_text,
    templateParams.notice_text,
  );
  return sendMail({ to: user.email, subject: templateParams.subject, html });
};

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  isGmailAddress,
};
