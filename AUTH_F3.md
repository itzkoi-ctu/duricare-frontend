# Auth-F3: route protection

All application routes (Dashboard, zone detail, alerts, agent, and the shell's
404 page) now sit inside `RequireAuth`. `/login` remains public, with
`LoginRoute` redirecting an existing authenticated session to `/`.

`SessionLoading` is shared by the bootstrap gate and both guards. The existing
session-restore error and retry screen remains intact. A signed-out session is
an ordinary state: protected routes redirect to the login form without mounting
the overview provider or fetching protected page data.

`RequireAuth` preserves pathname, query, and fragment in `location.state.from`.
Login reads that destination and replaces the login history entry. Only local
app paths are accepted; external URLs, protocol-relative URLs, backslashes,
control characters, and a return to `/login` are rejected. F2's session
invalidation redirect also preserves the requested URL.

`RequireRole` accepts a readonly list of ADMIN/OWNER roles and supports children
or an Outlet. Role denial redirects to `/` with an accessible, dismissible
message: “Bạn không có quyền truy cập trang này”. The notice disappears after
eight seconds and clears its navigation state. AppRoutes contains the nesting
example for future ADMIN management forms inside RequireAuth. Frontend guards
complement the existing backend authorization; they do not replace it.

## Live verification — 2026-10-02

Used Vite `http://localhost:5173` and the existing local Spring Boot backend
`http://localhost:6767`, with the previously seeded OWNER for farm 1. No new
credentials or token store were introduced.

| Check | Observed result |
| --- | --- |
| CORS preflight | 200, explicit origin `http://localhost:5173`, allow-credentials true |
| Signed-out direct `/zones/zoneA` | Redirected to `/login`; login form visible |
| Login from that redirect | Returned to `/zones/zoneA`; Khu A and real sensor charts loaded |
| Authenticated direct `/login` | Redirected to `/`; no login form |
| OWNER visits temporary `/__verify/admin` wrapped in RequireRole ADMIN | Redirected to `/`; required notice visible; ADMIN content absent |
| Session restore failure | Existing error/retry screen visible while backend was unavailable; retry succeeded after backend startup |
| Session restore loading | Full-screen session check visible on reload; protected zone content appeared only after restore completed |
| Responsive/themes | Login and authenticated zone captured at 375 and 1440, light and dark; tablet layout inspected at 768 |

The temporary ADMIN route and its verification link were removed after the
test. They are absent from the final route configuration. Screenshots retain
the temporary link only in the role-denial proof.

## Evidence

Images are in `verification/auth-f3/`:

- `login-375-light.jpg`, `login-375-dark.jpg`
- `login-1440-light.jpg`, `login-1440-dark.jpg`
- `zone-375-light.jpg`, `zone-375-dark.jpg`
- `zone-1440-light.jpg`, `zone-1440-dark.jpg`
- `owner-denied-375-light.jpg`
- `restore-error.jpg`
- `session-loading.jpg`, `zone-768-light.jpg`
- `results.json` (no tokens or credentials)

Run `npm run build` and `npm run lint` for local checks. Existing unrelated lint
warnings in OverviewContext/useOverview/useAlerts/AgentPage remain unchanged.
Final production build passed; lint reported zero errors and eight existing
warnings. The final zone page console contained no warnings or errors; at 768px,
document width and scroll width were both 768px (no horizontal overflow).
