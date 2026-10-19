# Frontend implementation boundary
Google Antigravity owns frontend implementation in this repository. Codex owns the separate backend repository. Codex may inspect/review or update shared docs when explicitly tasked, but must not implement frontend work as part of a backend task; propose a handoff to the human instead.

Read GEMINI.md and E:/CTU/LuanVan/docs/ai/WORKFLOW.md, CURRENT_STATUS.md, IOT_INGESTION.md, API_CONTRACT.md and FRONTEND_GUIDE.md before relevant work. Use the same human-approved contract packet as backend. The packet is outside Git; future worktrees need its explicit location/revision.

Preserve existing functionality/auth/CSRF/farm scope/localization and backend skill instructions. During setup edit documentation/instructions only. Never install Gemini CLI. No cloud calls/ingestion, real alerts/LLM, production operations, secret exposure or infrastructure changes. Task branches use the clean-workspace standing permission below; worktree provisioning needs authorization and commit/push require explicit approval after the full review report. No Git mutations during this setup. The UI's development API may target Oracle; verify target before starting any integration check.

## Task branches and human review
For each human-approved new feature, bug, fix or improvement: read the Issue/task and approved plan/docs; inspect Git status, staged work and worktree inventory; create a dedicated task branch only in a clean, safely isolated, task-owned workspace with a confirmed base. Standing authorization covers that task branch, never dirty-tree cleanup or ownership changes. Obtain authorization for any new worktree provisioning; do not assume a clean registered worktree is available to reuse.

Implement assigned scope, run relevant authorized tests, provide the full diff/file/test/impact/limitations report, then STOP for human review. Do not stage, commit or push until the human explicitly approves the report/exact diff and authorizes commit/push. Earlier task/plan/branch approval is insufficient; material later edits require renewed approval.

The human manually creates and merges the PR into main. Agents never create PRs (including drafts), merge, push directly to main or directly deploy. After a human merge, existing CI/CD may run under its current triggers; preserve GitHub Actions, Docker Compose and Oracle infrastructure.

Protect backend feature/expert-role and all existing governance work; 73dc contains staged Soil S1 work and must not be altered/reused. Do not access, modify or reuse ebc8 during this setup. Current local-only setup permits documentation/templates only: no branch/worktree creation, reset, clean, stash, checkout, switch, add, commit, push or cherry-pick.

Read E:/CTU/LuanVan/docs/ai/GITHUB_WORKFLOW.md and GITHUB_MCP.md. The six board statuses are Backlog, In Progress, In Review, Approved, Done, Blocked. Plan approval is separate from the post-report Approved status. MCP connection/settings/auth and remote Issue/Project/PR creation are not authorized by this setup.
