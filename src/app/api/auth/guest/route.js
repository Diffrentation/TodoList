import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { generateAccessToken, generateRefreshToken, recordSession } from "@/lib/middleware/auth";
import { rateLimiter } from "@/lib/middleware/rateLimiter";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { addActivity, requestFingerprint } from "@/lib/collaboration";

const GUEST_TTL_MS = 24 * 60 * 60 * 1000;
const limitGuestAccess = rateLimiter(5, 15 * 60 * 1000);

export async function POST(req) {
  try {
    const limit = limitGuestAccess(req);
    if (!limit.allowed) return NextResponse.json({ success: false, message: limit.message }, { status: 429 });

    await connectDB();
    const guestId = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
    const expiresAt = new Date(Date.now() + GUEST_TTL_MS);
    const user = await User.create({
      firstname: "Guest",
      lastname: guestId,
      email: `guest-${guestId}@guest.taskspace.local`,
      password: crypto.randomBytes(32).toString("hex"),
      phone: "0000000000",
      address: { city: "Guest", state: "Guest", country: "India", pincode: "000000" },
      isVerified: true,
      isGuest: true,
      guestExpiresAt: expiresAt,
    });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    const fingerprint = requestFingerprint(req);
    await recordSession(user._id, refreshToken, { ...fingerprint, ttlMs: GUEST_TTL_MS });
    await addActivity({ actor: user._id, entityType: "account", entityId: user._id, action: "guest_session_started", details: fingerprint });

    const cookieStore = await cookies();
    const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 24 * 60 * 60, path: "/" };
    cookieStore.set("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 });
    cookieStore.set("refreshToken", refreshToken, cookieOptions);

    return NextResponse.json({
      success: true,
      message: "Guest workspace ready. Your guest data expires in 24 hours.",
      user: {
        id: user._id.toString(), firstname: user.firstname, lastname: "User", email: user.email,
        phone: user.phone, role: user.role, profileImage: "", address: user.address,
        isVerified: true, isGuest: true, guestExpiresAt: expiresAt,
      },
    }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
