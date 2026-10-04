# Phase H — reusable agent chat verification

Verified locally on 2026-10-03 against the running backend at http://localhost:8386/api and frontend at http://localhost:5173, signed in as the existing test OWNER for farm 1. No authentication implementation or backend code changed for this phase.

## Implementation

- `ChatPanel` renders the full protected `/agent` page and the compact chat inside the Dashboard's existing AI card frame. `/agent` was already in the `RequireAuth` route group.
- `useAgentChat` owns messages, loading, error handling, and request cancellation. State stays in memory per mounted panel; navigating between the compact and full panels starts a separate conversation. Reloading starts a fresh conversation. The backend contract sends only the current question, not prior conversation history.
- `api/agent.ts` uses the existing shared Axios instance and its authentication interceptors. The agent request overrides its timeout to 30 seconds; the global timeout remains 15 seconds.
- Leading `[modelUsed=...]` metadata is removed before rendering; a separate response `modelUsed` field is also supported. Captions show the provider in small muted text and keep the exact model identifier in their title.
- React Hook Form supports Enter and the send button. Suggested questions send immediately. Loading disables resubmission. Errors display a safe assistant message and offer to resend the same question.
- Assistant messages use the existing installed `react-markdown@10.1.0` dependency; no duplicate installation was necessary. New interface labels support the existing Vietnamese/English translation system.

## Live backend exchange

Question sent from both the full page and compact Dashboard panel:

> Độ ẩm đất tại zoneA hiện tại là bao nhiêu? Hãy dùng getSensorData và trả lời ngắn gọn trong 2 câu.

Both returned:

> Độ ẩm đất tại zoneA hiện tại là 87%. Các thông số khác bao gồm nhiệt độ 24°C và độ ẩm không khí 40%.

Both rendered the muted caption **Trả lời bởi Gemini**. No raw model prefix appeared in rendered chat bubbles. This confirms a real authenticated exchange; it does not independently audit the backend's internal tool invocation or sensor freshness.

## Screenshots

The four full-page chat screenshots contain the real backend exchange:

| Viewport | Light | Dark |
| --- | --- | --- |
| 375 × 900 | `agent-375-light.jpg` | `agent-375-dark.jpg` |
| 1440 × 1000 | `agent-1440-light.jpg` | `agent-1440-dark.jpg` |

Dashboard compact chat was also captured with a real exchange:

| Viewport | Light | Dark |
| --- | --- | --- |
| 375 × 900 | `dashboard-compact-375-light.jpg` | `dashboard-compact-375-dark.jpg` |
| 1440 × 1000 | `dashboard-compact-1440-light.jpg` | `dashboard-compact-1440-dark.jpg` |

375px, 768px, and 1440px layout checks found no horizontal overflow. The input remains below the scrollable full message list and above mobile navigation.

## Deterministic state checks

`states.html` / `states.tsx` are a standalone development verification fixture, not an application route or a production authentication bypass. The fixture uses an Axios adapter with explicitly simulated responses to exercise slow loading, a 503 error, retry, Markdown, DeepSeek-prefix stripping, and multiple compact exchanges without more paid LLM calls.

`state-results.json` records: all chat timeouts are 30 seconds, retry sends the identical question, Markdown bold renders, raw backend error details and raw model prefixes are absent, full history remains visible, and compact renders only the most recent two-message exchange. Supporting fixture images: `typing-fixture.jpg`, `error-fixture.jpg`, `retry-and-prefix-fixture.jpg`.

`verify-model-prefix.mjs` passed assertions for Gemini and DeepSeek prefixes, whitespace, prefix precedence, separate model fields, unprefixed answers, and stripping only a leading prefix. Run with `node verification/chat-phase-h/verify-model-prefix.mjs`.

`reload-results.json` confirms that reloading `/agent` preserves the authenticated session and returns to zero messages with the welcome suggestions. No browser errors occurred during or after the live exchange; two earlier Vite development connection errors had already cleared after reloading before the exchange.

## Build checks

- `npm run build`: passed (TypeScript and production bundle).
- `npm run lint`: no errors; five existing warnings in `OverviewContext`, `useOverview`, and `useAlerts`. No warnings in the Phase H components, hook, API, or parser.
