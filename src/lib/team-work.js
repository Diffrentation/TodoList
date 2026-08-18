import Project from "@/models/Project";
import Task from "@/models/Task";
import TeamInvitation from "@/models/TeamInvitation";

// A team owner explicitly adds/invites a person. At that point, grant the
// person access to the team's existing projects and their tasks as well.
export async function syncTeamMemberWork(teamId, userId) {
  await Promise.all([
    Project.updateMany({ team: teamId }, { $addToSet: { members: userId } }),
    Task.updateMany({ team: teamId }, { $addToSet: { assignees: userId } }),
  ]);
}

// Backfill invitations accepted before project/task synchronisation existed.
// It only processes records created from an owner-approved invitation.
export async function syncAcceptedInvitationWork(userId) {
  const invitations = await TeamInvitation.find({
    acceptedBy: userId,
    status: "accepted",
    workSyncedAt: null,
  }).select("_id team");

  for (const invitation of invitations) {
    await syncTeamMemberWork(invitation.team, userId);
    invitation.workSyncedAt = new Date();
    await invitation.save();
  }
}
