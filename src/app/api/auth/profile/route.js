import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { authenticateToken } from "@/lib/middleware/auth";
import { validateName } from "@/lib/validation";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function GET(req) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    if (error || !user) {
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

export async function PUT(req) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const { user, error } = await authenticateToken(req, cookieStore);
    if (error || !user) {
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name } = body;

    if (name) {
      const nameValidation = validateName(name);
      if (!nameValidation.valid) {
        return NextResponse.json(
          { success: false, message: nameValidation.message },
          { status: 400 }
        );
      }
      const userModel = await User.findById(user._id);
      userModel.name = name;
      await userModel.save();
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
