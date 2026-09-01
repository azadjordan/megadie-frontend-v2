const RISK_FLAG_LABELS = {
  same_ip_signup: "Another signup used this IP",
  multiple_same_ip_signups: "Several signups used this IP",
  same_email_domain_signup: "Another signup used this email domain",
  multiple_same_email_domain_signups: "Several signups used this email domain",
  high_same_email_domain_count: "Many signups use this email domain",
  same_browser_context_signup: "Another signup used this browser context",
  multiple_same_browser_context_signups:
    "Several signups used this browser context",
  fast_signup: "Fast form completion",
  very_fast_signup: "Very fast form completion",
  missing_client_audit: "Missing browser context",
  missing_user_agent: "Missing user agent",
  unexpected_origin: "Unexpected registration origin",
};

const RISK_LEVEL_LABELS = {
  Low: "Looks normal",
  Medium: "Review recommended",
  High: "Review carefully",
};

const LOCAL_IP_VALUES = new Set([
  "::1",
  "0:0:0:0:0:0:0:1",
  "127.0.0.1",
  "localhost",
]);

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];
const MULTIPLE_SIGNUP_COUNT = 3;
const HIGH_EMAIL_DOMAIN_COUNT = 10;
const VERY_FAST_SIGNUP_MS = 3000;
const FAST_SIGNUP_MS = 8000;

const SUPERSEDED_RISK_FLAGS = {
  multiple_same_ip_signups: ["same_ip_signup"],
  high_same_email_domain_count: [
    "same_email_domain_signup",
    "multiple_same_email_domain_signups",
  ],
  multiple_same_email_domain_signups: ["same_email_domain_signup"],
  multiple_same_browser_context_signups: ["same_browser_context_signup"],
  very_fast_signup: ["fast_signup"],
};

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

export function getRiskBadgeClasses(riskLevel) {
  if (riskLevel === "High") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (riskLevel === "Medium") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (riskLevel === "Low") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  return "bg-slate-50 text-slate-500 ring-slate-200";
}

export function getRiskFlagLabel(flag) {
  return RISK_FLAG_LABELS[flag] || flag;
}

export function getDisplayRiskFlags(audit = {}) {
  const flags = Array.isArray(audit?.riskFlags) ? [...audit.riskFlags] : [];
  const sameEmailDomainCount =
    Number(audit?.sameEmailDomainCountAtRegistration) || 0;
  const signupDurationMs = Number(audit?.signupDurationMs);

  if (sameEmailDomainCount >= HIGH_EMAIL_DOMAIN_COUNT) {
    flags.push("high_same_email_domain_count");
  }

  if (
    Number.isFinite(signupDurationMs) &&
    signupDurationMs > 0 &&
    signupDurationMs <= VERY_FAST_SIGNUP_MS
  ) {
    flags.push("very_fast_signup");
  } else if (
    Number.isFinite(signupDurationMs) &&
    signupDurationMs > 0 &&
    signupDurationMs <= FAST_SIGNUP_MS
  ) {
    flags.push("fast_signup");
  }

  const uniqueFlags = [...new Set(flags)];
  const hiddenFlags = new Set();
  uniqueFlags.forEach((flag) => {
    SUPERSEDED_RISK_FLAGS[flag]?.forEach((hiddenFlag) => {
      hiddenFlags.add(hiddenFlag);
    });
  });

  return uniqueFlags.filter((flag) => !hiddenFlags.has(flag));
}

export function formatRiskFlags(flags) {
  const displayFlags = Array.isArray(flags)
    ? getDisplayRiskFlags({ riskFlags: flags })
    : [];
  if (displayFlags.length === 0) return "No signals";
  return displayFlags.map(getRiskFlagLabel).join(", ");
}

export function formatRiskLevel(riskLevel) {
  return RISK_LEVEL_LABELS[riskLevel] || riskLevel || "Not captured";
}

export function formatDeviceSummary(audit = {}) {
  const browserName = audit?.browserName || "Unknown";
  const osName = audit?.osName || "Unknown";
  const deviceType = audit?.deviceType || "Unknown";

  if (browserName === "Unknown" && osName === "Unknown" && deviceType === "Unknown") {
    return "Not captured";
  }

  return `${browserName} on ${osName} (${deviceType})`;
}

export function formatUtmSummary(utm = {}) {
  const parts = [utm?.source, utm?.medium, utm?.campaign]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" / ") : "Not captured";
}

export function getRegistrationRiskMeta(audit) {
  const storedRiskLevel = audit?.riskLevel || "Not captured";
  const riskFlags = getDisplayRiskFlags(audit);
  const sameIpCount = Number(audit?.sameIpSignupCountAtRegistration) || 0;
  const sameEmailDomainCount =
    Number(audit?.sameEmailDomainCountAtRegistration) || 0;
  const sameBrowserContextCount =
    Number(audit?.sameBrowserContextSignupCountAtRegistration) || 0;
  const hasFastSignup =
    riskFlags.includes("fast_signup") || riskFlags.includes("very_fast_signup");
  const hasHighEmailDomainContext =
    sameEmailDomainCount >= HIGH_EMAIL_DOMAIN_COUNT && hasFastSignup;
  const ip = String(audit?.ip || "").trim();
  let riskLevel = storedRiskLevel;

  if (riskLevel === "Low" || riskLevel === "Not captured") {
    if (
      sameIpCount >= MULTIPLE_SIGNUP_COUNT ||
      sameBrowserContextCount >= MULTIPLE_SIGNUP_COUNT
    ) {
      riskLevel = "High";
    } else if (
      sameIpCount > 0 ||
      sameBrowserContextCount > 0 ||
      hasHighEmailDomainContext
    ) {
      riskLevel = "Medium";
    }
  }

  return {
    riskLevel,
    riskLabel: formatRiskLevel(riskLevel),
    riskClasses: getRiskBadgeClasses(riskLevel),
    riskTitle: riskFlags.length
      ? formatRiskFlags(riskFlags)
      : riskLevel === "Not captured"
      ? "Not captured"
      : "No signals",
    ip,
    ipLabel: formatIpAddress(ip),
    hasIp: Boolean(ip),
    sameIpCount,
    sameEmailDomainCount,
    sameBrowserContextCount,
  };
}
