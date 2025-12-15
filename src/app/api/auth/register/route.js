import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendOTPEmail } from "@/lib/email";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    
    const firstname = formData.get("firstname");
    const lastname = formData.get("lastname");
    const email = formData.get("email");
    const password = formData.get("password");
    const phone = formData.get("phone");
    const role = formData.get("role") || "user";
    
    const address = {
      city: formData.get("address.city"),
      state: formData.get("address.state"),
      country: formData.get("address.country") || "India",
      pincode: formData.get("address.pincode"),
    };

    const profileImageFile = formData.get("profileImage");

    // Validation
    if (!firstname || !lastname || !email || !password || !phone) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (!address.city || !address.state || !address.pincode) {
      return NextResponse.json(
        { success: false, message: "All address fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      );
    }

    // Handle profile image upload
    let profileImagePath = "";
    if (profileImageFile && profileImageFile.size > 0) {
      try {
        const bytes = await profileImageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), "public", "uploads", "profiles");
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${profileImageFile.name}`;
        const filepath = join(uploadsDir, filename);

        // Save file
        await writeFile(filepath, buffer);
        profileImagePath = `/uploads/profiles/${filename}`;
      } catch (error) {
        console.error("Error saving profile image:", error);
        // Continue without image if upload fails
      }
    }

    // Create user
    const user = await User.create({
      firstname,
      lastname,
      email,
      password,
      phone,
      role,
      address,
      profileImage: profileImagePath,
      isVerified: false,
    });

    // Generate and send OTP
    const otp = OTP.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log("[REGISTER] Generated OTP for:", user.email, "OTP:", otp);

    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ 
      email: user.email.toLowerCase().trim(), 
      type: "registration" 
    });

    const otpRecord = await OTP.create({
      email: user.email.toLowerCase().trim(),
      hashedOTP: otp, // Will be hashed by pre-save hook
      expiresAt,
      type: "registration",
    });

    console.log("[REGISTER] OTP record created:", {
      id: otpRecord._id,
      email: otpRecord.email,
      expiresAt: otpRecord.expiresAt,
    });

    // Send OTP email
    const emailResult = await sendOTPEmail(user.email, otp, "registration");

    return NextResponse.json(
      {
        success: true,
        message: emailResult.devMode
          ? `OTP sent! Check console for OTP: ${otp}`
          : "OTP sent to your email",
        userId: user._id.toString(),
        devMode: emailResult.devMode,
        otp: emailResult.devMode ? otp : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

