## Linked GitHub Issue
Closes #<issue-number>
For cross-repository work, include fully qualified counterpart issue/PR links.
Type: feature / bug / fix / improvement / integration / contract change.

The human developer manually creates this PR after approving the agent's review report and authorizing commit/push. Agents must not automatically create or merge PRs.

## Summary of changes
Describe the concrete resulting behavior.

## Files and modules changed
List the repository scope, significant files and relevant base/commit revision.

## Reason for the changes
Explain the problem and reference the approved implementation plan.

## API contract impact
None, or exact endpoint/DTO/auth/error/null/compatibility delta.
Shared approved docs revision and contract revision/hash:

## Database or migration impact
None, or approved schema/data changes, compatibility and execution evidence.
Do not treat this PR as permission for production database operations.

## MQTT / IoT pipeline impact
Describe MQTT, IoT Lab, SAVE-ONLY/current Phase 1B-lite boundaries, timestamp/idempotency/recovery and hard-alert/LLM effects. State unchanged where verified.

## Security impact
Authentication/authorization, farm scoping, validation, CORS/CSRF, secrets/logging, external calls and provider cost effects.

## Tests executed and results
| Check | Environment | PASS / FAIL / SKIP | Evidence and limitations |
| --- | --- | --- | --- |
| Name exact command/test | Isolated local/staging | Result | Sanitized evidence; distinguish fixtures from live |

## Screenshots for UI changes
Attach relevant desktop/mobile and light/dark states, or state Not applicable. Remove sensitive data.

## Known limitations
List unverified behavior, missing coverage, blockers and cross-repository dependencies.

## Rollback considerations
Describe code/data/schema compatibility and preservation. Never delete volumes or use destructive database rollback by default. Image rollback does not undo schema changes.

## Human review checklist
- [ ] Issue, scope, plan and shared contract revision approved.
- [ ] Complete agent report reviewed before explicit commit/push authorization.
- [ ] Branch diff matches approved work; unrelated staged/uncommitted work preserved.
- [ ] Backend/Codex and frontend/Antigravity ownership respected.
- [ ] Tests/results/skips and UI evidence reviewed.
- [ ] API/database/security/MQTT/IoT impacts reviewed.
- [ ] No secrets; existing backend skill and workflow safety preserved.
- [ ] Existing GitHub Actions, Docker Compose and Oracle infrastructure unchanged for workflow setup.
- [ ] Human confirms cross-repository integration and rollback compatibility.
- [ ] Human alone approves and manually merges this PR into main.

After the human merge, existing backend CI/CD may run according to its current triggers. Do not alter or disable those workflows. Agents must not directly deploy or restart production.
