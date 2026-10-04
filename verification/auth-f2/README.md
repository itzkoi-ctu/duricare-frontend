# Auth-F2 live proof

See ../../AUTH_F2.md for implementation and reproduction.

- single-recovery.json/jpg: real 401 -> refresh 200 -> retry 200.
- concurrent-recovery.json/jpg: three real 401s, exactly one refresh, three successful retries.
- recovery-375-light.jpg / recovery-375-dark.jpg / recovery-1440-light.jpg / recovery-1440-dark.jpg: responsive/theme proof of the redacted network trace.
- invalid-refresh.json/jpg: refresh 401, no retry, user/token cleared and Login shown.
- dashboard-live.jpg: existing Dashboard loads real farm-scoped data using automatic Bearer authentication.
- check.html/check.tsx: dev-only verification entrypoint, not imported into production. Does not record tokens or cookie values.

Screenshots use an actual Axios-adapter network trace; this browser has no DevTools Network panel. JSON assertions confirmed exactly one refresh per scenario and three HTTP 200 retries for concurrency.
