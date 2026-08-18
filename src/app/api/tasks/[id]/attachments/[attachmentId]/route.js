import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import { readFile, unlink } from "fs/promises";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { accessibleProjectIds, taskOwnershipScope } from "@/lib/task-access";
import { addActivity, canEditTeamContent, canManageTaskLock } from "@/lib/collaboration";
import { isObjectId } from "@/lib/task-data";

const privateUploadDir = path.join(process.cwd(), "private-uploads", "tasks");

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await authenticateToken(req, await cookies());
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { id, attachmentId } = await params;
    if (!isObjectId(id) || !isObjectId(attachmentId)) return NextResponse.json({ success: false, message: "Invalid attachment" }, { status: 400 });
    const teamIds = await Team.find({ members: user._id }).distinct("_id");
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({ _id: id, ...taskOwnershipScope(user._id, teamIds, projectIds) });
    if (!task) return NextResponse.json({ success: false, message: "Attachment not found" }, { status: 404 });
    const attachment = task.attachments.id(attachmentId);
    if (!attachment) return NextResponse.json({ success: false, message: "Attachment not found" }, { status: 404 });
    // Legacy attachments uploaded before this route existed are still under /public; redirect to them as-is.
    if (!attachment.url.startsWith(`/api/tasks/${id}/attachments/`)) {
      return NextResponse.redirect(new URL(attachment.url, req.url));
    }
    const buffer = await readFile(path.join(privateUploadDir, attachmentId)).catch(() => null);
    if (!buffer) return NextResponse.json({ success: false, message: "Attachment not found" }, { status: 404 });
    const safeName = attachment.name.replace(/["\r\n]/g, "");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "The attachment could not be loaded" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await authenticateToken(req, await cookies());
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { id, attachmentId } = await params;
    if (!isObjectId(id) || !isObjectId(attachmentId)) return NextResponse.json({ success: false, message: "Invalid attachment" }, { status: 400 });
    const teamIds = await Team.find({ members: user._id }).distinct("_id");
    const projectIds = await accessibleProjectIds(user._id);
    const task = await Task.findOne({ _id: id, ...taskOwnershipScope(user._id, teamIds, projectIds) });
    if (!task) return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    const taskTeam = task.team ? await Team.findById(task.team) : null;
    if (task.team && !canEditTeamContent(taskTeam, user._id)) return NextResponse.json({ success: false, message: "Your viewer role does not allow attachment changes" }, { status: 403 });
    if (task.locked && !canManageTaskLock(task, taskTeam, user._id)) return NextResponse.json({ success: false, message: "This task is locked. Only the reporter or a team owner/admin can remove attachments." }, { status: 403 });
    const attachment = task.attachments.id(attachmentId);
    if (!attachment) return NextResponse.json({ success: false, message: "Attachment not found" }, { status: 404 });
    const storedUrl = attachment.url;
    task.attachments.pull(attachmentId);
    await task.save();
    if (storedUrl.startsWith("/uploads/tasks/")) await unlink(path.join(process.cwd(), "public", storedUrl)).catch(() => {});
    else if (storedUrl.startsWith(`/api/tasks/${id}/attachments/`)) await unlink(path.join(privateUploadDir, attachmentId)).catch(() => {});
    await addActivity({ actor: user._id, entityType: "task", entityId: task._id, team: task.team, action: "attachment_removed", details: { name: attachment.name } });
    return NextResponse.json({ success: true, message: "Attachment removed" });
  } catch { return NextResponse.json({ success: false, message: "The attachment could not be removed" }, { status: 500 }); }
}
