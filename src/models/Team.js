import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

teamSchema.index({ members: 1 });

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

export default Team;
