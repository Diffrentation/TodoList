import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Kept separate from members to remain compatible with existing team data.
    // Missing entries are treated as "editor" for legacy members.
    memberRoles: {
      type: Map,
      of: { type: String, enum: ["admin", "editor", "viewer"] },
      default: {},
    },
  },
  { timestamps: true }
);

teamSchema.index({ members: 1 });

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

export default Team;
