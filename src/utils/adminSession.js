export const ADMIN_SESSION_WARNING_MS = 2 * 60 * 1000;
export const ADMIN_ACTIVITY_INTERVAL_MS = 60 * 1000;

// Use remaining server time so a workstation with an incorrect clock still
// gets the right deadline. The backend remains authoritative for every request.
export function getAdminSessionDeadline(profile, now = Date.now()) {
  if (!profile?.isAdmin) return null;
  const { sessionExpiresAt, sessionServerTime, sessionAbsoluteExpiresAt, sessionId } = profile;
  if (!sessionId || ![sessionExpiresAt, sessionServerTime, sessionAbsoluteExpiresAt].every(Number.isFinite) || sessionExpiresAt > sessionAbsoluteExpiresAt) return now;
  return now + Math.max(0, sessionExpiresAt - sessionServerTime);
}

export function getAdminAbsoluteDeadline(profile, now = Date.now()) {
  if (!profile?.isAdmin) return null;
  if (!Number.isFinite(profile.sessionAbsoluteExpiresAt) || !Number.isFinite(profile.sessionServerTime)) return now;
  return now + Math.max(0, profile.sessionAbsoluteExpiresAt - profile.sessionServerTime);
}
