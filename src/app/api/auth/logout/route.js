import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();

    const cookieStore = cookies();
    // Get user from token
    const { user } = await authenticateToken(req, cookieStore);

    if (user) {
      // Clear refresh token from database
      await User.findByIdAndUpdate(user._id, { $unset: { refreshToken: 1 } });
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 }
    );

    // Clear cookies
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (error) {
    return errorHandler(error);
  }
}
