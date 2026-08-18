import mongoose from "mongoose";

const savedViewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scope: { type: String, enum: ["tasks", "projects"], required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    filters: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

savedViewSchema.index({ user: 1, scope: 1, name: 1 }, { unique: true });

const SavedView = mongoose.models.SavedView || mongoose.model("SavedView", savedViewSchema);
export default SavedView;
