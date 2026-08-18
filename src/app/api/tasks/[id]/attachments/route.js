import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { accessibleProjectIds, taskOwnershipScope } from "@/lib/task-access";
import { addActivity, canEditTeamContent, canManageTaskLock } from "@/lib/collaboration";
import { isObjectId } from "@/lib/task-data";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv"]);

async function visibleTask(req, id) {
  const { user, error } = await authenticateToken(req, await cookies());
  if (error || !user) return { error: error || "Unauthorized", status: 401 };
  const teamIds = await Team.find({ members: user._id }).distinct("_id");
  const projectIds = await accessibleProjectIds(user._id);
  const task = await Task.findOne({ _id: id, ...taskOwnershipScope(user._id, teamIds, projectIds) });
  return task ? { user, task } : { error: "Task not found", status: 404 };
}

export async function POST(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, message: "Invalid task ID" }, { status: 400 });
    const result = await visibleTask(req, id);
    if (result.error) return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    const team = result.task.team ? await Team.findById(result.task.team) : null;
    if (result.task.team && !canEditTeamContent(team, result.user._id)) return NextResponse.json({ success: false, message: "Your viewer role does not allow uploads" }, { status: 403 });
    if (result.task.locked && !canManageTaskLock(result.task, team, result.user._id)) return NextResponse.json({ success: false, message: "This task is locked. Only the reporter or a team owner/admin can add attachments." }, { status: 403 });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ success: false, message: "Choose a file to upload" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_ATTACHMENT_BYTES) return NextResponse.json({ success: false, message: "Use a PDF, image, text, or CSV file under 10 MB" }, { status: 400 });
    if (result.task.attachments.length >= 10) return NextResponse.json({ success: false, message: "A task can have up to 10 attachments" }, { status: 400 });
    // Stored outside /public so a file can only be reached through the authorized
    // GET route below, which re-checks task access before streaming it.
    const attachmentId = new mongoose.Types.ObjectId();
    const uploadDirectory = path.join(process.cwd(), "private-uploads", "tasks");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, String(attachmentId)), Buffer.from(await file.arrayBuffer()));
    result.task.attachments.push({ _id: attachmentId, name: file.name.slice(0, 180), url: `/api/tasks/${result.task._id}/attachments/${attachmentId}`, mimeType: file.type, size: file.size, uploadedBy: result.user._id });
    await result.task.save();
    await addActivity({ actor: result.user._id, entityType: "task", entityId: result.task._id, team: result.task.team, action: "attachment_added", details: { name: file.name } });
    return NextResponse.json({ success: true, message: "Attachment added", attachment: result.task.attachments.at(-1) }, { status: 201 });
  } catch { return NextResponse.json({ success: false, message: "The attachment could not be uploaded. Please try again." }, { status: 500 }); }
}
