import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import User from "@/models/User";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { accessibleProjectIds, taskOwnershipScope } from "@/lib/task-access";
import { isObjectId } from "@/lib/task-data";
import { addActivity, canEditTeamContent, canManageTaskLock, notifyMany } from "@/lib/collaboration";

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
    const attachmentId = typeof body.attachmentId === "string" && isObjectId(body.attachmentId) ? body.attachmentId : null;
    if (!text && !attachmentId) return response("Write a message or attach a file", 400);
    if (text.length > 4000) return response("Comment must be under 4000 characters", 400);

    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({
      _id: id,
      ...taskOwnershipScope(user._id, teamIds, projectIds),
    });
    if (!task) return response("Task not found", 404);
    const taskTeam = task.team ? await Team.findById(task.team) : null;
    if (task.team && !canEditTeamContent(taskTeam, user._id)) return response("Your viewer role allows you to view this task but not comment", 403);
    if (task.locked && !canManageTaskLock(task, taskTeam, user._id)) return response("This task is locked. Only the reporter or a team owner/admin can comment.", 403);

    let attachment;
    if (attachmentId) {
      const source = task.attachments.id(attachmentId);
      if (!source) return response("Attachment not found", 404);
      attachment = { name: source.name, url: source.url, mimeType: source.mimeType };
    }
    task.comments.push({ body: text, author: user._id, ...(attachment ? { attachment } : {}) });
    await task.save();
    const usernames = [...new Set([...text.matchAll(/@([a-z0-9_]{2,40})/gi)].map((match) => match[1].toLowerCase()))];
    const mentioned = usernames.length ? await User.find({ username: { $in: usernames }, isVerified: true }).select("_id") : [];
    await addActivity({ actor: user._id, entityType: "task", entityId: task._id, team: task.team, action: "commented", details: { preview: text.slice(0, 160) } });
    await notifyMany({
      recipients: [...task.assignees, task.reporter, ...mentioned.map((member) => member._id)],
      actor: user._id,
      type: mentioned.length ? "mention" : "comment",
      title: mentioned.length ? "You were mentioned in a task" : "New task comment",
      message: `${user.firstname} commented on “${task.title}”.`,
      href: `/dashboard?task=${task._id}`,
      metadata: { taskId: String(task._id) },
    });
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
