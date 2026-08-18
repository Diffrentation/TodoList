import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { accessibleProjectIds, taskOwnershipScope } from "@/lib/task-access";
import { isObjectId } from "@/lib/task-data";

export async function GET(req, { params }) {
  await connectDB();
  const { user, error } = await authenticateToken(req, await cookies());
  if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid task ID" }, { status: 400 });
  const teamIds = await Team.find({ members: user._id }).distinct("_id");
  const projectIds = await accessibleProjectIds(user._id);
  const permitted = await Task.exists({ _id: id, ...taskOwnershipScope(user._id, teamIds, projectIds) });
  if (!permitted) return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
  const activity = await ActivityLog.find({ entityType: "task", entityId: id })
    .populate("actor", "firstname lastname profileImage")
    .sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ success: true, activity });
}
