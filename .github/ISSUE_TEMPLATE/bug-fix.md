---
name: "Bug Fix"
about: "Plan and review a DuriCare bug fix with human approval."
title: "[Bug Fix] "
labels: ""
assignees: ""
---

An Issue may represent a feature, bug, fix or improvement. Use the repository that owns the implementation; split cross-repository implementation into linked backend/frontend issues. Do not implement the other agent's code from this issue. This template does not authorize remote resources or code changes.

## Objective
Task type: Bug, fix or improvement.
State the user problem and outcome.

## Current behavior
Provide reproduction steps, expected/actual result, frequency and sanitized evidence.
Cite source paths and base revision. Never paste credentials, raw private env files or sensitive production data.

## Expected behavior
Describe observable behavior and non-goals.

## Proposed implementation
State the suspected cause and smallest scoped correction; distinguish facts from hypotheses. Include a regression test.
Record a concise plan before coding. Major architecture, API, schema or processing changes require specific human approval.

## Affected modules/files
List the repository, allowed files and excluded areas. Existing unrelated work must remain untouched.

## Dependencies
Link prerequisite issues, approved decisions and backend/frontend counterparts.
Shared docs commit/revision + contract revision/hash:
Required clean workspace/base revision:

## API contract impact
State None with evidence, or list the exact proposed delta and approval reference. Do not silently change the shared contract.

## Database impact
State None, or propose schema/data/backward-compatibility effects. No destructive SQL or production writes. A proposal does not authorize migration execution.

## Security considerations
Cover authentication, farm/role scoping, validation, secrets/logging, external calls and provider costs as applicable.
MQTT / IoT Lab / observation idempotency / hard-alert / LLM impact:
Docker Compose / CI/CD / Oracle Cloud impact: unchanged unless separately authorized; no edits under workflow setup.

## Acceptance criteria
- [ ] Observable criterion with a concrete example.
- [ ] Existing behavior and unrelated work preserved.
- [ ] Contract compatibility and denial/error cases addressed where applicable.

## Testing requirements
Name the relevant checks, isolated environment and expected results.
Record pass/fail/skip, failures, limits and fixture-vs-live evidence. Live ingestion, hard alerts, LLM calls and production operations require separate permission.

## Assigned agent
Suggested owner: CODEX_BE or GEMINI_FE (Google Antigravity); choose one.
Confirmed owner:
Human reviewer:
GitHub Issue URL: supplied by GitHub after human creation.
Task branch: be/<issue-number>-<slug> or fe/<issue-number>-<slug>; docs/<issue-number>-<slug> for docs.
Agents inspect Git status/worktrees first. Standing task-branch permission applies only in a clean, safely isolated workspace with a verified base. Never alter dirty worktrees; preserve feature/expert-role and staged Soil S1 in 73dc. Do not access/reuse ebc8 under this setup.

## Human approval status
Plan approval: PENDING / APPROVED / CHANGES REQUESTED.
Human approver and approval comment/date:
Exact plan + contract/docs revision approved:
Project status: Backlog / In Progress / In Review / Approved / Done / Blocked.

Plan approval is separate from project status Approved. Agents submit the complete report at In Review and STOP. Only explicit human approval of that report and exact diff permits commit and push of the task branch; earlier task/plan/branch approval is insufficient. Any later material change requires renewed review.

The human manually creates and merges the Pull Request into main. Agents do not create PRs or merge. Done requires verification and human acceptance after the applicable PR is merged.
