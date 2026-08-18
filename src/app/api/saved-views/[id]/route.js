import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import SavedView from "@/models/SavedView";
import { authenticateToken } from "@/lib/middleware/auth";
import { isObjectId } from "@/lib/task-data";

export async function DELETE(req, { params }) {
  await connectDB();
  const { user, error } = await authenticateToken(req, await cookies());
  if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid saved view" }, { status: 400 });
  const deleted = await SavedView.findOneAndDelete({ _id: id, user: user._id });
  if (!deleted) return NextResponse.json({ success: false, message: "Saved view not found" }, { status: 404 });
  return NextResponse.json({ success: true, message: "Saved view deleted" });
}
