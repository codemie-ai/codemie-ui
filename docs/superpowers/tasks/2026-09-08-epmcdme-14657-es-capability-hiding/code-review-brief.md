# Code review — 2026-09-08-epmcdme-14657-es-capability-hiding (2026-09-08)

**request-changes** · confidence: low · 4 blocking · 1 deferred · 5 filtered as noise
Coverage: blind ✓ · edge-case ✓ · verification-gap ✓ · acceptance — n/a (no spec)  (3/4 lenses ran)

Note: confidence is low — no spec/story ArtifactRef was present, so acceptance criteria could not be verified.

## Look here first

- `scripts/validate-secrets.mjs:130` — [security] `quoteForShell` encodes embedded quotes as `\"` (cmd.exe requires `""`) and does not double trailing backslashes; malformed gitleaks arguments on Windows may cause the pre-commit secret scan to exit without scanning, silently bypassing the check — CR-001
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:183` — [other: UX regression] `showRestoreFailed` has no `!message.generationStopped` guard; clicking Stop on a workflow before any content streams produces `generationStopped=true`, `inProgress=false`, empty thoughts — all conditions fire and the false "Workflow progress could not be restored." banner appears — CR-003
- `src/pages/analytics/components/AnalyticsDashboard.tsx:165` — [other: URL state] the URL-fallback `useEffect` requires `tabs.length > 0` before clearing a stale `?tab=` param; when all ES-gated flags are off, tabs is empty, the branch never runs, and the stale param is never cleared — content area is blank — CR-002
- `src/store/chats.ts:268` — [infra] the guard at line 262 covers only the case where the local message has a response; an empty-response turn (stream closed with no content) that receives a lagging GET with `inProgress: true` bypasses both guards and re-marks the locally-finished turn as in-progress, transiently re-enabling the poll — CR-004

## Checked and clean

commit-format ✓ · code-quality — n/a (no guide) · security ✓ · 1 deferred → code-review-deferred.md
