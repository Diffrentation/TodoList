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
      email: user.email,
      type: "forgot",
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "OTP not found. Please request a new one." },
        { status: 404 }
      );
    }

    // Check if OTP expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, message: "OTP expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP
    const isOTPValid = await otpRecord.verifyOTP(otp);
    if (!isOTPValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
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

