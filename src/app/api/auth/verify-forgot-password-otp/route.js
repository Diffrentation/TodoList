import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, otp } = body;

    if (!userId || !otp) {
      return NextResponse.json(
        { success: false, message: "User ID and OTP are required" },
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

    // Find OTP
    const otpRecord = await OTP.findOne({
      email: user.email.toLowerCase().trim(),
      type: "forgot",
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      console.error("[OTP VERIFY FORGOT] OTP not found for email:", user.email);
      return NextResponse.json(
        { success: false, message: "OTP not found. Please request a new one." },
        { status: 404 }
      );
    }

    console.log("[OTP VERIFY FORGOT] Found OTP record:", {
      email: otpRecord.email,
      type: otpRecord.type,
      expiresAt: otpRecord.expiresAt,
    });

    // Check if OTP expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      console.error("[OTP VERIFY FORGOT] OTP expired");
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, message: "OTP expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP
    console.log("[OTP VERIFY FORGOT] Verifying OTP");
    const isOTPValid = await otpRecord.verifyOTP(otp);
    console.log("[OTP VERIFY FORGOT] Verification result:", isOTPValid);

    if (!isOTPValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      console.error(
        "[OTP VERIFY FORGOT] Invalid OTP. Attempts:",
        otpRecord.attempts
      );
      return NextResponse.json(
        { success: false, message: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // Delete OTP after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    return NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully. You can now reset your password.",
        userId: user._id.toString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
