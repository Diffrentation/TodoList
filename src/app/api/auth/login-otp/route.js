import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendOTPEmail } from "@/lib/email";
import { validateEmail, validatePassword, validateOTP } from "@/lib/validation";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

// Step 1: Request OTP for login
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password, step } = body;

    // Step 1: Verify credentials and send OTP
    if (step === "request") {
      if (!validateEmail(email)) {
        return NextResponse.json(
          { success: false, message: "Invalid email format" },
          { status: 400 }
        );
      }

      if (!password) {
        return NextResponse.json(
          { success: false, message: "Password is required" },
          { status: 400 }
        );
      }

      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password" },
          { status: 401 }
        );
      }

      if (!user.isVerified) {
        return NextResponse.json(
          { success: false, message: "Please verify your email first" },
          { status: 401 }
        );
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Generate OTP
      const otp = OTP.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Delete old OTPs
      await OTP.deleteMany({ email, type: "login" });

      // Save OTP
      await OTP.create({
        email,
        hashedOTP: otp,
        expiresAt,
        type: "login",
      });

      // Send OTP email
      const emailResult = await sendOTPEmail(email, otp, "login");

      if (!emailResult.success) {
        console.error("Failed to send OTP email:", emailResult.error);
        return NextResponse.json(
          {
            success: true,
            message: emailResult.devMode
              ? "OTP logged to console (email not configured)"
              : "OTP email failed - check console for details",
            otp: emailResult.devMode ? otp : undefined,
            emailError: emailResult.error,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: emailResult.devMode
            ? "OTP logged to console (email not configured)"
            : "OTP sent to your email",
          otp: emailResult.devMode ? otp : undefined,
        },
        { status: 200 }
      );
    }

    // Step 2: Verify OTP and login
    if (step === "verify") {
      const { otp: otpCode } = body;

      if (!validateEmail(email)) {
        return NextResponse.json(
          { success: false, message: "Invalid email format" },
          { status: 400 }
        );
      }

      const otpValidation = validateOTP(otpCode);
      if (!otpValidation.valid) {
        return NextResponse.json(
          { success: false, message: otpValidation.message },
          { status: 400 }
        );
      }

      // Find OTP record
      const otpRecord = await OTP.findOne({ email, type: "login" });
      if (!otpRecord) {
        return NextResponse.json(
          { success: false, message: "OTP not found or expired" },
          { status: 400 }
        );
      }

      if (otpRecord.expiresAt < new Date()) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return NextResponse.json(
          { success: false, message: "OTP expired" },
          { status: 400 }
        );
      }

      // Verify OTP
      const isValid = await otpRecord.verifyOTP(otpCode);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: "Invalid OTP" },
          { status: 400 }
        );
      }

      // Get user
      const user = await User.findOne({ email });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }

      // Generate tokens
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      user.refreshToken = refreshToken;
      await user.save();

      // Delete OTP
      await OTP.deleteOne({ _id: otpRecord._id });

      // Create response
      const response = NextResponse.json(
        {
          success: true,
          message: "Login successful",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        { status: 200 }
      );

      // Set cookies
      const isProduction =
        (process.env.NODE_ENV || "development") === "production";
      response.cookies.set("accessToken", accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 15 * 60,
      });

      response.cookies.set("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: "Invalid step parameter" },
      { status: 400 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
