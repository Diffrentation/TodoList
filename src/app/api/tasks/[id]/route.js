import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { accessibleProjectIds, taskOwnershipScope } from "@/lib/task-access";
import { addActivity, canEditTeamContent, canManageTaskLock, notifyMany } from "@/lib/collaboration";
import { isObjectId, normalizeDate, normalizeLabels, normalizePriority, normalizeStatus } from "@/lib/task-data";

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

function taskFields(body) {
  const updates = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200) return { error: "Title must be between 1 and 200 characters" };
    updates.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length > 4000) return { error: "Description must be at most 4000 characters" };
    updates.description = body.description.trim();
  }
  if (body.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!status) return { error: "Invalid task status" };
    updates.status = status;
  }
  if (body.priority !== undefined) {
    const priority = normalizePriority(body.priority);
    if (!priority) return { error: "Invalid task priority" };
    updates.priority = priority;
  }
  if (body.startDate !== undefined) {
    const startDate = normalizeDate(body.startDate);
    if (startDate === undefined) return { error: "Invalid start date" };
    updates.startDate = startDate;
  }
  if (body.dueDate !== undefined) {
    const dueDate = normalizeDate(body.dueDate);
    if (dueDate === undefined) return { error: "Invalid due date" };
    updates.dueDate = dueDate;
  }
  if (body.private !== undefined) {
    updates.private = Boolean(body.private);
  }
  if (body.locked !== undefined) {
    updates.locked = Boolean(body.locked);
  }
  if (body.labels !== undefined) {
    const labels = normalizeLabels(body.labels);
    if (!labels) return { error: "Labels must be an array of up to 12 short labels" };
    updates.labels = labels;
  }
  if (body.position !== undefined) {
    if (!Number.isFinite(body.position) || body.position < 0 || body.position > 1_000_000) return { error: "Invalid task position" };
    updates.position = body.position;
  }
  if (body.archived !== undefined) updates.archivedAt = body.archived ? new Date() : null;
  return { updates };
}

async function references(body, userId, currentTaskId, teamIds, projectIds, assigneePool) {
  const updates = {};
  const scope = taskOwnershipScope(userId, teamIds, projectIds);
  if (body.project !== undefined) {
    if (body.project === null || body.project === "") updates.project = null;
    else if (!isObjectId(body.project) || !(await Project.exists({ _id: body.project, ...scope }))) return { error: "Project not found" };
    else updates.project = body.project;
  }
  if (body.parentTask !== undefined) {
    if (body.parentTask === null || body.parentTask === "") updates.parentTask = null;
    else if (body.parentTask === currentTaskId || !isObjectId(body.parentTask) || !(await Task.exists({ _id: body.parentTask, ...scope }))) return { error: "Invalid parent task" };
    else updates.parentTask = body.parentTask;
  }
  if (body.assignees !== undefined) {
    if (!Array.isArray(body.assignees) || body.assignees.some((id) => !assigneePool.includes(String(id)))) {
      return { error: "Assignee must be a member of this task's team" };
    }
    updates.assignees = body.assignees;
  }
  return { updates };
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid task ID", 400);

    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({ _id: id, ...taskOwnershipScope(user._id, teamIds, projectIds) })
      .populate("project", "title")
      .populate("team", "name")
      .populate("assignees", publicUser)
      .populate("reporter", publicUser)
      .populate("watchers", publicUser)
      .populate("comments.author", publicUser)
      .populate("lockedBy", publicUser)
      .lean();
    if (!task) return response("Task not found", 404);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid task ID", 400);

    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({ _id: id, ...taskOwnershipScope(user._id, teamIds, projectIds) });
    if (!task) return response("Task not found", 404);

    let taskTeam = null;
    if (task.team) {
      taskTeam = await Team.findById(task.team);
      if (!canEditTeamContent(taskTeam, user._id)) return response("Your viewer role allows you to view this task but not change it", 403);
    }
    const isTaskManager = canManageTaskLock(task, taskTeam, user._id);
    if (task.locked && !isTaskManager) return response("This task is locked. Only the reporter or a team owner/admin can make changes.", 403);

    let assigneePool = [String(user._id)];
    if (taskTeam) assigneePool = taskTeam.members.map((memberId) => String(memberId));

    const body = await req.json();
    if (body.locked !== undefined && Boolean(body.locked) !== task.locked && !isTaskManager) {
      return response("Only the reporter or a team owner/admin can lock or unlock this task.", 403);
    }
    const fields = taskFields(body);
    if (fields.error) return response(fields.error, 400);
    const linked = await references(body, user._id, id, teamIds, projectIds, assigneePool);
    if (linked.error) return response(linked.error, 400);
    Object.assign(task, fields.updates, linked.updates);
    if (body.archived !== undefined) task.archivedBy = body.archived ? user._id : null;
    if (fields.updates.locked !== undefined) {
      task.lockedBy = fields.updates.locked ? user._id : null;
      task.lockedAt = fields.updates.locked ? new Date() : null;
    }
    await task.save();
    const action = body.archived === true ? "archived" : body.archived === false ? "restored" : fields.updates.locked === true ? "locked" : fields.updates.locked === false ? "unlocked" : body.status === "completed" ? "completed" : "updated";
    await addActivity({ actor: user._id, entityType: "task", entityId: task._id, team: task.team, action, details: { changed: Object.keys({ ...fields.updates, ...linked.updates }) } });
    if (linked.updates.assignees) {
      await notifyMany({ recipients: linked.updates.assignees, actor: user._id, type: "assignment", title: "Task assignment updated", message: `${user.firstname} updated assignees for “${task.title}”.`, href: `/dashboard?task=${task._id}`, metadata: { taskId: String(task._id) } });
    }
    await task.populate(["project", { path: "assignees", select: publicUser }, { path: "reporter", select: publicUser }, { path: "lockedBy", select: publicUser }]);
    return NextResponse.json({ success: true, message: "Task updated", task });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid task ID", 400);
    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({ _id: id, ...taskOwnershipScope(user._id, teamIds, projectIds) });
    if (!task) return response("Task not found", 404);
    if (task.locked) {
      const taskTeam = task.team ? await Team.findById(task.team) : null;
      if (!canManageTaskLock(task, taskTeam, user._id)) return response("This task is locked. Only the reporter or a team owner/admin can delete it.", 403);
    }
    await Task.deleteOne({ _id: task._id });
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error) {
    return errorHandler(error);
  }
}
