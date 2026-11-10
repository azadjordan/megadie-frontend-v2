import test from "node:test";
import assert from "node:assert/strict";
import { getAdminSessionDeadline, getAdminAbsoluteDeadline } from "./adminSession.js";
import authReducer, { setCredentials, updateAdminSession, logout, setSessionCheckFailed } from "../features/auth/authSlice.js";

const admin = { _id: "admin", isAdmin: true, sessionId: "session-A", sessionServerTime: 1000000, sessionExpiresAt: 2800000, sessionAbsoluteExpiresAt: 29800000 };

test("admin deadlines use remaining server time despite client clock skew", () => {
  assert.equal(getAdminSessionDeadline(admin, 9000000), 10800000);
  assert.equal(getAdminAbsoluteDeadline(admin, 9000000), 37800000);
  assert.equal(getAdminSessionDeadline({ ...admin, sessionServerTime: 2800001 }, 9000000), 9000000);
});

test("customers have no admin timer and incomplete metadata fails closed", () => {
  assert.equal(getAdminSessionDeadline({ isAdmin: false }, 123), null);
  for (const profile of [{ isAdmin: true }, { ...admin, sessionId: null }, { ...admin, sessionExpiresAt: null }, { ...admin, sessionServerTime: NaN }, { ...admin, sessionAbsoluteExpiresAt: undefined }]) assert.equal(getAdminSessionDeadline(profile, 123), 123);
});

test("renewal moves only the idle deadline and stale responses cannot reverse it", (t) => {
  let now = 5000000;
  t.mock.method(Date, "now", () => now);
  let state = authReducer(undefined, setCredentials(admin));
  const absolute = state.adminAbsoluteDeadline;
  const generation = state.sessionGeneration;
  now += 600000;
  const metadata = { ...admin, sessionServerTime: admin.sessionServerTime + 600000, sessionExpiresAt: admin.sessionExpiresAt + 600000 };
  state = authReducer(state, updateAdminSession({ expectedSessionId: admin.sessionId, metadata }));
  assert.equal(state.adminSessionDeadline, 7400000);
  assert.equal(state.adminAbsoluteDeadline, absolute);
  assert.equal(state.sessionGeneration, generation);
  const renewed = state;
  state = authReducer(state, updateAdminSession({ expectedSessionId: admin.sessionId, metadata: admin }));
  assert.deepEqual(state, renewed);
});

test("profile edits keep metadata monotonic, and old sessions cannot modify newer logins", (t) => {
  t.mock.method(Date, "now", () => 5000000);
  let state = authReducer(undefined, setCredentials(admin));
  const deadline = state.adminSessionDeadline;
  state = authReducer(state, setCredentials({ ...admin, name: "Edited", sessionServerTime: 1100000 }, "profile"));
  assert.ok(state.adminSessionDeadline <= deadline);
  assert.equal(state.userInfo.name, "Edited");
  const newer = { ...admin, sessionId: "session-B" };
  state = authReducer(state, setCredentials(newer));
  const snapshot = state;
  assert.deepEqual(authReducer(state, updateAdminSession({ expectedSessionId: "session-A", metadata: admin })), snapshot);
  assert.deepEqual(authReducer(state, logout({ expectedSessionId: "session-A" })), snapshot);
  assert.deepEqual(authReducer(state, setCredentials(admin, "profile")), snapshot);
  assert.equal(authReducer(state, logout()).adminSessionDeadline, null);
  assert.equal(authReducer(state, setSessionCheckFailed()).adminAbsoluteDeadline, null);
});
