# Auth-F1: authentication foundation

Implemented following duricare-frontend-skill.md (Downloads) and the repository's .agents/skills/ai-agent/SKILL.md conventions: strict TypeScript, existing theme tokens, mobile-first Tailwind, React Hook Form, lazy route and Axios.

## Implementation

- src/types/auth.ts defines User, LoginRequest/LoginResponse and context contracts.
- src/api/client.ts globally enables withCredentials; no authentication interceptor is introduced.
- src/api/auth.ts implements login, refresh, logout, getMe and getCsrfToken. Bearer headers are passed explicitly only to me/logout.
- src/hooks/useAuthSession.ts owns session state and restore/retry/login/logout logic; AuthProvider is in src/contexts/AuthContext.tsx. Consumers import useAuth from src/hooks/useAuth.ts.
- Access token and user are held in React state only. No authentication data is written to Local Storage or Session Storage, nor put into global Axios default headers.
- Initial restore fetches CSRF, rotates the refresh cookie, then fetches me using the returned access token. HTTP 401 is an ordinary signed-out result with no error banner. Network/other failures show a full-screen error and Retry. SessionGate shows only a full-screen spinner while identity is unknown.
- StrictMode shares the in-flight restore promise and refresh request. Web Locks additionally serializes cookie rotation across tabs on the same frontend origin; testing uncovered a race when Vite reloaded a background tab. Browsers without Web Locks retain only the per-tab single-flight guard. This is bootstrap coordination, not the F2 request interceptor.
- /login is outside Shell/OverviewProvider, so it does not request protected dashboard data. OverviewProvider still wraps all existing Shell routes. Existing routes remain accessible as before; route protection belongs to F3.
- React Hook Form validates email/required password, disables submit while awaiting login, and displays the backend's message unchanged on 401. Success redirects to /. Visiting /login while authenticated shows a signed-in confirmation, email and logout action, useful for verifying the foundation without F2/F3.

## CSRF and deployment

The backend uses CookieCsrfTokenRepository: cookie XSRF-TOKEN, header X-XSRF-TOKEN. document.cookie is insufficient for unrelated Vercel/VPS origins because JavaScript cannot read the backend origin's cookies. getCsrfToken therefore calls GET /auth/csrf, reads JSON token, and echoes it in the header. Every auth request uses the credentials-enabled shared Axios client. The backend also provides the token on login, but a fresh bootstrap request avoids relying on cookie visibility.

VITE_API_BASE_URL remains env-driven. Production backend needs AUTH_COOKIE_SAME_SITE=None, HTTPS/Secure cookies and CORS_ALLOWED_ORIGINS set to the exact frontend origin. No backend security changes were made in F1. CORS preflight to the live backend returned HTTP 200, Access-Control-Allow-Origin: http://localhost:5173 and Access-Control-Allow-Credentials: true.

## Browser verification, 2026-10-02

Live backend: http://localhost:6767/api. Frontend: http://localhost:5173/login. Seeded test administrator credentials were read from the ignored backend runtime settings; no password, access token, refresh cookie or token hash is included in these artifacts.

1. Captured 375px light/dark and 1440px light/dark Login screenshots; checked the actual theme control flips the html class and sun/moon convention. Tablet layout also checked at 768px.
2. First visit without a refresh cookie showed the normal Login form without a restore-error message.
3. Bad credentials displayed the real backend message: Sai email hoặc mật khẩu.
4. Seeded admin login succeeded and navigated to /. Existing dashboard requests have no Bearer interceptor until F2; its development fixture fallback is not evidence of authenticated dashboard data. The redirect screenshot records navigation only.
5. Returned to /login and reloaded the browser. The signed-in confirmation and seeded email appeared with no password/login form. This exercises real cookie rotation plus /me.
6. Read-only storage probe: Local Storage keys were theme_mode and theme; Session Storage was empty; hasStoredToken=false; accessTokenInMemory=true; withCredentials=true. No token values are displayed. The Codex browser exposes no DevTools Application panel (F12 did not open one), so this check was made using the same-origin read-only verification page rather than claiming a DevTools screenshot.
7. Probe under StrictMode recorded exactly csrf=1, refresh=1, me=1. The loading fixture pauses only the CSRF request and demonstrates the full-screen bootstrap gate. The error fixture fails its first CSRF request, then Retry successfully restores against the real backend (csrf=2, refresh=1, me=1).
8. Logout succeeded; subsequent browser reload displayed the normal signed-out form with no session error.
   After adding the cross-tab lock, two simultaneous restores both authenticated, and another reload plus subsequent rotations still succeeded. See cross-tab-report.json. The test account was logged out after verification.
9. Final fresh-tab console contains no warnings/errors after resolving a Windows case-insensitive module-name collision and restarting Vite to clear its old module path. Initial signed-out refresh and bad login intentionally return 401. Build passes; lint has only existing warnings in older Overview/Alerts/Agent code.

The verification fixture is under verification/auth-f1/session-check.html and uses the real provider/hooks; it is not imported by the app or emitted into the production build. It prints only storage keys, booleans, request counts and test-user email. Run it via the Vite dev server. `?mode=loading` adds a verification-only release button; `?mode=error` simulates one network failure. Production routes have no such controls.

Screenshots and JSON proof: verification/auth-f1/. F2 interceptors, F3 route protection and later auth navigation remain separate phases.
