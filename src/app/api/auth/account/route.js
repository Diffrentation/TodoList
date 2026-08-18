import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Task from "@/models/Task";
import Project from "@/models/Project";
import Team from "@/models/Team";
import TeamInvitation from "@/models/TeamInvitation";
import Notification from "@/models/Notification";
import ActivityLog from "@/models/ActivityLog";
import AuditLog from "@/models/AuditLog";
import SavedView from "@/models/SavedView";
import OTP from "@/models/OTP";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

export async function DELETE(req) {
  try {
    await connectDB();
    const { user, error } = await authenticateToken(req, await cookies());
    if (error || !user) return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
    const { confirmation } = await req.json();
    if (confirmation !== "DELETE") return NextResponse.json({ success: false, message: "Type DELETE to confirm permanent account removal" }, { status: 400 });
    const ownedTeams = await Team.find({ owner: user._id }).select("_id");
    const ownedTeamIds = ownedTeams.map((team) => team._id);
    await Promise.all([
      Task.deleteMany({ $or: [{ user: user._id }, { team: { $in: ownedTeamIds } }] }),
      Project.deleteMany({ $or: [{ user: user._id }, { team: { $in: ownedTeamIds } }] }),
      TeamInvitation.deleteMany({ $or: [{ invitedBy: user._id }, { team: { $in: ownedTeamIds } }] }),
      Team.deleteMany({ owner: user._id }),
      Team.updateMany({ members: user._id }, { $pull: { members: user._id }, $unset: { [`memberRoles.${user._id}`]: "" } }),
      Notification.deleteMany({ $or: [{ recipient: user._id }, { actor: user._id }] }),
      ActivityLog.deleteMany({ actor: user._id }),
      AuditLog.deleteMany({ user: user._id }),
      SavedView.deleteMany({ user: user._id }),
      OTP.deleteMany({ email: user.email }),
      User.deleteOne({ _id: user._id }),
    ]);
    const cookieStore = await cookies();
    for (const name of ["accessToken", "refreshToken"]) cookieStore.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
    return NextResponse.json({ success: true, message: "Your account and owned workspace data were permanently removed" });
  } catch (error) { return errorHandler(error); }
}
