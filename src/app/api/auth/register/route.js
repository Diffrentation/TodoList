import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendOTPEmail } from "@/lib/email";
import {
  validateEmail,
  validatePassword,
  validateName,
} from "@/lib/validation";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, password } = body;

    // Validation
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { success: false, message: nameValidation.message },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return NextResponse.json(
          { success: false, message: "User already exists" },
          { status: 400 }
        );
      } else {
        // User exists but not verified, delete old OTPs and create new one
        await OTP.deleteMany({ email });
      }
    }

    // Create or update user
    let user;
    if (existingUser) {
      existingUser.name = name;
      existingUser.password = password; // Will be hashed by pre-save hook
      await existingUser.save();
      user = existingUser;
    } else {
      user = await User.create({ name, email, password });
    }

    // Generate OTP
    const otp = OTP.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP
    await OTP.create({
      email,
      hashedOTP: otp, // Will be hashed by pre-save hook
      expiresAt,
      type: "registration",
    });

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, "registration");

    // If email failed, still return success but include OTP in response for dev mode
    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      // In development, include OTP in response if email fails
      return NextResponse.json(
        {
          success: true,
          message:
            "Registration successful. OTP email failed - check console for OTP.",
          userId: user._id,
          otp: emailResult.devMode ? otp : undefined,
          emailError: emailResult.error,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: emailResult.devMode
          ? "Registration successful. OTP logged to console (email not configured)."
          : "Registration successful. Please verify your email with OTP.",
        userId: user._id,
        otp: emailResult.devMode ? otp : undefined, // Include OTP in dev mode
      },
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
