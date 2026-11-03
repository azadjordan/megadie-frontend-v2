import test from "node:test";
import assert from "node:assert/strict";
import { getAdminSessionDeadline } from "./adminSession.js";
import authReducer, { setCredentials, logout, setSessionCheckFailed } from "../features/auth/authSlice.js";

const admin = { _id: "admin", isAdmin: true, sessionServerTime: 1000000, sessionExpiresAt: 2200000 };

test("admin deadline uses server remaining time despite client clock skew", () => {
  assert.equal(getAdminSessionDeadline(admin, 9000000), 10200000);
  assert.equal(getAdminSessionDeadline({ ...admin, sessionServerTime: 2080000 }, 9000000), 9120000);
  assert.equal(getAdminSessionDeadline({ ...admin, sessionServerTime: 2200001 }, 9000000), 9000000);
});

test("customers have no admin timer and incomplete admin metadata fails closed", () => {
  assert.equal(getAdminSessionDeadline({ isAdmin: false }, 123), null);
  for (const profile of [{ isAdmin: true }, { ...admin, sessionExpiresAt: null }, { ...admin, sessionServerTime: NaN }]) {
    assert.equal(getAdminSessionDeadline(profile, 123), 123);
  }
});

test("profile updates keep the deadline while fresh logins replace it and logout clears it", (t) => {
  let now = 5000000;
  t.mock.method(Date, "now", () => now);
  let state = authReducer(undefined, setCredentials(admin));
  const deadline = state.adminSessionDeadline;
  now += 100000;
  state = authReducer(state, setCredentials({ ...admin, name: "Edited", sessionServerTime: 1100000 }));
  assert.equal(state.adminSessionDeadline, deadline);
  state = authReducer(state, setCredentials({ ...admin, sessionServerTime: 1100000, sessionExpiresAt: 2300000 }));
  assert.equal(state.adminSessionDeadline, now + 1200000);
  assert.equal(authReducer(state, logout()).adminSessionDeadline, null);
  assert.equal(authReducer(state, setSessionCheckFailed()).adminSessionDeadline, null);
  assert.equal(authReducer(state, setCredentials({ _id: "client", isAdmin: false })).adminSessionDeadline, null);
});
