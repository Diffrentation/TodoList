import mongoose from "mongoose";

export const TASK_STATUSES = ["todo", "doing", "completed", "on_hold"];
export const TASK_PRIORITIES = ["none", "low", "medium", "high", "urgent"];

const statusAliases = { pending: "todo", progress: "doing" };

export function normalizeStatus(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  const status = statusAliases[normalized] || normalized;
  return TASK_STATUSES.includes(status) ? status : null;
}

export function normalizePriority(value) {
  if (typeof value !== "string") return null;
  const priority = value.trim().toLowerCase();
  return TASK_PRIORITIES.includes(priority) ? priority : null;
}

export function normalizeLabels(value) {
  if (!Array.isArray(value) || value.length > 12) return null;
  const labels = [...new Set(value.map((label) => String(label).trim()).filter(Boolean))];
  return labels.length <= 12 && labels.every((label) => label.length <= 40) ? labels : null;
}

export function normalizeDate(value) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

export function isObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}
