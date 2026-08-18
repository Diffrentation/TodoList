import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { isObjectId } from "@/lib/task-data";

const publicUser = "firstname lastname email profileImage";

async function currentUser(req) {
  return authenticateToken(req, await cookies());
}

function response(message, status) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id, userId } = await params;
    if (!isObjectId(id) || !isObjectId(userId)) return response("Invalid ID", 400);

    const team = await Team.findById(id);
    if (!team || !team.members.some((memberId) => String(memberId) === String(user._id))) {
      return response("Team not found", 404);
    }
    if (String(userId) === String(team.owner)) {
      return response("The team owner can't be removed. Delete the team instead.", 400);
    }
    // Either the owner removes someone, or a member removes themselves (leaving the team).
    const isOwner = String(team.owner) === String(user._id);
    const isSelfRemoval = String(user._id) === String(userId);
    if (!isOwner && !isSelfRemoval) return response("Only the team owner can remove other members", 403);

    team.members = team.members.filter((memberId) => String(memberId) !== String(userId));
    await team.save();
    await team.populate(["owner", { path: "members", select: publicUser }]);

    return NextResponse.json({ success: true, message: "Member removed", team });
  } catch (error) {
    return errorHandler(error);
  }
}
