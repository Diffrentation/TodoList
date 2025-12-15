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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        {
          success: true,
          message: "If the email exists, OTP has been sent",
          userId: null,
        },
        { status: 200 }
      );
    }

    // Generate OTP
    const otp = OTP.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log(
      "[FORGOT PASSWORD] Generated OTP for:",
      user.email,
      "OTP:",
      otp
    );

    // Delete old OTPs for this email
    await OTP.deleteMany({
      email: user.email.toLowerCase().trim(),
      type: "forgot",
    });

    // Create new OTP
    const otpRecord = await OTP.create({
      email: user.email.toLowerCase().trim(),
      hashedOTP: otp, // Will be hashed by pre-save hook
      expiresAt,
      type: "forgot",
    });

    console.log("[FORGOT PASSWORD] OTP record created:", {
      id: otpRecord._id,
      email: otpRecord.email,
      expiresAt: otpRecord.expiresAt,
    });

    // Send OTP email
    const emailResult = await sendOTPEmail(user.email, otp, "forgot");

    return NextResponse.json(
      {
        success: true,
        message: emailResult.devMode
          ? `OTP sent! Check console for OTP: ${otp}`
          : "OTP sent to your email",
        userId: user._id.toString(),
        devMode: emailResult.devMode,
        otp: emailResult.devMode ? otp : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
