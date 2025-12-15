import jwt from "jsonwebtoken";
import User from "@/models/User";
import connectDB from "@/lib/db";

// Get JWT secrets at runtime (not at module load time)
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be defined in environment variables");
  }
  return secret;
}

function getJWTRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_REFRESH_SECRET must be defined in environment variables"
    );
  }
  return secret;
}

// Generate access token (15 minutes)
export function generateAccessToken(userId) {
  return jwt.sign({ userId }, getJWTSecret(), { expiresIn: "15m" });
}

// Generate refresh token (7 days)
export function generateRefreshToken(userId) {
  return jwt.sign({ userId }, getJWTRefreshSecret(), { expiresIn: "7d" });
}

// Verify access token
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, getJWTRefreshSecret());
  } catch (error) {
    return null;
  }
}

// Authentication middleware
export async function authenticateToken(req, cookies) {
  try {
    await connectDB();

    // Check for token in Authorization header or cookie
    const authHeader = req.headers.get("authorization");
    let cookieToken = null;

    // Try to get token from cookies
    try {
      if (cookies) {
        // Handle both sync and async cookies() calls
        if (typeof cookies.get === "function") {
          const accessTokenCookie = cookies.get("accessToken");
          cookieToken = accessTokenCookie?.value || accessTokenCookie;
        }
      }
    } catch (cookieError) {
      console.error("Error reading cookies:", cookieError);
    }

    // Also check cookie header directly as fallback
    if (!cookieToken) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        }, {});
        cookieToken = cookies["accessToken"];
      }
    }

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : cookieToken;

    if (!token) {
      console.log(
        "[AUTH] No token found - authHeader:",
        !!authHeader,
        "cookieToken:",
        !!cookieToken,
        "cookieHeader:",
        !!req.headers.get("cookie")
      );
      return { user: null, error: "No token provided" };
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      console.log("[AUTH] Token verification failed - token might be expired");
      return { user: null, error: "Invalid or expired token" };
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return { user: null, error: "User not found" };
    }

    if (!user.isVerified) {
      return { user: null, error: "Email not verified" };
    }

    return { user, error: null };
  } catch (error) {
    console.error("[AUTH] Authentication error:", error);
    return { user: null, error: "Authentication failed: " + error.message };
  }
}

// Role-based access middleware
export function requireRole(allowedRoles) {
  return async (req, cookies) => {
    const { user, error } = await authenticateToken(req, cookies);
    if (error || !user) {
      return { user: null, error: error || "Unauthorized" };
    }

    if (!allowedRoles.includes(user.role)) {
      return { user: null, error: "Insufficient permissions" };
    }

    return { user, error: null };
  };
}
