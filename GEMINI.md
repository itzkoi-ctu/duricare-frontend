# DuriCare frontend — Google Antigravity
Plain Markdown directory rule for the installed Antigravity products; no frontmatter.

## Shared documentation inputs

The human developer or execution environment must explicitly supply DOCS_ROOT and DOCS_REVISION through task inputs or environment variables; neither has an inferred default. DOCS_ROOT is the shared documentation location. DOCS_REVISION must identify the human-approved immutable docs commit or, while unversioned, an approved local packet revision with a hash manifest. Resolve shared-document filenames below under DOCS_ROOT; repository-local instruction and skill paths remain repository-relative. Do not assume private duricare-docs is initialized, published, cloned or accessible.

Before work that depends on shared documents, explicitly load the required files and verify the supplied revision against the checkout or approved packet/hash manifest. If either input is missing, ambiguous, inaccessible or cannot be verified, ask the human for the documentation root and approved revision and wait; do not guess paths/revisions or fetch a repository automatically. Report only the document paths actually loaded and the revision/hash checks actually completed; never claim access to unloaded or unverified documents. Both coding agents must use the same approved packet revision.

## Read before coding
Use the canonical approved packet at DOCS_ROOT:
WORKFLOW.md, PROJECT_OVERVIEW.md, CURRENT_STATUS.md, IOT_INGESTION.md, API_CONTRACT.md, API_SCHEMAS.md, FRONTEND_GUIDE.md and ANTIGRAVITY_SETUP.md.
Read this task's human-approved plan and contract revision/hash. The shared packet is separate from the application checkout; use only its explicitly supplied location and approved revision, including in relocated worktrees. Do not assume automatic loading or ../docs works. If needed explicitly open/attach these files and restate loaded paths/ownership before editing.

## Ownership and integration
Google Antigravity implements frontend components, routes, UI, charts, typed API integration, responsive styling and frontend checks here. CODEX_BE/OpenAI Codex owns backend APIs/auth/database/MQTT/IoT/alerts/AI/tests. Gemini Web plans; the human approves requirements/contracts/architecture, merges and deployment.
GEMINI_FE in TASKS is the legacy owner label for Antigravity, never Gemini CLI. Do not install Gemini CLI.

Use only approved existing APIs or reviewed contract changes; never invent DTO fields/endpoints/permissions or edit backend implementation from a frontend task. Propose needed backend changes for Codex and human review first.

## Existing patterns
React/TypeScript/Vite, React Router lazy routes, contexts/hooks, shared Axios client, Tailwind tokens, Recharts and i18next. Preserve auth token memory-only storage, cookie/CSRF rotation, one 401 recovery, role guards and backend-enforced farm scope. Maintain English/Vietnamese text, loading/error/empty states, responsive/light/dark layouts.
Inspect actual files and package.json before commands. No test script exists at setup; build/lint and historical Puppeteer fixtures are separate. Fixture screenshots are not live evidence.

Confirm the API target before running UI/integration checks: development config may target Oracle. useOverview has a DEV fixture fallback; use explicit nofixture=true when authorized to validate live local data. Never send test traffic to production accidentally.

## Preservation and reporting
<<<<<<< HEAD
Setup is docs/instructions only. Preserve all existing application behavior, backend SKILL.md, MQTT, historical IoT SAVE-ONLY requirements, current 1B-lite/S1 implementation and Docker/data. Current code is beyond SAVE-ONLY: report the conflict; do not silently change it.
No new feature/refactor/migration/dependency/infrastructure change during setup. No auto-deploy, production restart/DB writes, volume removal, network/firewall/credential changes, external ingestion, hard alerts or LLM calls. Never display/store real env secrets.
Future task branches have standing authorization only in clean safely isolated workspaces. Worktree provisioning still requires authorization. Commit/push need explicit approval after the complete report; agents never create or merge PRs. Authorized concurrent coding uses separate repo worktrees plus isolated runtime resources and the same approved packet. No Git mutations during this setup.
=======
Setup is docs/instructions only. Preserve all existing application behavior, backend SKILL.md, MQTT, historical IoT SAVE-ONLY requirements, current 1B-lite/S1 implementation and Docker/data. The backend main publication snapshot is beyond historical SAVE-ONLY; this is not a claim that all backend S1 fields are integrated into the frontend. Inspect both approved source revisions, report contract gaps and do not silently change processing.
No new feature/refactor/migration/dependency/infrastructure change during setup. No auto-deploy, production restart/DB writes, volume removal, network/firewall/credential changes, external ingestion, hard alerts or LLM calls. Never display/store real env secrets.
Future task branches have standing authorization only in clean safely isolated workspaces. Worktree provisioning still requires authorization. Commit/push need explicit approval after the complete report; agents never create or merge PRs. Authorized concurrent coding uses separate repo worktrees plus isolated runtime resources and the same approved packet. Documentation-only setup authorizes no Git mutation unless the human explicitly approves the specific operation.
>>>>>>> 9c65dc4a8e52a5347ce9db8d6991b686aecf6259
Report changed files, API compatibility, named checks with pass/fail/skip, fixture/live status and remaining limits. Do not claim unrun tests passed.

## Task branches and human review
For each human-approved new feature, bug, fix or improvement: read the Issue/task and approved plan/docs; inspect Git status, staged work and worktree inventory; create a dedicated task branch only in a clean, safely isolated, task-owned workspace with a confirmed base. Standing authorization covers that task branch, never dirty-tree cleanup or ownership changes. Obtain authorization for any new worktree provisioning; do not assume a clean registered worktree is available to reuse.

Implement assigned scope, run relevant authorized tests, provide the full diff/file/test/impact/limitations report, then STOP for human review. Do not stage, commit or push until the human explicitly approves the report/exact diff and authorizes commit/push. Earlier task/plan/branch approval is insufficient; material later edits require renewed approval.

The human manually creates and merges the PR into main. Agents never create PRs (including drafts), merge, push directly to main or directly deploy. After a human merge, existing CI/CD may run under its current triggers; preserve GitHub Actions, Docker Compose and Oracle infrastructure.

<<<<<<< HEAD
Protect backend feature/expert-role and all existing governance work; 73dc contains staged Soil S1 work and must not be altered/reused. Do not access, modify or reuse ebc8 during this setup. Current local-only setup permits documentation/templates only: no branch/worktree creation, reset, clean, stash, checkout, switch, add, commit, push or cherry-pick.

Read E:/CTU/LuanVan/docs/ai/GITHUB_WORKFLOW.md and GITHUB_MCP.md. The six board statuses are Backlog, In Progress, In Review, Approved, Done, Blocked. Plan approval is separate from the post-report Approved status. MCP connection/settings/auth and remote Issue/Project/PR creation are not authorized by this setup.
=======
Preserve all pre-existing staged/uncommitted work and respect the human's protected-workspace exclusions. Branches and detached worktrees named in historical setup reports describe the original workspace; do not assume they exist in this checkout or are available to reuse. During documentation/publication preparation, edit only the explicitly approved docs/templates and STOP before staging, commit or push. For an approved implementation task, follow the clean isolated task-branch and human-review policy above. Never reset, clean, stash or discard unrelated work to manufacture a clean workspace.

Read DOCS_ROOT/GITHUB_WORKFLOW.md and GITHUB_MCP.md. The six board statuses are Backlog, In Progress, In Review, Approved, Done, Blocked. Plan approval is separate from the post-report Approved status. MCP connection/settings/auth and remote Issue/Project changes require separate explicit authorization. PR creation and merge remain human-only.

## Graduation thesis traceability

For each significant frontend feature, integration, fix, improvement, design change or technical investigation, explicitly open/attach thesis/FEATURE_LOG.md and thesis/evidence/README.md from the same human-approved shared packet at DOCS_ROOT (or the supplied path/revision); restate loaded paths if automatic rule loading is unverified. Record requirements/motivation, initial source state, design/decisions, changed UI/modules and API impact, challenges, exact checks and actual results, limitations, stable evidence IDs and real task/Issue/branch/base/commit/PR references when available. Label screenshots with route/state, viewport/theme/locale, revisions and fixture/local/live context; sanitize data. Minor changes use the concise form.

Include thesis records/evidence and their diff in the complete pre-commit review and STOP for human approval. Codex owns backend evidence; Gemini Web drafts from approved sanitized documents; the human approves academic conclusions. Distinguish Planned, Implemented, Tested, Verified and Unresolved; never invent dates/results/metrics/findings or mistake fixtures and historical reports for live passes. Preserve historical SAVE-ONLY versus later IoT changes. No secret/personal/sensitive raw data, extra live calls or automatic publication. Add future commit/PR references through separately reviewed documentation follow-ups. Explicitly load or integrate these instructions in the approved frontend checkout; publishing this branch does not configure other existing checkouts automatically.
>>>>>>> 9c65dc4a8e52a5347ce9db8d6991b686aecf6259
