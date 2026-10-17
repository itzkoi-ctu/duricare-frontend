# EXPERT Phase 1A — frontend verification

All status screenshots below come from real, isolated pilot-account logins against the running Spring backend and PostgreSQL. No operational navigation or operational API requests were exposed.

| Status | 375 light | 375 dark | 1440 light | 1440 dark |
|---|---|---|---|---|
| Chờ xác minh | [Image](pending-375-light.png) | [Image](pending-375-dark.png) | [Image](pending-1440-light.png) | [Image](pending-1440-dark.png) |
| Đã xác minh | [Image](verified-375-light.png) | [Image](verified-375-dark.png) | [Image](verified-1440-light.png) | [Image](verified-1440-dark.png) |
| Tạm đình chỉ | [Image](suspended-375-light.png) | [Image](suspended-375-dark.png) | [Image](suspended-1440-light.png) | [Image](suspended-1440-dark.png) |

[Forbidden redirect notice](redirect-forbidden.png). [Browser checks and request statuses](browser-report.json).

The existing fixed mobile navigation is captured at its viewport position in full-page images; the page can scroll to the contribution-next-phase notice.

Loading, error/retry, and empty presentation were also asserted using temporary browser response overrides, then recovered to the real API. The backend denies a missing profile with 403. These overrides do not supply the account-status screenshots.

[Build](build.log) succeeded. [Lint](lint.log) reports only pre-existing warnings. [Six navigation tests](navigation-tests.log) passed, including safe return destinations, role-aware fallback, no loop, and role-filtered menus.

No token/password was stored in localStorage or sessionStorage. Theme preference uses the existing theme storage.

Backend permission matrix, exact file inventory, schema instructions, named JUnit results, HTTP evidence and limitations: [full report](../../../../duricare-backend/DuriCare/verification/expert-phase1a/README.md).
