import nodemailer from "nodemailer";

// Get SMTP credentials with fallback to EMAIL_* variables
const getSMTPConfig = () => {
  // Check if using Brevo/Sendinblue (detected by EMAIL_USER containing @smtp-brevo.com)
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const isBrevo = emailUser && emailUser.includes("@smtp-brevo.com");

  const host =
    process.env.SMTP_HOST ||
    process.env.EMAIL_HOST ||
    (isBrevo ? "smtp-relay.brevo.com" : "smtp.gmail.com");

  const port = parseInt(
    process.env.SMTP_PORT || process.env.EMAIL_PORT || "587"
  );

  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  // Use SENDER_EMAIL as the "from" address if available, otherwise use user
  const fromEmail = process.env.SENDER_EMAIL || user;

  return { host, port, user, pass, fromEmail };
};

// Create transporter lazily (only when needed)
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const smtpConfig = getSMTPConfig();
    transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465, // true for 465, false for other ports
      auth:
        smtpConfig.user && smtpConfig.pass
          ? {
              user: smtpConfig.user,
              pass: smtpConfig.pass,
            }
          : undefined,
    });

    // Verify transporter configuration (only in runtime, not during build)
    // Skip verification during build time to avoid build failures
    if (
      typeof window === "undefined" &&
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production" &&
      !process.env.VERCEL &&
      smtpConfig.user &&
      smtpConfig.pass
    ) {
      transporter.verify((error) => {
        if (error) {
          console.error("Email transporter error:", error);
          console.error("   Check your SMTP credentials in .env.local");
        } else {
          console.log("✅ Email server is ready to send messages");
          console.log(`   Using: ${smtpConfig.host}:${smtpConfig.port}`);
        }
      });
    } else if (smtpConfig.user && smtpConfig.pass) {
      // In production/Vercel, just log without verification
      console.log("✅ Email server is ready to send messages");
      console.log(`   Using: ${smtpConfig.host}:${smtpConfig.port}`);
    }
  }
  return transporter;
}

// Check if SMTP credentials are configured (not placeholder values)
function isSMTPConfigured() {
  // Check for SMTP_USER and SMTP_PASS first
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  // Fallback to EMAIL_USER and EMAIL_PASS if SMTP_* not found
  if (!user) user = process.env.EMAIL_USER;
  if (!pass) pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

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

    let subject;
    if (type === "registration") {
      subject = "Verify Your Email - Taskspace";
    } else if (type === "forgot") {
      subject = "Reset Your Password - Taskspace";
    } else {
      subject = "Login OTP - Taskspace";
    }

    const messageText =
      type === "forgot"
        ? "Use this code to reset your password:"
        : "Your verification code is:";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">${subject}</h2>
        <p style="font-size: 16px; color: #555; margin-top: 20px;">${messageText}</p>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 10px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in <strong>5 minutes</strong>.</p>
        ${
          type === "forgot"
            ? '<p style="color: #666; font-size: 14px;">If you did not request a password reset, please ignore this email.</p>'
            : ""
        }
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    const smtpConfig = getSMTPConfig();
    console.log(`📧 Attempting to send OTP email to: ${email}`);
    console.log(`   Using SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
    console.log(`   From: ${smtpConfig.fromEmail || smtpConfig.user}`);

    const info = await getTransporter().sendMail({
      from: `"Taskspace" <${smtpConfig.fromEmail || smtpConfig.user}>`,
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

export async function sendTeamInvitationEmail({ email, teamName, inviterName, inviteUrl }) {
  try {
    if (!isSMTPConfigured()) {
      console.log(`[DEV MODE] Team invitation link for ${email}: ${inviteUrl}`);
      return { success: true, devMode: true };
    }

    const smtpConfig = getSMTPConfig();
    const safeTeamName = String(teamName).replace(/[<>&"']/g, "");
    const safeInviterName = String(inviterName).replace(/[<>&"']/g, "");
    const html = `
      <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <p style="margin:0 0 18px;font-size:14px;font-weight:700;color:#4f46e5;">TASKSPACE</p>
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;">You have been invited to ${safeTeamName}</h1>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#475569;">${safeInviterName} invited you to collaborate in their Taskspace team.</p>
          <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#475569;">Create and verify your account to accept the invitation and access the shared projects and tasks.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#4f46e5;border-radius:8px;padding:12px 18px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Join workspace</a>
          <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#64748b;">This invitation expires in 7 days. If you were not expecting it, you can safely ignore this email.</p>
        </div>
      </div>`;

    const info = await getTransporter().sendMail({
      from: `"Taskspace" <${smtpConfig.fromEmail || smtpConfig.user}>`,
      to: email,
      subject: `You're invited to join ${safeTeamName} on Taskspace`,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Unable to send team invitation:", error.message);
    return { success: false, error: "Invitation email could not be sent" };
  }
}

// Export the function instead of calling it at module load time
export default getTransporter;
