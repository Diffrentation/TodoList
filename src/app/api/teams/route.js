import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Team from "@/models/Team";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";

const publicUser = "firstname lastname email profileImage";

async function currentUser(req) {
  return authenticateToken(req, await cookies());
}

function response(message, status) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);

    const teams = await Team.find({ members: user._id })
      .populate("owner", publicUser)
      .populate("members", publicUser)
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, teams });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      return response("Team name must be between 2 and 80 characters", 400);
    }

    const team = await Team.create({ name, owner: user._id, members: [user._id] });
    await team.populate(["owner", { path: "members", select: publicUser }]);
    return NextResponse.json({ success: true, message: "Team created", team }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
