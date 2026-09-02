# Code review override — EPMCDME-14111 (2026-09-02)

`code-review-final.json` recorded `decision: "request-changes"` with 9 blocking findings
(CR-001–CR-009). No `code-review-check.json` fix-up round was run — this is a **manual human
override** of gate 3.1, not an automated approval.

**Overridden by:** Andriy Lukashchuk (branch author/accountable reviewer)
**Recorded:** see `decisions.jsonl` line 1 (`gate_id: code-review.final`, `mode: hitl`)

## Findings and disposition

All 9 findings were reviewed and accepted as-is for this MR (no code changes applied to resolve
them):

| id | title | file |
|---|---|---|
| CR-001 | Duplicate parallel assistant fetch | `CredentialFields.tsx:126` |
| CR-002 | Hardcoded 100-item assistant cap, no pagination | `CredentialFields.tsx:151` |
| CR-003 | No test covers the assistantMultiSelect branch | `CredentialFields.tsx:349` |
| CR-004 | Assistant picker has no project-scoping guard | `CredentialFields.tsx:354` |
| CR-005 | `assistant_ids` not cleared on project change | `SettingsForm.tsx:382` |
| CR-006 | Oversized components touched without extraction | `SettingsForm.tsx`, `CredentialFields.tsx`, `ProjectSettings.tsx` |
| CR-007 | Assistant fetch failure swallowed silently | `hooks/useResourceOptions.ts:70` |
| CR-008 | Broad type widening backed by unchecked casts | `src/types/entity/setting.ts:18` + call sites |
| CR-009 | No test covers the featureFlag gate in `getCredentialUIMapping` | `src/utils/settings.ts:79` |

**Rationale:** none of the 9 findings block correct operation of the shipped feature path for
current usage (single project, <100 assistants, feature-flagged rollout); all are tracked as
follow-up hardening rather than launch blockers. CR-008's pattern was subsequently reused once
more (`EditIntegrationActions.tsx` credentialValues prop widened to `Record<string, unknown>`
during a later type-check fix) — same accepted risk, not a new decision.

## Why no `code-review-check.json`

Per `references/code-review/check-round.md`, all 9 findings are `kind: code` (no `kind` field on
the legacy verdict = code by default), so a check round can only mark them `resolved` against an
actual source fix at the finding's location. Recording acceptance as a `decision` proof would not
satisfy that contract honestly, since these findings are not `kind: decision`. Rather than fake a
check-round artifact the verifier could not actually earn, this file stands as the explicit human
override for gate 3.1, in place of the automated artifact.

## Follow-up

CR-001 through CR-009 remain open as known debt in the MS Teams assistant-picker wiring. Track
under EPMCDME-14111 or a follow-up ticket before the assistant count / project count assumptions
above no longer hold.
