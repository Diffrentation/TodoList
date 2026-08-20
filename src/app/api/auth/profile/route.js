import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { uploadImageBuffer, destroyImage } from "@/lib/cloudinary";

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
      title: user.title || "",
      username: user.username || "",
      address: user.address,
      isVerified: user.isVerified,
      isGuest: Boolean(user.isGuest),
      guestExpiresAt: user.guestExpiresAt,
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
      const title = formData.get("title");
      const username = formData.get("username");
      const profileImageFile = formData.get("profileImage");

      if (firstname) updateData.firstname = firstname;
      if (lastname) updateData.lastname = lastname;
      if (phone) updateData.phone = phone;
      if (title !== null) updateData.title = String(title).trim();
      if (username !== null) updateData.username = String(username).trim().toLowerCase();

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

          const result = await uploadImageBuffer(buffer, {
            folder: "todolist/profiles",
            publicId: String(user._id),
          });

          updateData.profileImage = result.secure_url;
          updateData.profileImagePublicId = result.public_id;
        } catch (error) {
          console.error("Error saving profile image:", error);
        }
      }
    } else {
      // Handle JSON
      const body = await req.json();
      const { firstname, lastname, phone, title, username, address, deleteProfileImage } = body;

      if (firstname) updateData.firstname = firstname;
      if (lastname) updateData.lastname = lastname;
      if (phone) updateData.phone = phone;
      if (title !== undefined) updateData.title = String(title).trim();
      if (username !== undefined) updateData.username = String(username).trim().toLowerCase();
      if (address) {
        updateData.address = {
          ...user.address.toObject(),
          ...address,
        };
      }
      
      // Handle profile image deletion
      if (deleteProfileImage === true) {
        if (user.profileImagePublicId) {
          await destroyImage(user.profileImagePublicId);
        }
        updateData.profileImage = "";
        updateData.profileImagePublicId = "";
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
      title: user.title || "",
      username: user.username || "",
      address: user.address,
      isVerified: user.isVerified,
      isGuest: Boolean(user.isGuest),
      guestExpiresAt: user.guestExpiresAt,
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

