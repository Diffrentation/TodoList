import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/middleware/auth";
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
      type: "registration",
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      console.error("[OTP VERIFY] OTP not found for email:", user.email);
      console.error(
        "[OTP VERIFY] Available OTPs:",
        await OTP.find({ email: user.email })
      );
      return NextResponse.json(
        { success: false, message: "OTP not found. Please request a new one." },
        { status: 404 }
      );
    }

    console.log("[OTP VERIFY] Found OTP record:", {
      email: otpRecord.email,
      type: otpRecord.type,
      expiresAt: otpRecord.expiresAt,
      createdAt: otpRecord.createdAt,
      attempts: otpRecord.attempts,
    });

    // Check if OTP expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      console.error("[OTP VERIFY] OTP expired:", {
        now: now.toISOString(),
        expiresAt: otpRecord.expiresAt.toISOString(),
      });
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, message: "OTP expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP
    console.log("[OTP VERIFY] Verifying OTP:", {
      receivedOTP: otp,
      otpLength: otp?.length,
      hashedOTPLength: otpRecord.hashedOTP?.length,
    });

    const isOTPValid = await otpRecord.verifyOTP(otp);
    console.log("[OTP VERIFY] Verification result:", isOTPValid);

    if (!isOTPValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      console.error("[OTP VERIFY] Invalid OTP. Attempts:", otpRecord.attempts);
      return NextResponse.json(
        { success: false, message: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Delete OTP after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Return user data
    const userData = {
      id: user._id.toString(),
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      address: user.address,
      isVerified: user.isVerified,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully",
        user: userData,
        accessToken,
        refreshToken,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
