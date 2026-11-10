const CHANNEL = "megadie.admin-session.v2";
let channel;
const getChannel = () => {
  if (typeof window === "undefined" || !window.BroadcastChannel) return null;
  try { return channel ||= new window.BroadcastChannel(CHANNEL); } catch { return null; }
};

// Only non-secret session identifiers and events cross tabs, never tokens.
export function publishSessionEvent(event) {
  if (typeof window === "undefined") return;
  const message = { ...event, messageId: `${Date.now()}-${Math.random()}` };
  try { getChannel()?.postMessage(message); } catch { /* Storage fallback below. */ }
  try { window.localStorage.setItem(CHANNEL, JSON.stringify(message)); } catch { /* Storage can be disabled. */ }
}

export function subscribeSessionEvents(onEvent) {
  const seen = new Set();
  const receive = (value) => {
    if (!value || !["login", "logout", "expired", "renewed"].includes(value.type) || typeof value.sessionId !== "string" || value.sessionId.length > 128 || typeof value.messageId !== "string" || seen.has(value.messageId)) return;
    seen.add(value.messageId);
    if (seen.size > 64) seen.delete(seen.values().next().value);
    onEvent(value);
  };
  const broadcast = (event) => receive(event.data);
  const storage = (event) => {
    if (event.key !== CHANNEL || !event.newValue || event.newValue.length > 2048) return;
    try { receive(JSON.parse(event.newValue)); } catch { /* Invalid message. */ }
  };
  const bc = getChannel();
  bc?.addEventListener("message", broadcast);
  window.addEventListener("storage", storage);
  return () => { bc?.removeEventListener("message", broadcast); window.removeEventListener("storage", storage); };
}
