import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { verifyPasswordResetToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { rateLimiter } from "@/lib/middleware/rateLimiter";

const limitReset = rateLimiter(5, 15 * 60 * 1000);

export async function POST(req) {
  try {
    const limit = limitReset(req);
    if (!limit.allowed) return NextResponse.json({ success: false, message: limit.message }, { status: 429 });
    await connectDB();
    const { resetToken, newPassword, confirmPassword } = await req.json();
    if (!resetToken || typeof newPassword !== "string" || typeof confirmPassword !== "string") {
      return NextResponse.json({ success: false, message: "Please complete all password fields." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) return NextResponse.json({ success: false, message: "Passwords do not match." }, { status: 400 });
    if (newPassword.length < 8 || newPassword.length > 128) return NextResponse.json({ success: false, message: "Use a password between 8 and 128 characters." }, { status: 400 });

    const payload = verifyPasswordResetToken(resetToken);
    if (!payload) return NextResponse.json({ success: false, message: "This password-reset link has expired. Please request a new code." }, { status: 401 });
    const user = await User.findById(payload.userId).select("+password");
    if (!user) return NextResponse.json({ success: false, message: "This password-reset link is no longer valid." }, { status: 401 });

    user.password = newPassword;
    user.sessions = []; // revoke every signed-in device after a password reset
    await user.save();
    return NextResponse.json({ success: true, message: "Password reset successfully. Please sign in." });
  } catch (error) {
    return errorHandler(error);
  }
}
