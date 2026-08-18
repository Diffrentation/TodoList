import mongoose from "mongoose";

const teamInvitationSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "editor", "viewer"], default: "editor" },
    tokenHash: { type: String, required: true, select: false, index: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["pending", "registered", "accepted"], default: "pending", index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    acceptedAt: { type: Date, default: null },
    workSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

teamInvitationSchema.index({ team: 1, email: 1, status: 1 });

const TeamInvitation =
  mongoose.models.TeamInvitation ||
  mongoose.model("TeamInvitation", teamInvitationSchema);

export default TeamInvitation;
