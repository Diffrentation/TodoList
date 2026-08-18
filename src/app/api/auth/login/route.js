import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { generateAccessToken, generateRefreshToken, recordSession } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { rateLimiter } from "@/lib/middleware/rateLimiter";
import { addActivity, requestFingerprint } from "@/lib/collaboration";

const limitLogin = rateLimiter(8, 15 * 60 * 1000);

export async function POST(req) {
  try {
    const limit = limitLogin(req);
    if (!limit.allowed) {
      return NextResponse.json({ success: false, message: limit.message }, { status: 429 });
    }
    await connectDB();

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user with password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Require verification only after credentials have been validated. This avoids
    // exposing verification state to someone who does not know the password.
    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          verificationRequired: true,
          userId: user._id.toString(),
          message: "Your email needs verification. Check your inbox for the OTP.",
        },
        { status: 403 }
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Record this device as a new session (one of possibly several signed-in devices)
    const fingerprint = requestFingerprint(req);
    await recordSession(user._id, refreshToken, fingerprint);
    await addActivity({ actor: user._id, entityType: "account", entityId: user._id, action: "signed_in", details: fingerprint });

    // Set HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Return user data (without password)
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
        message: "Login successful",
        user: userData,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

