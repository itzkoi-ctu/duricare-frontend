# Auth-F1 verification artifacts

See ../../AUTH_F1.md for scope, reproduction and limitations.

- login-375-light.jpg / login-375-dark.jpg / login-1440-light.jpg / login-1440-dark.jpg: required Login views.
- login-error.jpg: exact backend 401 message.
- login-redirect.jpg: successful navigation to /; dashboard fixture content is not authenticated-data proof (F2 is pending).
- after-f5.jpg / session-restored.jpg: real cookie restore and signed-in user, no login form.
- storage-check.jpg / storage-report.json: read-only Local/Session Storage check; token values never displayed. DevTools Application panel is unavailable in this browser.
- cross-tab-report.json / browser-proof.json / final-console.json: successful concurrent restores followed by reload, final flow evidence and clean fresh-tab console.
- session-loading.jpg / session-error.jpg / retry-report.json: loading gate, simulated network error and successful live retry.
- signed-out-after-reload.jpg: successful server logout followed by normal signed-out reload.
- session-check.html / session-check.tsx: standalone dev verification fixture, excluded from the production entrypoint.
