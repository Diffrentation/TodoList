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

// Toggles the current user's own watch status on a task. Anyone who can see
// the task can watch/unwatch it — this only ever changes your own membership
// in the watchers list, never anyone else's.
export async function POST(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid task ID", 400);

    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({
      _id: id,
      ...taskOwnershipScope(user._id, teamIds, projectIds),
    });
    if (!task) return response("Task not found", 404);

    const isWatching = task.watchers.some((watcherId) => String(watcherId) === String(user._id));
    if (isWatching) task.watchers = task.watchers.filter((watcherId) => String(watcherId) !== String(user._id));
    else task.watchers.push(user._id);

    await task.save();
    await task.populate(["project", { path: "assignees", select: publicUser }, { path: "reporter", select: publicUser }, { path: "watchers", select: publicUser }]);

    return NextResponse.json({ success: true, watching: !isWatching, task });
  } catch (error) {
    return errorHandler(error);
  }
}
