import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { isObjectId, normalizeDate, normalizePriority } from "@/lib/task-data";
import { addActivity, canEditTeamContent } from "@/lib/collaboration";

const taskSelect = "firstname lastname email profileImage";

async function accessibleTeamIds(userId) {
  return Team.find({ members: userId }).distinct("_id");
}

function ownershipScope(userId, teamIds) {
  return { $or: [{ user: userId }, { team: { $in: teamIds } }] };
}

function validateProject(body) {
  const updates = {};
  if (body.title !== undefined) {
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
  if (body.members !== undefined) {
    if (!Array.isArray(body.members) || body.members.some((memberId) => !isObjectId(memberId))) {
      return { error: "Project members must be valid team members" };
    }
    updates.members = [...new Set(body.members.map(String))];
  }
  if (body.archived !== undefined) updates.archivedAt = body.archived ? new Date() : null;
  return { updates };
}

async function userFrom(req) { return authenticateToken(req, await cookies()); }

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await userFrom(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid project ID" }, { status: 400 });
    const body = await req.json();
    const updates = validateProject(body);
    if (updates.error) return NextResponse.json({ success: false, message: updates.error }, { status: 400 });
    const teamIds = await accessibleTeamIds(user._id);
    const project = await Project.findOne({ _id: id, ...ownershipScope(user._id, teamIds) });
    if (!project) return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    if (project.team) {
      const projectTeam = await Team.findById(project.team);
      if (!canEditTeamContent(projectTeam, user._id)) return NextResponse.json({ success: false, message: "Your viewer role allows you to view this project but not change it" }, { status: 403 });
    }

    const existingMemberIds = project.members.map(String);
    if (updates.updates.members) {
      let allowedMemberIds = [String(user._id)];
      if (project.team) {
        const team = await Team.findOne({ _id: project.team, members: user._id });
        if (!team) return NextResponse.json({ success: false, message: "Team not found" }, { status: 404 });
        if (String(team.owner) !== String(user._id)) {
          return NextResponse.json({ success: false, message: "Only the team owner can manage project members" }, { status: 403 });
        }
        allowedMemberIds = team.members.map(String);
      } else if (String(project.user) !== String(user._id)) {
        return NextResponse.json({ success: false, message: "Only the project owner can manage project members" }, { status: 403 });
      }
      if (updates.updates.members.some((memberId) => !allowedMemberIds.includes(String(memberId)))) {
        return NextResponse.json({ success: false, message: "Each project member must belong to this team" }, { status: 400 });
      }
    }

    Object.assign(project, updates.updates);
    if (updates.updates.archivedAt !== undefined) project.archivedBy = updates.updates.archivedAt ? user._id : null;
    await project.save();
    await addActivity({ actor: user._id, entityType: "project", entityId: project._id, team: project.team, action: body.archived === true ? "archived" : body.archived === false ? "restored" : "updated", details: { changed: Object.keys(updates.updates) } });
    let synchronizedTasks = [];
    if (updates.updates.members) {
      const addedMemberIds = updates.updates.members.filter((memberId) => !existingMemberIds.includes(String(memberId)));
      if (addedMemberIds.length) {
        await Task.updateMany(
          { project: project._id },
          { $addToSet: { assignees: { $each: addedMemberIds } } }
        );
      }
      synchronizedTasks = await Task.find({ project: project._id })
        .populate("project", "title")
        .populate("assignees", taskSelect)
        .populate("reporter", taskSelect)
        .lean();
    }
    await project
      .populate("lead", "firstname lastname email profileImage")
      .populate("members", "firstname lastname email profileImage")
      .populate("team", "name");
    return NextResponse.json({ success: true, project, tasks: synchronizedTasks });
  } catch (error) { return errorHandler(error); }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await userFrom(req);
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid project ID" }, { status: 400 });
    const teamIds = await accessibleTeamIds(user._id);
    const project = await Project.findOneAndDelete({ _id: id, ...ownershipScope(user._id, teamIds) });
    if (!project) return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    // Retain tasks when a project is removed rather than leaving dangling references.
    await Task.updateMany({ project: id }, { $set: { project: null } });
    return NextResponse.json({ success: true, message: "Project deleted" });
  } catch (error) { return errorHandler(error); }
}
