# Admin session timeout

Admin sessions renew during active work. They expire after 30 minutes of
inactivity or eight hours from login. A nonblocking warning appears two minutes
before expiry; **Stay signed in** renews an idle session without navigating or
resetting current form fields. At the eight-hour limit, a fresh login is required.

Real input in visible pages reports activity at most once per minute. Background
API reads and focus checks do not renew sessions. The server remains authoritative
for expiry. Customers keep their existing 30-day sessions.

Tabs synchronize session changes and confirm renewal deadlines with the server.
Returning after sleep rechecks the session. Session generations prevent late
unauthorized or logout responses from overwriting a newer login. Bootstrap uses
current query data so it cannot restore a previous profile during reauthentication.

Deploy the matching backend before the frontend, close together. Existing admins
must sign in once to establish the new session format. No environment variables,
dependencies or user/order-data migration are added.

Verification: frontend session-state tests, simulated-clock browser checks,
server-session integration tests on a disposable database, and frontend lint/build.
The backend repository's `docs/admin-sessions.md` contains the full API policy and
verification commands. General draft autosaving is outside this session change;
actual expiry requires sign-in.
