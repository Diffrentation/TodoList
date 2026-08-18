import crypto from "node:crypto";

export function createTeamInvitationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashTeamInvitationToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
