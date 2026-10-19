# DuriCare frontend — Google Antigravity
Plain Markdown directory rule for the installed Antigravity products; no frontmatter.

## Read before coding
Use the canonical approved packet at E:/CTU/LuanVan/docs/ai:
WORKFLOW.md, PROJECT_OVERVIEW.md, CURRENT_STATUS.md, IOT_INGESTION.md, API_CONTRACT.md, API_SCHEMAS.md, FRONTEND_GUIDE.md and ANTIGRAVITY_SETUP.md.
Read this task's human-approved plan and contract revision/hash. Shared docs are outside both Git repos; when using a relocated worktree, the human must explicitly provide the packet. Do not assume automatic loading or ../docs works. If needed explicitly open/attach these files and restate loaded paths/ownership before editing.

## Ownership and integration
Google Antigravity implements frontend components, routes, UI, charts, typed API integration, responsive styling and frontend checks here. CODEX_BE/OpenAI Codex owns backend APIs/auth/database/MQTT/IoT/alerts/AI/tests. Gemini Web plans; the human approves requirements/contracts/architecture, merges and deployment.
GEMINI_FE in TASKS is the legacy owner label for Antigravity, never Gemini CLI. Do not install Gemini CLI.

Use only approved existing APIs or reviewed contract changes; never invent DTO fields/endpoints/permissions or edit backend implementation from a frontend task. Propose needed backend changes for Codex and human review first.

## Existing patterns
React/TypeScript/Vite, React Router lazy routes, contexts/hooks, shared Axios client, Tailwind tokens, Recharts and i18next. Preserve auth token memory-only storage, cookie/CSRF rotation, one 401 recovery, role guards and backend-enforced farm scope. Maintain English/Vietnamese text, loading/error/empty states, responsive/light/dark layouts.
Inspect actual files and package.json before commands. No test script exists at setup; build/lint and historical Puppeteer fixtures are separate. Fixture screenshots are not live evidence.

Confirm the API target before running UI/integration checks: development config may target Oracle. useOverview has a DEV fixture fallback; use explicit nofixture=true when authorized to validate live local data. Never send test traffic to production accidentally.

## Preservation and reporting
Setup is docs/instructions only. Preserve all existing application behavior, backend SKILL.md, MQTT, historical IoT SAVE-ONLY requirements, current 1B-lite/S1 implementation and Docker/data. Current code is beyond SAVE-ONLY: report the conflict; do not silently change it.
No new feature/refactor/migration/dependency/infrastructure change during setup. No auto-deploy, production restart/DB writes, volume removal, network/firewall/credential changes, external ingestion, hard alerts or LLM calls. Never display/store real env secrets.
Future task branches have standing authorization only in clean safely isolated workspaces. Worktree provisioning still requires authorization. Commit/push need explicit approval after the complete report; agents never create or merge PRs. Authorized concurrent coding uses separate repo worktrees plus isolated runtime resources and the same approved packet. No Git mutations during this setup.
Report changed files, API compatibility, named checks with pass/fail/skip, fixture/live status and remaining limits. Do not claim unrun tests passed.

## Task branches and human review
For each human-approved new feature, bug, fix or improvement: read the Issue/task and approved plan/docs; inspect Git status, staged work and worktree inventory; create a dedicated task branch only in a clean, safely isolated, task-owned workspace with a confirmed base. Standing authorization covers that task branch, never dirty-tree cleanup or ownership changes. Obtain authorization for any new worktree provisioning; do not assume a clean registered worktree is available to reuse.

Implement assigned scope, run relevant authorized tests, provide the full diff/file/test/impact/limitations report, then STOP for human review. Do not stage, commit or push until the human explicitly approves the report/exact diff and authorizes commit/push. Earlier task/plan/branch approval is insufficient; material later edits require renewed approval.

The human manually creates and merges the PR into main. Agents never create PRs (including drafts), merge, push directly to main or directly deploy. After a human merge, existing CI/CD may run under its current triggers; preserve GitHub Actions, Docker Compose and Oracle infrastructure.

Protect backend feature/expert-role and all existing governance work; 73dc contains staged Soil S1 work and must not be altered/reused. Do not access, modify or reuse ebc8 during this setup. Current local-only setup permits documentation/templates only: no branch/worktree creation, reset, clean, stash, checkout, switch, add, commit, push or cherry-pick.

Read E:/CTU/LuanVan/docs/ai/GITHUB_WORKFLOW.md and GITHUB_MCP.md. The six board statuses are Backlog, In Progress, In Review, Approved, Done, Blocked. Plan approval is separate from the post-report Approved status. MCP connection/settings/auth and remote Issue/Project/PR creation are not authorized by this setup.
