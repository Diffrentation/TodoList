import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Team from "@/models/Team";
import Task from "@/models/Task";
import Project from "@/models/Project";
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

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid team ID", 400);

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      return response("Team name must be between 2 and 80 characters", 400);
    }

    const team = await Team.findOneAndUpdate({ _id: id, owner: user._id }, { name }, { new: true, runValidators: true })
      .populate("owner", publicUser)
      .populate("members", publicUser);
    if (!team) return response("Team not found", 404);
    return NextResponse.json({ success: true, team });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid team ID", 400);

    const team = await Team.findOneAndDelete({ _id: id, owner: user._id });
    if (!team) return response("Team not found", 404);

    // Keep tasks/projects but drop the now-dangling team reference, rather than deleting them.
    await Task.updateMany({ team: id }, { $set: { team: null } });
    await Project.updateMany({ team: id }, { $set: { team: null } });

    return NextResponse.json({ success: true, message: "Team deleted" });
  } catch (error) {
    return errorHandler(error);
  }
}
