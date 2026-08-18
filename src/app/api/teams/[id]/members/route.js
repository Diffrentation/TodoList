import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Team from "@/models/Team";
import User from "@/models/User";
import TeamInvitation from "@/models/TeamInvitation";
import { authenticateToken } from "@/lib/middleware/auth";
import { errorHandler } from "@/lib/middleware/errorHandler";
import { isObjectId } from "@/lib/task-data";
import { createTeamInvitationToken, hashTeamInvitationToken } from "@/lib/team-invitations";
import { sendTeamInvitationEmail } from "@/lib/email";
import { syncTeamMemberWork } from "@/lib/team-work";

const publicUser = "firstname lastname email profileImage";

async function currentUser(req) {
  return authenticateToken(req, await cookies());
}

function response(message, status) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req, { params }) {
  try {
    await connectDB();
    const { user, error } = await currentUser(req);
    if (error || !user) return response(error || "Unauthorized", 401);
    const { id } = await params;
    if (!isObjectId(id)) return response("Invalid team ID", 400);

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return response("Email is required", 400);

    const team = await Team.findOne({ _id: id, owner: user._id });
    if (!team) return response("Team not found", 404);

    const invitee = await User.findOne({ email });
    if (!invitee) {
      const token = createTeamInvitationToken();
      await TeamInvitation.deleteMany({ team: team._id, email, status: "pending" });
      const invitation = await TeamInvitation.create({
        team: team._id,
        email,
        invitedBy: user._id,
        tokenHash: hashTeamInvitationToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const inviteUrl = `${origin.replace(/\/$/, "")}/auth/signup?invite=${encodeURIComponent(token)}`;
      const emailResult = await sendTeamInvitationEmail({
        email,
        teamName: team.name,
        inviterName: `${user.firstname} ${user.lastname}`.trim() || "A teammate",
        inviteUrl,
      });

      if (!emailResult.success) {
        await TeamInvitation.deleteOne({ _id: invitation._id });
        return response("We could not send the invitation email. Please try again shortly.", 502);
      }

      return NextResponse.json({
        success: true,
        message: "Invitation sent. Your teammate can use the email link to join this team.",
      });
    }

    if (!invitee.isVerified) {
      return response("This person has an account but has not verified their email yet. Ask them to complete verification, then invite them again.", 400);
    }
    if (team.members.some((memberId) => String(memberId) === String(invitee._id))) {
      await syncTeamMemberWork(team._id, invitee._id);
      return NextResponse.json({
        success: true,
        message: "That person is already on the team. Their project and task access has been synchronized.",
      });
    }

    team.members.push(invitee._id);
    await team.save();
    await syncTeamMemberWork(team._id, invitee._id);
    await team.populate(["owner", { path: "members", select: publicUser }]);

    return NextResponse.json({ success: true, message: "Member added to the team and its existing projects", team });
  } catch (error) {
    return errorHandler(error);
  }
}
