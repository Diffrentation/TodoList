import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendOTPEmail } from "@/lib/email";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { rateLimiter } from "@/lib/middleware/rateLimiter";

const limitPasswordReset = rateLimiter(5, 15 * 60 * 1000);
const privateMessage = "If the email exists, a reset code has been sent.";

export async function POST(req) {
  try {
    const limit = limitPasswordReset(req);
    if (!limit.allowed) return NextResponse.json({ success: false, message: limit.message }, { status: 429 });
    await connectDB();
    const { email } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return NextResponse.json({ success: true, message: privateMessage });

    await OTP.deleteMany({ email: normalizedEmail, type: "forgot" });
    const otp = OTP.generateOTP();
    await OTP.create({ email: normalizedEmail, hashedOTP: otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000), type: "forgot" });
    await sendOTPEmail(user.email, otp, "forgot");
    return NextResponse.json({ success: true, message: privateMessage });
  } catch (error) {
    return errorHandler(error);
  }
}
