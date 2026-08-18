import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import {
  generateAccessToken,
  generateRefreshToken,
  rotateSession,
  verifyRefreshToken,
} from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function POST(req) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    
    // Get refresh token from cookie
    let refreshToken = null;
    try {
      const refreshTokenCookie = cookieStore.get("refreshToken");
      refreshToken = refreshTokenCookie?.value || refreshTokenCookie;
    } catch (cookieError) {
      console.error("Error reading refresh token cookie:", cookieError);
    }

    // Fallback: check cookie header directly
    if (!refreshToken) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        }, {});
        refreshToken = cookies["refreshToken"];
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "Refresh token not found" },
        { status: 401 }
      );
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      // Clear invalid refresh token cookie
      cookieStore.set("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return NextResponse.json(
        { success: false, message: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    // The session must still exist (i.e. not signed out from elsewhere) and
    // not have outlived its own expiry, independent of the JWT's own expiry.
    // Rotating in place (rather than removing + re-adding) keeps the
    // session's original createdAt intact for "signed in since" accuracy.
    const rotated = await rotateSession(decoded.userId, refreshToken, newRefreshToken);
    if (!rotated) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Set new HTTP-only cookies
    cookieStore.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    cookieStore.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Token refreshed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

