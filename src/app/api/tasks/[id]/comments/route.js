import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { accessibleProjectIds, taskOwnershipScope } from "@/lib/task-access";
import { isObjectId } from "@/lib/task-data";

const publicUser = "firstname lastname email profileImage";

function response(message, status) {
  return NextResponse.json({ success: false, message }, { status });
}

async function currentUser(req) {
  const cookieStore = await cookies();
  return authenticateToken(req, cookieStore);
}

async function accessibleTeamIds(userId) {
  return Team.find({ members: userId }).distinct("_id");
}

export async function POST(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid task ID", 400);

    const body = await req.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text || text.length > 4000) {
      return response("Comment must be between 1 and 4000 characters", 400);
    }

    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({
      _id: id,
      ...taskOwnershipScope(user._id, teamIds, projectIds),
    });
    if (!task) return response("Task not found", 404);

    task.comments.push({ body: text, author: user._id });
    await task.save();
    await task.populate([
      "project",
      { path: "assignees", select: publicUser },
      { path: "reporter", select: publicUser },
      { path: "comments.author", select: publicUser },
    ]);

    return NextResponse.json({ success: true, message: "Comment added", task }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
