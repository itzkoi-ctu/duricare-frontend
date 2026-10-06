# Chat timeout regression — 2026-10-06

## Diagnosis and change

The supplied backend log starts at 12:59:09.653Z and is still selecting tools at
12:59:38.264Z (28.611 seconds later). It does not include the response completion
or browser Network failure, so it cannot independently prove the original error
was a timeout. The existing frontend had a confirmed 30,000 ms timeout specifically
on POST /agent/ask, which is too short for some sequential LLM/tool calls.

- `src/api/agent.ts`: chat timeout 30,000 -> 90,000 ms.
- `src/hooks/useAgentChat.ts`: distinguish Axios ECONNABORTED/ETIMEDOUT from other
  failures; keep manual retry and cancellation. No automatic timeout retry.
- `src/i18n/locales/{vi,en}/translation.json`: translate the timeout message.
- `scripts/verify-agent-timeout.mjs`: transport regression checks against a local
  HTTP server. These checks use synthetic replies, not LLM accuracy evidence.

Shared API timeout remains 15,000 ms; Bearer/CSRF/refresh interceptors are unchanged.
Backend code and deployment configuration are unchanged.

## Verification

`npm run build`: PASS.

`npm run lint`: exit 0; existing warnings in OverviewContext, useOverview and
useAlerts. No warnings in the changed production files.

`node scripts/verify-agent-timeout.mjs` (outside the network-restricted sandbox):

```text
{"check":"reply after 30 seconds","elapsedMs":31033,"chatTimeoutMs":90000,"sharedTimeoutMs":15000,"prefixStripped":true,"bearerAttached":true,"result":"PASS"}
PASS: unmount/user cancellation remains supported
```

The script compiles the actual API/client modules for Node, changing only import
paths and Vite's environment expression. It deletes its temporary compiled modules.

Live browser: http://localhost:5173/agent, actual API configured to
https://duricare.koictu.id.vn/api. Sent `Khu zoneA có cần tưới không?` through the
logged-in UI. Loading indicator was visible, then the assistant reply appeared:

```text
Hiện tại, khu vực zoneA (giai đoạn phát triển trái) không cần tưới thêm nước.
Độ ẩm đất hiện tại: 100% ... ngưỡng cảnh báo (80%) ...
Căn cứ: chưa xác định nguồn (tầng UNKNOWN)
Trả lời bởi Gemini
```

The raw `[modelUsed=...]` prefix was absent from the rendered reply. No captured
browser console errors. Screenshots of the same live exchange:

- agent-375-light.jpg
- agent-375-dark.jpg
- agent-1440-light.jpg
- agent-1440-dark.jpg

This verifies delivery and rendering, not agronomic accuracy or citation quality.
The live request's precise duration and toolsUsed were not separately collected.
The new 90-second timeout/error branch was not exercised with a 90-second live
failure. No new Gemini/DeepSeek fallback test or deployment was performed. The
authenticated user's live question remains in their conversation history.

The frontend still sends question-only requests; persisting/reusing conversationId
in this UI is a separate follow-up to the backend conversation feature.
