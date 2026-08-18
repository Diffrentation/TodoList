import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high", "urgent"],
      default: "none",
    },
    dueDate: { type: Date, default: null },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

projectSchema.index({ user: 1, createdAt: -1 });

const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
