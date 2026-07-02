require("dotenv").config();
const nodemailer = require("nodemailer");

const EMAILJS_ENABLED = process.env.EMAILJS_ENABLED === "true";
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || "service_nxaennn";
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || "template_o8lik7f";
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || "SEpLkEukl7VohBnIc";
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || null;
const EMAILJS_STRICT_MODE = process.env.EMAILJS_STRICT_MODE === "true";
const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";
const EMAIL_SMTP_FALLBACK = process.env.EMAIL_SMTP_FALLBACK === "true";
const EMAILJS_AVAILABLE = EMAILJS_ENABLED && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && (!EMAILJS_STRICT_MODE || EMAILJS_PRIVATE_KEY);

const smtpConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
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
          }
    )
  : null;

// Debug
const debugLog = (...args) => {
  if (process.env.DEBUG_EMAIL === "true") console.log(...args);
};

const emailJsFetch = async (url, options) => {
  if (typeof fetch !== "undefined") {
    return fetch(url, options);
  }
  const fetchPkg = await import("node-fetch");
  return fetchPkg.default(url, options);
};

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

  debugLog("EmailJS payload", payload);

  const response = await emailJsFetch(EMAILJS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  debugLog("EmailJS response status", response.status, bodyText);

  if (!response.ok) {
    throw new Error(`EmailJS error ${response.status}: ${bodyText}`);
  }

  try {
    const data = JSON.parse(bodyText);
    debugLog("✅ EmailJS sent successfully", data);
    return data;
  } catch (parseErr) {
    debugLog("✅ EmailJS sent successfully (text response)", bodyText);
    return { success: true, text: bodyText };
  }
};

// Verify SMTP if configured
if (transporter) {
  transporter.verify((err) => {
    if (err) {
      console.error("❌ SMTP Error:", err.message);
    } else {
      debugLog("✅ SMTP Ready");
    }
  });
}

// ================== Send Mail ==================
const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || "UniSystem"} <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  if (!transporter) {
    throw new Error("SMTP is not configured for sendMail");
  }

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
  const frontendUrl = process.env.BASE_URL|| "http://localhost:3000";
  const verificationUrl = `${frontendUrl}/api/auth/verify/${verificationToken}`;

  return `
  <div style="font-family: Arial; max-width: 600px; margin: auto;">
    <h2 style="color:#2c3e50;">Welcome to UniSystem 🎓</h2>
    
    <p>Hello ${user.f_name || ""},</p>
    
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
  const frontendUrl = process.env.BASE_URL || "http://localhost:3000";
  const resetUrl = `${frontendUrl}/api/users/reset-password/${resetToken}`;

  return `
  <div style="font-family: Arial; max-width: 600px; margin: auto;">
    <h2 style="color:#e67e22;">Reset Your Password 🔐</h2>
    
    <p>Hello ${user.f_name || ""},</p>
    
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
  if (!user?.email) throw new Error("User email is required");

  const frontendUrl = process.env.BASE_URL || "http://localhost:3000";
  const verificationUrl = `${frontendUrl}/api/auth/verify/${verificationToken}`;

  const templateParams = {
    name: `${user.f_name || ""} ${user.l_name || ""}`.trim() || user.email,
    title: "Capital University Email Verification",
    first_name: user.f_name || "",
    last_name: user.l_name || "",
    email: user.email,
    verification_url: verificationUrl,
    verification_link: verificationUrl,
    subject: "Verify Your Email - UniSystem",
    from_name: process.env.EMAIL_FROM_NAME || "Capital University",
    to_email: user.email,
  };

  if (!EMAILJS_AVAILABLE) {
    throw new Error("EmailJS is not configured properly for verification email.");
  }

  try {
    return await sendEmailJS({
      to: user.email,
      templateParams,
    });
  } catch (err) {
    debugLog("EmailJS failed:", err.message);
    if (!EMAIL_SMTP_FALLBACK) {
      throw err;
    }
    debugLog("Falling back to SMTP send because EMAIL_SMTP_FALLBACK=true");
    if (!transporter) {
      throw err;
    }
    const html = buildEmailVerificationHTML(user, verificationToken);
    return sendMail({
      to: user.email,
      subject: "Verify Your Email - UniSystem",
      html,
    });
  }
};

// ================== Send Password Reset Email ==================
const sendPasswordResetEmail = async (user, resetToken) => {
  if (!user?.email) throw new Error("User email is required");

  const html = buildPasswordResetHTML(user, resetToken);

  return sendMail({
    to: user.email,
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
