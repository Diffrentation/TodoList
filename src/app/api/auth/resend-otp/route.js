import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendOTPEmail } from "@/lib/email";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, type = "registration" } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Generate new OTP
    const otp = OTP.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log(
      "[RESEND OTP] Generated new OTP for:",
      user.email,
      "OTP:",
      otp,
      "Type:",
      type
    );

    // Delete old OTPs
    await OTP.deleteMany({
      email: user.email.toLowerCase().trim(),
      type,
    });

    // Create new OTP
    const otpRecord = await OTP.create({
      email: user.email.toLowerCase().trim(),
      hashedOTP: otp, // Will be hashed by pre-save hook
      expiresAt,
      type,
    });

    console.log("[RESEND OTP] OTP record created:", {
      id: otpRecord._id,
      email: otpRecord.email,
      expiresAt: otpRecord.expiresAt,
    });

    // Send OTP email
    const emailResult = await sendOTPEmail(
      user.email,
      otp,
      type === "forgot" ? "forgot" : "registration"
    );

    return NextResponse.json(
      {
        success: true,
        message: emailResult.devMode
          ? `OTP resent! Check console for OTP: ${otp}`
          : "OTP resent to your email",
        devMode: emailResult.devMode,
        otp: emailResult.devMode ? otp : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
