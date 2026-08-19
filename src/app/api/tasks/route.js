import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { accessibleProjectIds, taskOwnershipScope } from "@/lib/task-access";
import { syncAcceptedInvitationWork } from "@/lib/team-work";
import { addActivity, canEditTeamContent, createDueReminders, notifyMany } from "@/lib/collaboration";
import {
  isObjectId,
  normalizeDate,
  normalizeLabels,
  normalizePriority,
  normalizeStatus,
} from "@/lib/task-data";

const taskSelect = "firstname lastname email profileImage";

function unauthorized(error) {
  return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
}

async function getCurrentUser(req) {
  const cookieStore = await cookies();
  return authenticateToken(req, cookieStore);
}

async function accessibleTeamIds(userId) {
  return Team.find({ members: userId }).distinct("_id");
}

// Visible if you created it, or it's in a team you belong to and (it isn't
// marked private, or you're the reporter/an assignee on it).
async function validateReferences(body, userId, teamIds, projectIds, assigneePool) {
  const updates = {};
  const scope = taskOwnershipScope(userId, teamIds, projectIds);
  if (body.project !== undefined) {
    if (body.project === null || body.project === "") updates.project = null;
    else if (!isObjectId(body.project) || !(await Project.exists({ _id: body.project, ...scope }))) {
      return { error: "Project not found" };
    } else updates.project = body.project;
  }

  if (body.parentTask !== undefined) {
    if (body.parentTask === null || body.parentTask === "") updates.parentTask = null;
    else if (!isObjectId(body.parentTask) || !(await Task.exists({ _id: body.parentTask, ...scope }))) {
      return { error: "Parent task not found" };
    } else updates.parentTask = body.parentTask;
  }

  if (body.assignees !== undefined) {
    if (!Array.isArray(body.assignees) || body.assignees.some((id) => !assigneePool.includes(String(id)))) {
      return { error: "Assignee must be a member of this task's team" };
    }
    updates.assignees = body.assignees;
  }
  return { updates };
}

function validateFields(body, { creating = false } = {}) {
  const updates = {};
  if (creating || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200) {
      return { error: "Title must be between 1 and 200 characters" };
    }
    updates.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length > 4000) {
      return { error: "Description must be at most 4000 characters" };
    }
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
  if (body.labels !== undefined) {
    const labels = normalizeLabels(body.labels);
    if (!labels) return { error: "Labels must be an array of up to 12 short labels" };
    updates.labels = labels;
  }
  if (body.position !== undefined) {
    if (!Number.isFinite(body.position) || body.position < 0 || body.position > 1_000_000) {
      return { error: "Invalid task position" };
    }
    updates.position = body.position;
  }
  return { updates };
}

export async function GET(req) {
  try {
    await connectDB();
    const { user, error } = await getCurrentUser(req);
    if (error || !user) return unauthorized(error);

    await syncAcceptedInvitationWork(user._id);
    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);
    const { searchParams } = new URL(req.url);
    const conditions = [taskOwnershipScope(user._id, teamIds, projectIds)];
    if (searchParams.get("archived") === "true") conditions.push({ archivedAt: { $ne: null } });
    else conditions.push({ archivedAt: null });
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const project = searchParams.get("project");
    const search = searchParams.get("search")?.trim();

    if (status) {
      const normalized = normalizeStatus(status);
      if (!normalized) return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
      conditions.push({ status: normalized });
    }
    if (priority) {
      const normalized = normalizePriority(priority);
      if (!normalized) return NextResponse.json({ success: false, message: "Invalid priority" }, { status: 400 });
      conditions.push({ priority: normalized });
    }
    if (project) {
      if (!isObjectId(project)) return NextResponse.json({ success: false, message: "Invalid project" }, { status: 400 });
      conditions.push({ project });
    }
    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search.slice(0, 100), $options: "i" } },
          { description: { $regex: search.slice(0, 100), $options: "i" } },
          { labels: { $regex: search.slice(0, 100), $options: "i" } },
        ],
      });
    }

    const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

    const tasks = await Task.find(query)
      .populate("project", "title")
      .populate("assignees", taskSelect)
      .populate("reporter", taskSelect)
      .sort({ position: 1, createdAt: -1 })
      .lean();

    await createDueReminders(tasks.filter((task) => (task.assignees || []).some((assignee) => String(assignee?._id || assignee) === String(user._id))), user._id);

    return NextResponse.json({ success: true, tasks, count: tasks.length });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const { user, error } = await getCurrentUser(req);
    if (error || !user) return unauthorized(error);

    const body = await req.json();
    const teamIds = await accessibleTeamIds(user._id);
    const projectIds = await accessibleProjectIds(user._id);

    let team = null;
    let assigneePool = [String(user._id)];
    if (body.team !== undefined && body.team !== null && body.team !== "") {
      if (!isObjectId(body.team) || !teamIds.some((id) => String(id) === String(body.team))) {
        return NextResponse.json({ success: false, message: "Team not found" }, { status: 400 });
      }
      const teamDoc = await Team.findById(body.team);
      if (!canEditTeamContent(teamDoc, user._id)) {
        return NextResponse.json({ success: false, message: "Your viewer role allows you to view team tasks but not create them" }, { status: 403 });
      }
      team = teamDoc._id;
      assigneePool = teamDoc.members.map((id) => String(id));
    }

    const fields = validateFields(body, { creating: true });
    if (fields.error) return NextResponse.json({ success: false, message: fields.error }, { status: 400 });
    const references = await validateReferences(body, user._id, teamIds, projectIds, assigneePool);
    if (references.error) return NextResponse.json({ success: false, message: references.error }, { status: 400 });

    let defaultAssignees = references.updates.assignees || [user._id];
    if (!references.updates.assignees && references.updates.project) {
      const project = await Project.findById(references.updates.project).select("members");
      if (project?.members?.length) defaultAssignees = project.members;
    }

    const task = await Task.create({
      ...fields.updates,
      ...references.updates,
      status: fields.updates.status || "todo",
      user: user._id,
      team,
      reporter: user._id,
      assignees: defaultAssignees,
    });
    await task.populate(["project", { path: "assignees", select: taskSelect }, { path: "reporter", select: taskSelect }]);
    await addActivity({ actor: user._id, entityType: "task", entityId: task._id, team: task.team, action: "created", details: { title: task.title } });
    await notifyMany({
      recipients: defaultAssignees,
      actor: user._id,
      type: "assignment",
      title: "You were assigned a task",
      message: `${user.firstname} assigned you to “${task.title}”.`,
      href: `/dashboard?task=${task._id}`,
      metadata: { taskId: String(task._id) },
    });
    return NextResponse.json({ success: true, message: "Task created", task }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
