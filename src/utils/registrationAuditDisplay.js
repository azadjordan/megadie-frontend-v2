const LOCAL_IP_VALUES = new Set([
  "::1",
  "0:0:0:0:0:0:0:1",
  "127.0.0.1",
  "localhost",
]);

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];

export function isLocalIpAddress(value) {
  const ip = String(value ?? "").trim().toLowerCase();
  return LOCAL_IP_VALUES.has(ip) || ip.startsWith("::ffff:127.");
}

export function formatIpAddress(value) {
  const ip = String(value ?? "").trim();
  if (!ip) return "Not captured";
  return isLocalIpAddress(ip) ? `${ip} (local test)` : ip;
}

export function hasUtmValues(utm = {}) {
  return UTM_KEYS.some((key) => String(utm?.[key] || "").trim());
}

export function formatSignupDuration(value) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0) return "Not captured";
  if (duration < 1000) return `${Math.round(duration)} ms`;
  return `${(duration / 1000).toFixed(1)} sec`;
}

export function formatUtmSummary(utm = {}) {
  const parts = [utm?.source, utm?.medium, utm?.campaign]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" / ") : "Not captured";
}

export function getRegistrationEvidenceMeta(audit = {}) {
  const ip = String(audit?.ip || "").trim();
  const emailDomain = String(audit?.emailDomain || "").trim();
  const sameIpCount = Number(audit?.sameIpSignupCountAtRegistration) || 0;
  const sameEmailDomainCount =
    Number(audit?.sameEmailDomainCountAtRegistration) || 0;
  const sameBrowserContextCount =
    Number(audit?.sameBrowserContextSignupCountAtRegistration) || 0;
  const signupDuration = formatSignupDuration(audit?.signupDurationMs);
  const hasSignupDuration = signupDuration !== "Not captured";
  const hasAudit = Boolean(
    audit &&
      (audit.capturedAt ||
        ip ||
        audit.userAgent ||
        emailDomain ||
        audit.timezone ||
        audit.landingPath ||
        hasSignupDuration ||
        sameIpCount ||
        sameEmailDomainCount ||
        sameBrowserContextCount)
  );

  return {
    hasAudit,
    ip,
    ipLabel: formatIpAddress(ip),
    hasIp: Boolean(ip),
    emailDomain,
    sameIpCount,
    sameEmailDomainCount,
    sameBrowserContextCount,
    signupDuration,
    hasSignupDuration,
  };
}
