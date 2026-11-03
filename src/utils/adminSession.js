export const ADMIN_SESSION_WARNING_MS = 2 * 60 * 1000;

// Use remaining server time so a workstation with an incorrect clock still
// gets the right deadline. The backend remains authoritative for every request.
export function getAdminSessionDeadline(profile, now = Date.now()) {
  if (!profile?.isAdmin) return null;
  const { sessionExpiresAt, sessionServerTime } = profile;
  if (!Number.isFinite(sessionExpiresAt) || !Number.isFinite(sessionServerTime)) return now;
  return now + Math.max(0, sessionExpiresAt - sessionServerTime);
}
