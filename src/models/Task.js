import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    body: { type: String, trim: true, maxlength: 4000, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attachment: {
      name: { type: String, maxlength: 180 },
      url: { type: String, maxlength: 500 },
      mimeType: { type: String, maxlength: 120 },
    },
  },
  { timestamps: true, _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    url: { type: String, required: true, maxlength: 500 },
    mimeType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0, max: 10 * 1024 * 1024 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    // pending/progress are retained so existing records remain readable.
    status: {
      type: String,
      enum: ["todo", "doing", "completed", "on_hold", "pending", "progress"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high", "urgent"],
      default: "none",
      index: true,
    },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null, index: true },
    labels: [{ type: String, trim: true, maxlength: 40 }],
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    // Only meaningful when team is set: restricts visibility to assignees/reporter
    // instead of the whole team. Ignored for personal (non-team) tasks.
    private: { type: Boolean, default: false },
    // Distinct from `private` (which controls who can SEE the task): locking
    // freezes editing. While locked, only the reporter or a team owner/admin
    // can change fields, comment, manage attachments, or delete it — everyone
    // else keeps whatever view access `private` already grants them.
    locked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lockedAt: { type: Date, default: null },
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null, index: true },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      default: function defaultReporter() { return this.user; },
      index: true,
    },
    position: { type: Number, default: 0 },
    comments: { type: [commentSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    archivedAt: { type: Date, default: null, index: true },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, status: 1, position: 1 });
taskSchema.index({ user: 1, project: 1, status: 1 });

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

export default Task;
