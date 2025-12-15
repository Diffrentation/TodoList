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
    if (error || !user) {
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword, type, userId } = body;

    // Handle forgot password flow (no auth required)
    if (type === "forgot") {
      if (!userId || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, message: "All fields are required" },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, message: "Passwords do not match" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      // Find user by userId (for forgot password flow)
      const forgotUser = await User.findById(userId).select("+password");
      if (!forgotUser) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }

      // Update password
      forgotUser.password = newPassword;
      await forgotUser.save();

      return NextResponse.json(
        {
          success: true,
          message: "Password changed successfully",
        },
        { status: 200 }
      );
    }

    // Handle regular password change (requires authentication)
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "New passwords do not match" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Verify current password
    const userWithPassword = await User.findById(user._id).select("+password");
    const isCurrentPasswordValid = await userWithPassword.comparePassword(
      currentPassword
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Update password
    userWithPassword.password = newPassword;
    await userWithPassword.save();

    return NextResponse.json(
      {
        success: true,
        message: "Password changed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

