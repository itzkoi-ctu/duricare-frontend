# Zone Detail and Care Log — Stitch alignment

Verified 2026-10-03 (Asia/Bangkok), using the running frontend at localhost:5173 and live backend at localhost:8386/api. Signed in as the existing OWNER test account for farm 1; all main screenshots use real zoneA data, with development overview fallback disabled (`nofixture=true`). Backend CORS preflight returned 200 with the explicit Vite origin and credentials enabled.

## Approved design downloads

Stitch project **DuriCare UX Analysis**, `13400161546656780529`:

- Care logs screen `2ed15b1d29d84ba4807d3b054e76a720`: [image](E:/CTU/LuanVan/duricare-frontend/verification/zone-detail-stitch/care-logs-approved.png), [HTML](E:/CTU/LuanVan/duricare-frontend/verification/zone-detail-stitch/care-logs-approved.html).
- Zone Detail screen `b3c4ac25d50145fbaaf4fe18bad19d5e`: [image](E:/CTU/LuanVan/duricare-frontend/verification/zone-detail-stitch/zone-detail-approved.png), [HTML](E:/CTU/LuanVan/duricare-frontend/verification/zone-detail-stitch/zone-detail-approved.html).

Both hosted images and HTML were downloaded with `curl.exe -L`. The implementation follows the approved card framing, header stat chips, segmented period control, chart cards, action icons, timeline, and desktop side-by-side entry form while retaining the app's existing shared shell and light/dark tokens. Mobile stacks the form above the timeline.

## Changes

1. Extracted `MetricChip` for Dashboard ZoneCard and Zone Detail. Both share the existing metric name/status dictionary, formatting helpers, and status colors. Zone Detail reads current metrics from the existing `OverviewContext`; it makes no extra metrics request and computes no sensor status in JavaScript. It always displays target ranges, including when a sensor has no signal. Temperature API unit `C` displays as `°C` in the shared value formatter.
2. Replaced date inputs with **Hôm nay / 24 giờ qua / 7 ngày qua**, defaulting to 24 hours. Today's start is local midnight; rolling periods subtract exactly 24/168 hours from the current instant. Existing `from`, `to`, setters, chart hook, parallel readings calls, cancellation handling, and retry flow remain. The date conversion accepts full Instants while retaining compatibility with date-only callers. The UI displays the requested interval explicitly.
3. Added a teal `ReferenceArea` at targetMin–targetMax with fill opacity 0.18 behind each line. Y domains include all observations and target bounds plus padding, including outliers outside the target range. No target values are hardcoded in production components.
4. Styled care logs as a vertical timeline with action icons, Vietnamese action labels, full notes, `performBy`, and the existing shared relative-time helper. Added a React Hook Form entry form with an action dropdown and note textarea, pending/error handling, and a close button. Successful creation refreshes the existing list and closes the form. The original care-log retrieval implementation remains.

## Real API verification

`network.json` contains the real request/response trace, recording only Bearer header presence, never tokens or cookies. Its probe delegates to the original HTTP adapter and does not mock responses or replace authentication. It is imported only by the standalone verification entry, never by the production application.

At the recorded check, each sensor API returned:

| Period | Exact requested interval | Points per chart |
| --- | --- | --- |
| Hôm nay | 2026-10-03 00:00 → 15:29 (+07) | 28 |
| 24 giờ qua | 2026-10-02 15:29 → 2026-10-03 15:29 (+07) | 154 |
| 7 ngày qua | 2026-09-26 15:29 → 2026-10-03 15:29 (+07) | 263 |

All nine range requests returned 200, included Bearer authentication, and used the exact `from`/`to` Instants reflected in the page. Every returned timestamp falls inside its requested interval. `range-results.json` records chart counts and bounds. The live sensor stream continued during verification, so current metric values and alert counts differ between some screenshots; the UI uses server values rather than frozen design-example numbers.

`overview-proof.json` confirms rendered statuses match the same zone's server overview metrics. For RA_HOA, the real soil target is **70–80%**; temperature **24–30°C**, air humidity **75–85%**. `mobile-results.json` confirms all three target paths have positive width/height and opacity 0.18. At 375px and 768px, document width equals scroll width.

### Successful care-log creation

Checked backend `CareLogController` and request DTO before implementing:

```http
POST /api/care-logs
Content-Type: application/json
Authorization: Bearer [redacted]

{"zoneId":1,"actionType":"INSPECTION","note":"Kiểm thử giao diện Zone Detail: kiểm tra gửi và làm mới nhật ký; không ghi nhận thao tác chăm sóc thực tế.","performBy":"auth-b3-owner-20261002@example.invalid"}
```

Response: **201**, new `id=2`, `zoneCode=zoneA`, `performedAt=2026-10-03T08:31:02.616245700Z`. `performedAt` defaults on the server, and `treeId` is optional. A subsequent GET returned the new row; the form closed and timeline count changed from 1 to 2. `care-submit-before.jpg` and `care-submit-after.jpg` capture this. The clearly marked verification entry remains in the local database; it does not claim actual farm work occurred.

## Screenshots

All twelve required main views were captured. Desktop images show the full chart list or timeline/form layout. Mobile images focus on the relevant content so the fixed shell does not hide the target band, notes, or submit button.

| View | 375 light | 375 dark | 1440 light | 1440 dark |
| --- | --- | --- | --- | --- |
| Sensor charts | `charts-375-light.jpg` | `charts-375-dark.jpg` | `charts-1440-light.jpg` | `charts-1440-dark.jpg` |
| Care timeline | `care-logs-375-light.jpg` | `care-logs-375-dark.jpg` | `care-logs-1440-light.jpg` | `care-logs-1440-dark.jpg` |
| Care entry form open | `care-form-375-light.jpg` | `care-form-375-dark.jpg` | `care-form-1440-light.jpg` | `care-form-1440-dark.jpg` |

Interface labels, controls, chart captions, status words, action choices, and feedback messages are Vietnamese. User-entered notes, account emails, zone codes, brand names, and measurement units remain their original data. Existing English language support is preserved through catalog additions.

## Additional checks

- `verify-range-domain.mjs`: passed exact rolling periods, local midnight, outlier domains, constant readings, and complete target bands.
- `verify-live.mjs`: passed real authenticated range refetches, server statuses, target bands, care POST 201 and subsequent list refresh, Vietnamese mobile layout.
- Explicitly simulated `states.html` / `states.tsx`: loading/error/empty chart states; an empty timeline still offers creation; safe list errors; failed save retains notes; retry succeeds and closes the form. `state-results.json` records success and verifies all fifteen status labels fit without truncation or overflowing their chips at 375px. These fixtures make no live care-log writes and are not production routes.
- `npm run build`: passed TypeScript and production bundle.
- `npm run lint`: no errors or new warnings; five existing warnings in `OverviewContext`, `useOverview`, and `useAlerts`.
- Browser errors during development hot replacement of the modified hook at 15:19 disappeared after a full reload. No errors occurred during the subsequent live verification; the final normal-route reload was also checked.
