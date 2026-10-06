# Frontend multi-turn agent — 2026-10-06

## Implementation

Followed `.agents/skills/ai-agent/SKILL.md` (DuriCare frontend conventions).
Checked the backend's AgentTestController, ConversationSummary, MessageResponse,
ToolInvocationRecorder and AgentConversationService before connecting the UI.

- `src/types/agent.ts`: conversation/message DTOs and structured tool invocations.
- `src/api/agent.ts`: ask context, list/history/delete through the existing shared
  authenticated Axios client; chat retains its 90-second timeout.
- `src/utils/agentAnswer.ts`: prefix stripping preserves conversationId/toolsUsed.
- `src/hooks/useAgentChat.ts`: keep conversationId in state, send it on follow-ups,
  load saved messages, start a new conversation, handle friendly 429/timeouts.
- `src/hooks/useAgentConversations.ts`: current user's list, refresh after an answer,
  delete only after success, retain rows and show errors when deletion fails.
- `src/components/ChatPanel.tsx`: reusable view/owned-hook wrapper, new-conversation
  control, history states, muted tool chips, expand compact chat with its ID.
- `src/components/AgentConversationList.tsx`: select/delete/confirm and list states.
- `src/components/AgentConversationSheet.tsx`: native modal dialog, focus containment,
  Escape/close and desktop resize handling.
- `src/pages/AgentPage.tsx`: lg side column and mobile sheet; existing RequireAuth
  route remains in place.
- `src/pages/ZoneDetailPage.tsx`: link `/agent?zoneCode=<current zone>`.
- `src/i18n/locales/{vi,en}/translation.json`: new labels and errors.

Conversation state remains in memory. The backend stores successful exchanges;
the UI can load them from the list or a conversationId deep link. No tokens or
conversation payloads are written to localStorage/sessionStorage. Tool chips
deduplicate names visually; their tooltip includes OK/DENIED/EMPTY meanings.

## Live verification

Local frontend http://localhost:5173, real backend
https://duricare.koictu.id.vn/api. Signed in with the previously authorized test
account. Opened `/zones/zoneA?farmId=1`, clicked "Hỏi trợ lý về khu vực này", and
confirmed `/agent?zoneCode=zoneA` plus the zoneA context label.

Conversation: `fd74483c-f441-4569-a5b6-c3bc8751f2ff`.

1. "Khu zoneA có cần tưới không?" → Gemini answered no, soil moisture 100%.
   Six chips: Hồ sơ khu vực, Cảm biến, Thời tiết, Nhật ký, Cảnh báo, Tri thức.
2. "Còn khu B thì sao?" → Gemini identified Khu B as ZONE-02 and answered no,
   soil moisture 100%, stage Kiến thiết cơ bản.
3. "Trong câu trả lời đầu tiên, độ ẩm đất của zoneA là bao nhiêu? Nhắc lại ngắn
   gọn và phân biệt với khu B." → remembered 100% and distinguished zoneA's
   Phát triển trái stage from ZONE-02's Kiến thiết cơ bản.

A Vite hook update aborted the browser's pending turn-2 request during development.
The backend still completed and stored it. We reopened/refetched that same
conversation instead of duplicating the question, then sent turn 3. Both a deep
link and a later selection from the mobile sheet restored all six messages.

`live-transcript.json` contains DOM-rendered content/labels from the real exchange,
not mocked data. No raw `[modelUsed=...]` prefix appeared. Third reply has no tool
chips because its own toolsUsed list is empty; it refers to the saved history.
These checks verify delivery/history/metadata, not agronomic accuracy. No new
independent sensor/forecast validation or DeepSeek fallback exercise was done.

The live verification conversation remains in the authenticated user's history
as evidence, identified above. No farm, sensor, care log or knowledge data changed.

## Screenshots

- agent-375-light.jpg — mobile, live saved conversation.
- agent-375-dark.jpg — mobile dark, same conversation.
- agent-1440-light.jpg — desktop side column, same conversation.
- agent-1440-dark.jpg — desktop dark, same conversation.
- history-375-dark.jpg — real mobile sheet.
- tools-375-dark.jpg — real earlier reply/tool chips while scrolling history.
- fixture-429.jpg — **synthetic frontend failure state**, not a live rate limit.

Widths verified from documentElement: 375 / 1440, no horizontal overflow. Browser
console error capture for the live tab was empty. Restored the original light
theme and default viewport after verification.

## Isolated state/transport checks

`scripts/agent-chat-fixture.mjs` runs on localhost:5189. The explicit test-only
`fixture.html`/`fixture.tsx` mounts the actual AgentPage/hooks in StrictMode against
that server; it never calls the real backend. Dummy token remains in memory.

Browser checks passed:

- Empty list and welcome prompt; loading list/history/typing indicator.
- 429 renders Vietnamese message and manual retry resends the same question.
- Following turn sends the existing ID; new conversation resets messages/ID.
- Reopening restores four saved messages and tool chips, with prefixes stripped.
- Failed deletion retains the row/history and displays an error; retry removes
  the row and resets the active chat to welcome state.
- Failed history load disables sending until retry restores the two messages.
- Failed list load displays error+retry, which restores the remaining row.
- Mobile sheet opens, Escape closes it and focus returns to its trigger; selecting
  a real conversation closes the sheet and loads history.

`fixture-requests.json` records these test-only requests without raw credentials.
All captured calls have Bearer attached through the same shared client.
`node scripts/verify-agent-multiturn.mjs` checks the captured requests, the real
transcript counts and the actual prefix parser: **10 assertions PASS**. Exact
names/results are saved in `assertions.json`.

`node scripts/verify-agent-timeout.mjs`: PASS, actual HTTP reply after 31,045 ms;
chat timeout 90,000 ms, shared timeout 15,000 ms, Bearer attached, prefix stripped,
and AbortController cancellation still supported.

`npm run build`: PASS. `npm run lint`: exit 0, only existing warnings in
OverviewContext/useOverview/useAlerts after removing a fixture unused-variable
warning. No production files outside the requested frontend feature were changed.

The synthetic server's data is process-local and discarded when it stops. 429,
history/list failures and DELETE success/failure were tested synthetically;
production DELETE was not exercised. No commit, push or deploy was performed.
