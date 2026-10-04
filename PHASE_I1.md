# Phase I-1 — Farm settings

`/settings/farm` is lazy-loaded under the existing RequireAuth and an actual
RequireRole(['ADMIN']) route. OWNER is redirected to Dashboard with the existing
authorization notice. The shared navigation list exposes “Cài đặt vườn” to ADMIN
only, in both the sidebar and mobile menu.

## Confirmed backend contract

FarmController already restricts all its methods to ADMIN. No backend change
was required. All new requests use `api/client.ts`, including its credentials,
Bearer token and refresh interceptors.

- GET `/api/farms` lists farms for explicit selection. No first-farm assumption.
- GET `/api/farms/{id}` returns `{id, name, location, area, zoneIds, latitude, longitude}`.
- PUT `/api/farms/{id}` accepts `{name, location, area, latitude, longitude}` and
  returns the updated farm in the same response shape as GET.
- `location`, `area`, `latitude`, `longitude` may be null in existing records.
  Both coordinates are editable and FarmService persists them.
- The backend does not declare an area unit in this contract; the form preserves
  the existing numeric unit instead of inventing a conversion or hectare label.

The selected farm is carried in `?farmId=` and preserved by ADMIN navigation,
including the return to Dashboard. It is never inferred from ADMIN's null farmId.

## Form behavior

React Hook Form validates trimmed name/address, positive finite area, required
finite coordinates, latitude [-90, 90] and longitude [-180, 180]. Name and address
are limited to the backend's 255-character columns. Coordinates remain manual,
with the requested Google Maps helper. No browser geolocation is used.

The page includes loading skeleton, retryable fetch error, no-farms state and an
explicit selection prompt. A failed save retains the edited values and offers
another submit. While saving, fields, farm selection and submit are disabled;
an immediate duplicate submit is also guarded in the hook. Success refreshes
overview data and shows a toast. Stale fetch/save results are ignored after farm
selection changes or unmount.

Vietnamese and English catalog entries are included, using existing theme tokens.

## Live verification — 2026-10-03

Frontend `http://localhost:5173`; existing backend `http://localhost:8386`.
PUT CORS preflight returned 200 with the explicit frontend origin and credentials.
Used the ADMIN account in the current local backend configuration; previous seed
credentials were rejected. No credentials, users or permissions were modified.

The backend currently has two farms. Farm 1 (`Vuon nha`, containing zoneA) has
`area: null`, so its form correctly requires a real area value before saving;
no guessed area was inserted. The successful live save used the fully populated
farm 3 (`Vườn sầu riêng A`):

```json
{
  "name": "Vườn sầu riêng A",
  "location": "Cần Thơ, Việt Nam",
  "area": 1000,
  "latitude": 10.0371,
  "longitude": 105.7883
}
```

- Changed its location from `Cần Thơ` to `Cần Thơ, Việt Nam`; preserved name,
  area and coordinates. PUT `/api/farms/3` returned **200** with this data.
- Success toast appeared. A fresh page load issued GET `/api/farms/3`, which
  returned **200** and the persisted address, area and coordinates.
- Dashboard link retained farmId=3. GET `/api/overview?farmId=3` returned **200**
  with the correct farm name and non-null Open-Meteo weather (26.5°C, humidity
  90%, rain probability 100%, expected 48-hour rain 30.4mm at verification time).
  Weather uses the existing backend cache; this test did not relocate the farm.
- All observed farm and overview requests included Bearer authorization; only
  a boolean presence flag is stored in the trace, never tokens or cookies.
- OWNER direct visit was redirected to `/`, and the settings link was absent.
- Live invalid submit: blank name/address, area 0, latitude 91, longitude 181
  showed all five Vietnamese errors and sent **zero PUT requests**.
- Separate synthetic fixtures verified loading, error + successful retry, empty,
  missing coordinates, negative out-of-range coordinates, inclusive upper bounds,
  and save failure preserving the form. Fixtures are not the live save proof.
- 375px and 768px: no horizontal overflow; mobile header bottom and main top
  both 136px. The saved full-page images include the complete mobile bottom nav.
- Live console: no warnings/errors, CORS failures or missing assets.
- Production build passed. Lint passed with five existing warnings in
  OverviewContext/useOverview/useAlerts and none in the new code.

Evidence is in `verification/farm-settings-phase-i1/`:

| Viewport | Light | Dark |
| --- | --- | --- |
| 375px | farm-375-light.jpg | farm-375-dark.jpg |
| 1440px | farm-1440-light.jpg | farm-1440-dark.jpg |

Additional proof: `save-success.jpg`, `dashboard-weather-after-save.jpg`,
`owner-blocked.jpg`, `validation-errors.jpg`, `network-before-reload.json`,
`network-after-reload.json`, layout JSON and explicitly synthetic state screenshots.

`live.html` uses the actual app and HTTP adapter and records only farm/overview
requests. `states.html` substitutes responses for state testing only. These
standalone verification entry points are not imported by the production app.
