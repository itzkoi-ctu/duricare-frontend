# Auth-F4 — account controls in the shell

The desktop sidebar and mobile top bar share `UserAccount`. Identity comes
directly from AuthContext: email, `ADMIN` or the OWNER label `Chủ vườn`, and
`Đăng xuất`. Long emails wrap at the domain boundary. Mobile content starts
below the expanded account header and retains safe-area spacing.

`useLogout` handles the disabled/loading button and retryable error message.
AuthContext.logout uses the existing bearer + CSRF backend logout call, clears
its in-memory session on success, and redirects to `/login`. A failed logout
retains the session so server-side revocation can be retried.

Both menus now render the same navigation definitions through
`navigationForRole`. Current links have no role restriction: Tổng quan,
Cảnh báo, and Trợ lý AI remain visible to ADMIN and OWNER. Add future
management links with `roles: ['ADMIN']`; OWNER will automatically omit them
in both menus. The corresponding routes must also use RequireRole inside
RequireAuth. No unbuilt management links were introduced.

## ADMIN overview compatibility

The backend requires an explicit farmId for ADMIN overview requests. The API
and overview hook now support `?farmId=1` (or another positive farm id). OWNER
continues to rely on backend farm scoping, ignoring this parameter. ADMIN
without a selected farm sees a clear selection-required message; no farm is
guessed and no fabricated overview is substituted for that missing selection.
The full farm-selection UI remains future work. This addition made the ADMIN
shell verification use actual backend data rather than the old dev fixture.

## Live verification — 2026-10-02

Vite origin `http://localhost:5173`; backend `http://localhost:6767`.
CORS preflight returned 200 with that explicit origin and credentials allowed.
Used the existing seeded OWNER (farm 1) and ADMIN accounts.

- OWNER `/?nofixture=true`: email, Chủ vườn, logout, all three links.
- ADMIN `/?farmId=1&nofixture=true`: email, ADMIN, logout, all three links;
  real Vuon nha overview loaded.
- OWNER logout from the mobile top bar returned to `/login`; reload remained
  signed out with no account controls. Screenshot: `logout-login.jpg`.
- ADMIN logout also returned to the login form: `admin-logout-login.jpg`.
- Both roles: 375px and 1440px, light and dark. Screenshots below.
- 768px: no horizontal overflow; header bottom and main top both 136px.
- Both role consoles: no warnings/errors, CORS errors, or 404s.
- Production build passed; lint has zero errors and eight existing warnings
  in unrelated OverviewContext/useOverview/useAlerts/AgentPage code.

Screenshots in `verification/auth-f4/`:

| Role | 375 light | 375 dark | 1440 light | 1440 dark |
| --- | --- | --- | --- | --- |
| OWNER | owner-375-light.jpg | owner-375-dark.jpg | owner-1440-light.jpg | owner-1440-dark.jpg |
| ADMIN | admin-375-light.jpg | admin-375-dark.jpg | admin-1440-light.jpg | admin-1440-dark.jpg |

All access tokens remain in the existing AuthContext memory state. No new
token persistence, auth endpoint, or backend authorization change was added.
