import nodemailer from "nodemailer";

// Create transporter with conditional auth
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

// Verify transporter configuration
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.error("Email transporter error:", error);
    } else {
      console.log("Email server is ready to send messages");
    }
  });
}

// Check if SMTP credentials are configured (not placeholder values)
function isSMTPConfigured() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return false;
  }

  // Check if values are placeholders
  const placeholderPatterns = [
    "your-email@gmail.com",
    "your-app-specific-password",
    "your-email",
    "your-password",
    "example@gmail.com",
  ];

  return !placeholderPatterns.some(
    (pattern) =>
      user.toLowerCase().includes(pattern.toLowerCase()) ||
      pass.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Send OTP email
export async function sendOTPEmail(email, otp, type = "registration") {
  try {
    // Check if SMTP is properly configured
    if (!isSMTPConfigured()) {
      console.log(
        `\n📧 [DEV MODE] Email not configured - OTP logged to console:`
      );
      console.log(`   Email: ${email}`);
      console.log(`   OTP: ${otp}`);
      console.log(`   Type: ${type}`);
      console.log(`\n   To enable email sending:`);
      console.log(`   1. Update SMTP_USER and SMTP_PASS in .env.local`);
      console.log(
        `   2. For Gmail, use an App Password (not your regular password)`
      );
      console.log(`   3. See EMAIL_SETUP.md for detailed instructions\n`);
      return {
        success: true,
        message: "OTP logged to console (dev mode - email not configured)",
        devMode: true,
        otp: otp, // Return OTP in dev mode so it can be displayed
      };
    }

    const subject =
      type === "registration"
        ? "Verify Your Email - To-Do List App"
        : "Login OTP - To-Do List App";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    console.log(`📧 Attempting to send OTP email to: ${email}`);

    const info = await transporter.sendMail({
      from: `"To-Do List App" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    console.error("   Error code:", error.code);
    console.error("   Error response:", error.response);

    // Provide helpful error messages
    let errorMessage = error.message;
    if (error.code === "EAUTH") {
      errorMessage =
        "SMTP authentication failed. Check your email and password in .env.local";
    } else if (error.code === "ECONNECTION") {
      errorMessage =
        "Could not connect to SMTP server. Check SMTP_HOST and SMTP_PORT";
    } else if (error.responseCode === 535) {
      errorMessage =
        "Gmail authentication failed. Make sure you're using an App Password, not your regular password";
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      errorResponse: error.response,
    };
  }
}

export default transporter;
