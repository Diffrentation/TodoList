import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

async function currentUser(req) { return authenticateToken(req, await cookies()); }

export async function GET(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const notifications = await Notification.find({ recipient: user._id, ...(unreadOnly ? { readAt: null } : {}) })
      .populate("actor", "firstname lastname profileImage")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = await Notification.countDocuments({ recipient: user._id, readAt: null });
    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) { return errorHandler(error); }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (body.all) await Notification.updateMany({ recipient: user._id, readAt: null }, { $set: { readAt: new Date() } });
    else if (typeof body.id === "string") await Notification.updateOne({ _id: body.id, recipient: user._id }, { $set: { readAt: new Date() } });
    else return NextResponse.json({ success: false, message: "Choose a notification or mark all as read" }, { status: 400 });
    return NextResponse.json({ success: true, message: "Notifications updated" });
  } catch (error) { return errorHandler(error); }
}
