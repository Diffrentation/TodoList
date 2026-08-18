import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendOTPEmail } from "@/lib/email";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();
    const { userId, email, type = "registration" } = await req.json();
    if (!["registration", "forgot"].includes(type)) return NextResponse.json({ success: false, message: "Invalid verification request." }, { status: 400 });

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = type === "forgot" ? await User.findOne({ email: normalizedEmail }) : await User.findById(userId);
    if (!user) {
      // Match the initial password-reset response to avoid revealing accounts.
      return NextResponse.json({ success: true, message: type === "forgot" ? "If the email exists, a new code has been sent." : "Unable to resend the code." });
    }

    await OTP.deleteMany({ email: user.email.toLowerCase(), type });
    const otp = OTP.generateOTP();
    await OTP.create({ email: user.email.toLowerCase(), hashedOTP: otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000), type });
    const emailResult = await sendOTPEmail(
      user.email,
      otp,
      type === "forgot" ? "forgot" : "registration"
    );

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "We could not send the verification code. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: type === "forgot" ? "If the email exists, a new code has been sent." : "A new code has been sent." });
  } catch (error) {
    return errorHandler(error);
  }
}
