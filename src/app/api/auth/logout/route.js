import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    
    // Even if token is invalid, clear cookies
    if (user) {
      // Clear refresh token from database
      user.refreshToken = null;
      await user.save();
    }

    // Clear HTTP-only cookies
    cookieStore.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    cookieStore.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

