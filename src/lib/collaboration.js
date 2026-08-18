import crypto from "crypto";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";

export function teamRole(team, userId) {
  if (!team || !userId) return null;
  if (String(team.owner) === String(userId)) return "owner";
  if (!team.members?.some((member) => String(member) === String(userId))) return null;
  return team.memberRoles?.get?.(String(userId)) || team.memberRoles?.[String(userId)] || "editor";
}

export function canManageTeam(team, userId) {
  return ["owner", "admin"].includes(teamRole(team, userId));
}

export function canEditTeamContent(team, userId) {
  return ["owner", "admin", "editor"].includes(teamRole(team, userId));
}

// Who may edit, delete, or unlock a *locked* task: the person who reported it,
// or (for team tasks) a team owner/admin. Regular editors/assignees cannot —
// that's the whole point of locking a task down.
export function canManageTaskLock(task, team, userId) {
  if (!userId) return false;
  if (String(task.reporter) === String(userId)) return true;
  return Boolean(team) && canManageTeam(team, userId);
}

export async function addActivity({ actor, entityType, entityId, team = null, action, details = {} }) {
  return ActivityLog.create({ actor, entityType, entityId, team, action, details });
}

export async function notify({ recipient, actor = null, type, title, message, href = "/dashboard", metadata = {} }) {
  if (!recipient || (actor && String(recipient) === String(actor))) return null;
  return Notification.create({ recipient, actor, type, title, message, href, metadata });
}

export async function notifyMany({ recipients, actor, type, title, message, href, metadata = {} }) {
  const uniqueRecipients = [...new Set((recipients || []).map(String))].filter((id) => id !== String(actor));
  if (!uniqueRecipients.length) return [];
  return Notification.insertMany(uniqueRecipients.map((recipient) => ({ recipient, actor, type, title, message, href, metadata })));
}

export async function createDueReminders(tasks, userId) {
  const now = Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;
  const upcoming = (tasks || []).filter((task) => {
    const due = task.dueDate ? new Date(task.dueDate).valueOf() : 0;
    return due && due >= now - 24 * 60 * 60 * 1000 && due <= horizon && task.status !== "completed";
  });
  await Promise.all(upcoming.map(async (task) => {
    const reminderKey = `${task._id}:${new Date(task.dueDate).toISOString().slice(0, 10)}`;
    const exists = await Notification.exists({ recipient: userId, type: "due", "metadata.reminderKey": reminderKey });
    if (!exists) await notify({ recipient: userId, type: "due", title: "Task due soon", message: `“${task.title}” is due ${new Date(task.dueDate).toLocaleDateString()}.`, href: `/dashboard?task=${task._id}`, metadata: { taskId: String(task._id), reminderKey } });
  }));
}

export function requestFingerprint(req) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  return {
    ipHash: ip ? crypto.createHash("sha256").update(ip).digest("hex") : null,
    userAgent: (req.headers.get("user-agent") || "").slice(0, 500),
  };
}
