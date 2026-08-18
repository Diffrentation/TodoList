import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import { authenticateToken, hashRefreshToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { addActivity, requestFingerprint } from "@/lib/collaboration";

async function currentUser(req) { return authenticateToken(req, await cookies()); }

export async function GET(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const currentRefreshToken = (await cookies()).get("refreshToken")?.value;
    const [activity, userWithSessions] = await Promise.all([
      AuditLog.find({ user: user._id }).sort({ createdAt: -1 }).limit(30).lean(),
      User.findById(user._id).select("+sessions").lean(),
    ]);
    const currentHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : null;
    const sessions = (userWithSessions?.sessions || [])
      .filter((session) => session.expiresAt > new Date())
      .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
      .map((session) => ({
        id: session._id,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        current: session.tokenHash === currentHash,
      }));
    return NextResponse.json({ success: true, activity, sessions });
  } catch (error) { return errorHandler(error); }
}

export async function POST(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { action } = await req.json();
    if (action !== "sign_out_all") return NextResponse.json({ success: false, message: "Unsupported security action" }, { status: 400 });
    const currentRefreshToken = (await cookies()).get("refreshToken")?.value;
    const currentHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : null;
    // Keep the session making this request; drop every other one immediately
    // (not just "as their access tokens expire" — the refresh route now also
    // rejects any token whose session no longer exists).
    await User.updateOne({ _id: user._id }, { $pull: { sessions: { tokenHash: { $ne: currentHash } } } });
    await addActivity({ actor: user._id, entityType: "account", entityId: user._id, action: "signed_out_all_devices", details: requestFingerprint(req) });
    return NextResponse.json({ success: true, message: "You've been signed out on all other devices." });
  } catch (error) { return errorHandler(error); }
}
