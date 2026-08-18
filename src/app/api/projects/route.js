import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { isObjectId, normalizeDate, normalizePriority } from "@/lib/task-data";
import { canEditTeamContent } from "@/lib/collaboration";

async function currentUser(req) {
  return authenticateToken(req, await cookies());
}

async function accessibleTeamIds(userId) {
  return Team.find({ members: userId }).distinct("_id");
}

function ownershipScope(userId, teamIds) {
  return { $or: [{ user: userId }, { team: { $in: teamIds } }] };
}

function validateProject(body, { creating = false } = {}) {
  const updates = {};
  if (creating || body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 2 || body.title.trim().length > 120) return { error: "Project title must be between 2 and 120 characters" };
    updates.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length > 4000) return { error: "Description must be at most 4000 characters" };
    updates.description = body.description.trim();
  }
  if (body.priority !== undefined) {
    const priority = normalizePriority(body.priority);
    if (!priority) return { error: "Invalid project priority" };
    updates.priority = priority;
  }
  if (body.dueDate !== undefined) {
    const dueDate = normalizeDate(body.dueDate);
    if (dueDate === undefined) return { error: "Invalid due date" };
    updates.dueDate = dueDate;
  }
  return { updates };
}

export async function GET(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const teamIds = await accessibleTeamIds(user._id);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const priority = searchParams.get("priority");
    const conditions = [ownershipScope(user._id, teamIds)];
    if (search) conditions.push({ title: { $regex: search.slice(0, 100), $options: "i" } });
    if (priority) {
      const normalized = normalizePriority(priority);
      if (!normalized) return NextResponse.json({ success: false, message: "Invalid priority" }, { status: 400 });
      conditions.push({ priority: normalized });
    }
    if (searchParams.get("archived") === "true") conditions.push({ archivedAt: { $ne: null } });
    else conditions.push({ archivedAt: null });
    const query = conditions.length > 1 ? { $and: conditions } : conditions[0];
    const projects = await Project.find(query)
      .populate("lead", "firstname lastname email profileImage")
      .populate("members", "firstname lastname email profileImage")
      .populate("team", "name")
      .sort({ createdAt: -1 })
      .lean();
    const projectIds = projects.map((project) => project._id);
    const summaries = projectIds.length ? await Task.aggregate([
      { $match: { project: { $in: projectIds }, parentTask: null, archivedAt: null } },
      { $group: { _id: "$project", total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } } } },
    ]) : [];
    const summaryByProject = new Map(summaries.map((summary) => [String(summary._id), { total: summary.total, completed: summary.completed }]));
    return NextResponse.json({ success: true, projects: projects.map((project) => ({ ...project, taskSummary: summaryByProject.get(String(project._id)) || { total: 0, completed: 0 } })) });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const teamIds = await accessibleTeamIds(user._id);

    let team = null;
    let members = [user._id];
    if (body.team !== undefined && body.team !== null && body.team !== "") {
      if (!isObjectId(body.team) || !teamIds.some((id) => String(id) === String(body.team))) {
        return NextResponse.json({ success: false, message: "Team not found" }, { status: 400 });
      }
      const teamDoc = await Team.findById(body.team);
      if (!canEditTeamContent(teamDoc, user._id)) return NextResponse.json({ success: false, message: "Your viewer role does not allow creating projects" }, { status: 403 });
      team = teamDoc._id;
      members = teamDoc.members;
    }

    const validated = validateProject(body, { creating: true });
    if (validated.error) return NextResponse.json({ success: false, message: validated.error }, { status: 400 });
    const project = await Project.create({ ...validated.updates, user: user._id, lead: user._id, team, members });
    await project.populate(["lead", { path: "members", select: "firstname lastname email profileImage" }, { path: "team", select: "name" }]);
    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
