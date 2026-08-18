import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import SavedView from "@/models/SavedView";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

async function currentUser(req) { return authenticateToken(req, await cookies()); }

export async function GET(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const scope = new URL(req.url).searchParams.get("scope");
    const views = await SavedView.find({ user: user._id, ...(scope ? { scope } : {}) }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, views });
  } catch (error) { return errorHandler(error); }
}

export async function POST(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { name, scope, filters } = await req.json();
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60 || !["tasks", "projects"].includes(scope) || !filters || typeof filters !== "object") return NextResponse.json({ success: false, message: "Enter a view name and valid filters" }, { status: 400 });
    const view = await SavedView.create({ user: user._id, name: name.trim(), scope, filters });
    return NextResponse.json({ success: true, view }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ success: false, message: "A saved view with that name already exists" }, { status: 409 });
    return errorHandler(error);
  }
}
