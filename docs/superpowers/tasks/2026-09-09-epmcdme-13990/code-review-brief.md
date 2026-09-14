# Code review — 2026-09-09-epmcdme-13990 (2026-09-09)

**request-changes** · confidence: low · 2 blocking · 0 deferred · 5 filtered as noise
Coverage: blind — n/a (profile: compact) · edge-case ✓ · verification-gap — n/a (profile: compact) · acceptance ✓ (2/2 lenses ran)

Reachability tracing for one edge-case candidate (routing null-clear, below) depends on backend
streaming behavior not visible from the frontend, and pushed this round past its 24-call budget —
treat the round as less verified than a clean pass.

## Look here first

- `src/pages/chat/components/ChatHeader/ChatHeader.tsx:167` — [billing] truthy check hides a real $0.0000 classifier cost row, indistinguishable from "classifier didn't run" — CR-001
- `src/store/chatGeneration.ts:1537` — [other] `??` routing merge can't apply an explicit `routing: null` clear from a streamed chunk — CR-002

## Also flagged

_(none)_

## Checked and clean

standards — n/a (not expected for compact profile) · 0 deferred

Dismissed as noise/unreachable (5): whitespace-only routed-model label renders a trailing dash
(cosmetic); CredentialFields.tsx function-typed `label` bypass and textarea/select branches
ignoring an explicit `label` — both traced to every current config producer and found genuinely
unreachable given today's data; chatGeneration.ts partial-routing-chunk drop — matches the same
`??`-replace pattern already used for every sibling field in this merge; unused per-thought
`RoutingInfo.classifier_cost_usd`/`requested_model_money_spent` fields — typed but not yet
consumed, not a defect.
