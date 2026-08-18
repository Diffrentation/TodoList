import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { generatePasswordResetToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { rateLimiter } from "@/lib/middleware/rateLimiter";

const limitVerification = rateLimiter(8, 15 * 60 * 1000);
const invalidCode = "The code is invalid or has expired. Request a new one and try again.";

export async function POST(req) {
  try {
    const limit = limitVerification(req);
    if (!limit.allowed) return NextResponse.json({ success: false, message: limit.message }, { status: 429 });
    await connectDB();
    const { email, otp } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !/^\d{6}$/.test(String(otp || ""))) {
      return NextResponse.json({ success: false, message: invalidCode }, { status: 400 });
    }

    const user = await User.findOne({ email: normalizedEmail });
    const otpRecord = await OTP.findOne({ email: normalizedEmail, type: "forgot" }).sort({ createdAt: -1 });
    if (!user || !otpRecord || new Date() > otpRecord.expiresAt || otpRecord.attempts >= 5) {
      return NextResponse.json({ success: false, message: invalidCode }, { status: 400 });
    }

    if (!(await otpRecord.verifyOTP(otp))) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return NextResponse.json({ success: false, message: invalidCode }, { status: 400 });
    }

    await OTP.deleteOne({ _id: otpRecord._id });
    return NextResponse.json({
      success: true,
      message: "Code verified. You can now choose a new password.",
      resetToken: generatePasswordResetToken(user._id.toString()),
    });
  } catch (error) {
    return errorHandler(error);
  }
}
