import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import Project from "@/models/Project";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { isObjectId } from "@/lib/task-data";

export async function GET(req, { params }) {
  await connectDB();
  const { user, error } = await authenticateToken(req, await cookies());
  if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid project ID" }, { status: 400 });
  const teamIds = await Team.find({ members: user._id }).distinct("_id");
  const project = await Project.exists({ _id: id, $or: [{ user: user._id }, { team: { $in: teamIds } }] });
  if (!project) return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
  const activity = await ActivityLog.find({ entityType: "project", entityId: id }).populate("actor", "firstname lastname profileImage").sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ success: true, activity });
}
