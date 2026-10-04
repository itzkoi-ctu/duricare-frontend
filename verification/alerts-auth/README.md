# Alerts authentication regression check — 2026-10-02

No production code fix was needed. `src/api/alerts.ts` already imports the
default client from `./client`; getUnresolvedAlerts, getAlerts and resolveAlert
all use it. useAlerts imports those functions; AlertsPage/AlertCard contain
no raw fetch or separate axios instance.

Logged in with the existing OWNER account and clicked the sidebar Cảnh báo
link to navigate to the actual `/alerts` page. The live backend returned two
unresolved alerts (one HARD and one AGENTIC). Console: no warnings/errors.

`network.json` records the actual shared Axios adapter requests after its
request interceptors ran:

```text
GET http://localhost:6767/api/alerts?resolved=false
Authorization: Bearer [redacted]
HTTP 200
```

Both development StrictMode initial GETs returned 200 with Bearer authorization;
no 401 occurred. No alerts were resolved or changed during this check.

The trace is an Axios adapter capture, not a DevTools screenshot. The original
network adapter executed the real requests; only status and header presence
were recorded. Raw tokens/cookies were never saved. `network.ts` is a
verification-only probe; its temporary index.html script tag was removed after
capture. It is not imported by the production app.

Evidence: `alerts-with-network-trace.jpg`, `alerts-page.jpg`, `network.json`.
