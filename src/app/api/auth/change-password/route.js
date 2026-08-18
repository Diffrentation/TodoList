import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { authenticateToken, hashRefreshToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { addActivity, requestFingerprint } from "@/lib/collaboration";

// Forgotten-password resets go through /api/auth/forgot-password and
// /api/auth/reset-password, which verify a signed, short-lived reset token.
// This route only ever changes the authenticated caller's own password.
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
    const { currentPassword, newPassword, confirmPassword } = body;

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

    // A changed password should sign out every other session, keeping only
    // the one used to make this request.
    const currentRefreshToken = cookieStore.get("refreshToken")?.value;
    const currentHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : null;
    await User.updateOne(
      { _id: user._id },
      { $pull: { sessions: { tokenHash: { $ne: currentHash } } } }
    );

    await addActivity({ actor: user._id, entityType: "account", entityId: user._id, action: "password_changed", details: requestFingerprint(req) });

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

