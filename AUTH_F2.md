# Auth-F2: shared Axios authentication

The existing shared Axios instance now authenticates every API module using it (zones and sensor readings, alerts, overview, agent, care logs and auth). No resource module needs to supply a token manually. withCredentials remains enabled globally.

## Session ownership and recovery

AuthProvider continues to own the single memory-only LoginResponse state. authSessionBridge stores callbacks, not a token/user. useAuthSession registers a getter and guarded update/invalidate operations. Its ref points at the same session object as React state so an interceptor can immediately read a replacement token before the next React render. There is no second token store, Local Storage/session persistence, or Axios default-header token.

The request interceptor attaches Bearer authentication when a token exists, preserving explicitly supplied headers (needed for the bootstrap /me request before session state exists). Public login/refresh/CSRF calls do not inherit a stale Bearer. Unsafe refresh/logout requests get X-XSRF-TOKEN from the established GET /auth/csrf mechanism if the caller did not already supply it. Both auth cookies travel via withCredentials.

A protected request receiving 401 is marked for exactly one retry. Concurrent 401s share one recovery promise, which invokes F1's refresh helper (including its per-tab single-flight and cross-tab Web Lock), updates AuthProvider and retries original request configuration with the new Bearer. A late 401 from an older token reuses the already-replaced token rather than rotating again. Login, refresh and CSRF bootstrap are excluded to prevent recursive recovery/deadlocks. 403, validation failures and other status codes do not initiate token refresh.

If refresh returns 401, the provider clears user/token and navigates to /login; each waiting caller receives its own original request error. If a retried request also returns 401, it fails closed without another refresh. Guarded updates/invalidation prevent late results for an old session from overwriting or clearing a newer login. Transient refresh failures other than 401 propagate the original request error while retaining the session. No-token calls do not start a second restore after bootstrap has already decided the user is signed out.

Redirect on failed recovery is part of F2. General anonymous-route and role protection remain F3. ADMIN overview still requires farmId per the backend contract; farm-selection UI is not introduced here. OWNER overview uses the owner's farm automatically.

## Live verification, 2026-10-02

Backend http://localhost:6767/api, Vite http://localhost:5173. CORS preflight confirmed explicit Vite origin, credential permission and Authorization allowed. Build passes; lint has only existing Overview/Alerts/Agent warnings.

The dev-only verification entrypoint uses the real AuthProvider, shared Axios instance, auth helper and existing resource API modules. It corrupts the context's in-memory token through the same registered setter (never a duplicate token store). A wrapper around the normal Axios adapter records only method/path/status/header-presence/retry booleans; all network traffic still goes to the real backend, with no mocked HTTP response. Tokens, cookie values, credentials and response data are never recorded.

| Test | Live result |
|---|---|
| One request with corrupted access token | GET alerts 401; CSRF GET 200; ONE refresh POST 200; original alerts retry 200; authenticated user retained |
| Three simultaneous requests | Alerts, zones and overview all 401; ONE refresh POST 200; all three retries 200; user sees Recovered without an error |
| Invalid refresh cookie/session | First revoke/clear cookie with real logout while retaining context for simulation; alerts 401; ONE refresh POST 401; no protected retry; route /login; User:null and Token:null |
| Real Dashboard | Fresh OWNER login loaded Vuon nha, zoneA and two alerts from the protected live overview, replacing the old development fixture fallback |

See verification/auth-f2/ JSON files for exact request ordering and screenshots at 375/1440px in light/dark. The available Codex browser does not expose DevTools Network, so screenshots show the redacted actual-adapter trace rather than claiming a DevTools capture. Initial signed-out restore and deliberate corruption intentionally generate 401; no CORS/404/TypeScript errors are part of these scenarios.

## Reproduce

1. Run npm run dev and open /verification/auth-f2/check.html on port 5173 (the configured CORS origin).
2. Use its Login link and sign in as an OWNER with an assigned farm. Credentials are not included in this repository.
3. Click Corrupt token: one request. Confirm four trace rows, one refresh POST, recovered status and authenticated=true.
4. Click Corrupt token: three requests. Confirm three initial 401s, one refresh POST, three retries with 200. The action clears earlier trace rows before starting.
5. Click Revoke cookie and request. This actually revokes the test login session through the backend. Confirm /login, User:null/Token:null, one failed refresh and no retry.
6. In a normal browser's DevTools Network, enable Preserve log, clear the log before each action and filter auth/refresh to inspect the same traffic. Successful recovery count must be one. No debug action or tracing adapter is imported into the production entrypoint.

The F1 verification entrypoint now includes BrowserRouter because session invalidation uses React Router navigation. No backend configuration or auth protocol changed.

Vite's watcher ignores verification JPEG/PNG/JSON/Markdown output so saving evidence does not reload the page and rotate its refresh cookie. Verification source files remain watched. Screenshots were visually checked at the actual requested widths after the viewport settled.
