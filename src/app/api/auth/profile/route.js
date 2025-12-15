import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// GET profile
export async function GET(req) {
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
        user: userData,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

// UPDATE profile
export async function PUT(req) {
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

    const contentType = req.headers.get("content-type");
    let updateData = {};

    if (contentType?.includes("multipart/form-data")) {
      // Handle FormData (for profile image)
      const formData = await req.formData();
      
      const firstname = formData.get("firstname");
      const lastname = formData.get("lastname");
      const phone = formData.get("phone");
      const profileImageFile = formData.get("profileImage");

      if (firstname) updateData.firstname = firstname;
      if (lastname) updateData.lastname = lastname;
      if (phone) updateData.phone = phone;

      // Handle address
      const city = formData.get("address.city");
      const state = formData.get("address.state");
      const country = formData.get("address.country");
      const pincode = formData.get("address.pincode");

      if (city || state || country || pincode) {
        updateData.address = {
          ...user.address.toObject(),
          ...(city && { city }),
          ...(state && { state }),
          ...(country && { country }),
          ...(pincode && { pincode }),
        };
      }

      // Handle profile image upload
      if (profileImageFile && profileImageFile.size > 0) {
        try {
          const bytes = await profileImageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);

          const uploadsDir = join(process.cwd(), "public", "uploads", "profiles");
          if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
          }

          const timestamp = Date.now();
          const filename = `${timestamp}-${profileImageFile.name}`;
          const filepath = join(uploadsDir, filename);

          await writeFile(filepath, buffer);
          updateData.profileImage = `/uploads/profiles/${filename}`;
        } catch (error) {
          console.error("Error saving profile image:", error);
        }
      }
    } else {
      // Handle JSON
      const body = await req.json();
      const { firstname, lastname, phone, address, deleteProfileImage } = body;

      if (firstname) updateData.firstname = firstname;
      if (lastname) updateData.lastname = lastname;
      if (phone) updateData.phone = phone;
      if (address) {
        updateData.address = {
          ...user.address.toObject(),
          ...address,
        };
      }
      
      // Handle profile image deletion
      if (deleteProfileImage === true) {
        // Delete old image file if it exists
        if (user.profileImage) {
          try {
            const { unlink } = require("fs/promises");
            const oldImagePath = join(process.cwd(), "public", user.profileImage);
            if (existsSync(oldImagePath)) {
              await unlink(oldImagePath);
            }
          } catch (error) {
            console.error("Error deleting old profile image:", error);
          }
        }
        updateData.profileImage = "";
      }
    }

    // Update user
    Object.assign(user, updateData);
    await user.save();

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
        message: "Profile updated successfully",
        user: userData,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

