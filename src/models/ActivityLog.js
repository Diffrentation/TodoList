import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    entityType: { type: String, enum: ["task", "project", "team", "account"], required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
