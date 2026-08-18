import Project from "@/models/Project";

// Project members collaborate on every task inside that project. This also
// keeps older tasks accessible after someone is added to the project.
export async function accessibleProjectIds(userId) {
  return Project.find({ members: userId }).distinct("_id");
}

export function taskOwnershipScope(userId, teamIds, projectIds = []) {
  return {
    $or: [
      { user: userId },
      {
        $and: [
          { team: { $in: teamIds } },
          {
            $or: [
              { private: { $ne: true } },
              { assignees: userId },
              { reporter: userId },
              ...(projectIds.length ? [{ project: { $in: projectIds } }] : []),
            ],
          },
        ],
      },
    ],
  };
}
