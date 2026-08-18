import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { authenticateToken, hashRefreshToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const { user, error } = await authenticateToken(req, cookieStore);

    // Even if the access token is invalid/expired, still drop this device's
    // session so a stale refresh token can't be used again. Only removes the
    // current session, not any other signed-in device.
    if (user) {
      const refreshToken = cookieStore.get("refreshToken")?.value;
      if (refreshToken) {
        await User.updateOne({ _id: user._id }, { $pull: { sessions: { tokenHash: hashRefreshToken(refreshToken) } } });
      }
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

