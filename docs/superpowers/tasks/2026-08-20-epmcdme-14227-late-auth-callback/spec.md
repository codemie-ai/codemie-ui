# EPMCDME-14227 — Apply MCP auth callbacks that arrive after the UI stops waiting

**Repo:** `codemie-ui` only. No backend change — the backend already tolerates 600 s.

## Problem

An MCP sign-in that outlasts the UI's 60 s wait is lost. The backend stores a valid token; the UI
has already un-tracked the `auth_config_id`, so the late `postMessage` fails the id gate at
`src/hooks/useAuthCallbackListener.ts:259` and is dropped. The user sees "Authentication didn't
complete", the token sits orphaned in TMS, and it presents as "works for some users, not others" —
the deciding factor is whether the browser already holds a live IdP session.

Root cause: one mechanism serves two purposes. The untracking effect at
`useAuthCallbackListener.ts:184-200` both tears down the spinner and stops accepting callbacks.
Those want different lifetimes — the spinner should stop early (a row with no escape hatch is worse
than a stale one), acceptance should last as long as the backend can still honour the flow.

## Approach — split the two lifetimes

**Stage 1, hint expiry.** `AUTH_CALLBACK_TIMEOUT_SECONDS` (`:22`) keeps its 60 s default and its
`mcpAuthTimeoutSeconds` override (`:100-104`), renamed to say what it now governs: how long the
spinner shows before the row returns to an actionable state. Its current effects are unchanged —
`authFlows` moves to `authentication_required`, `onTimeout` fires, consumers roll their row back.

**Stage 2, acceptance expiry.** New `AUTH_CALLBACK_ACCEPTANCE_SECONDS = 600`, documented at its
definition site as mirroring the shorter of the backend lifetimes gating this flow: `_PKCE_TTL_SECONDS`
600 s and `_CALLBACK_STATE_MAX_AGE` 600 s (`mcp_auth/_constants.py:83`, `codemie` repo); the 900 s
discovered-flow TTL is the looser bound. Effective window is `max(resolvedHintMs, acceptanceMs)`, so
raising `mcpAuthTimeoutSeconds` past 600 widens rather than silently clamps.

**Retention.** On hint expiry the listener moves that id into an internal retention set carrying the
acceptance deadline; the id gate at `:259` accepts `tracked || retained`. Retention is entered **only**
from a hint expiry — untracking for any other reason (cancel, success, chat switch, `clearRows`,
unmount) purges tracking and retention together, as today. It lives in a ref, not state: `authFlows`
is returned but consumed by no production code (tests only), so spinner teardown at `:193-199` is
untouched and its existing test still passes.

**Diagnostics.** The EPMCDME-14226 beacon (`:111-141`) moves from hint expiry to acceptance expiry.
A hint expiry is no longer a failure — the flow is still live — and reporting `result: 'timeout'` at
60 s would fill the endpoint with records the flow later contradicts. Still one beacon per id, same
body shape; only the firing moment and `waited_ms` change.

**Consumers.** `updateAuthenticatingPromptRow` (`chatGeneration.ts:266-294`) takes an explicit
accepted-status argument instead of the hardcoded filter at `:280`: the success path accepts any
non-`authenticated` row for that id; the rollback path keeps requiring `authenticating` so it cannot
clobber an authenticated row. The predicate duplicated across five sites means **two different
things**, so name them apart rather than merge them — the three tracking derivations
(`useMCPAuthPrompt.ts:204`, `useChatAuthCallbacks.ts:30`, `chatGeneration.ts:302`) mean "show a
spinner for this row" and keep their filter, extracted once into `src/utils/mcpAuth.ts`; the
acceptance matcher is separate and wider. `useMCPAuthPrompt.onSuccess` (`:209-226`) already matches
by `auth_config_id` with no status filter and needs no change.

**Copy.** `AUTH_CALLBACK_TIMEOUT_MESSAGE` (`:24`) is renamed and reworded from "Authentication
didn't complete. Click to try again." to say the sign-in is still expected and can still land, while
keeping the retry affordance. The spinner copy at `AssistantAuthGateRow.tsx:162` gains a note that a
long sign-in is normal. Both are asserted in `AssistantAuthGateRow.test.tsx` and
`ChatAiAuthPrompt.test.tsx`.

## Acceptance criteria

1. A sign-in completed within the backend PKCE lifetime authenticates the row in the UI.
2. The acceptance window is derived from the backend PKCE / callback-state lifetimes, with the
   derivation documented at the constant's definition site.
3. A callback arriving after the spinner stops is applied, for all three consumers of
   `useAuthCallbackListener`.
4. Hint-expiry and waiting copy communicate a slow sign-in, not a failure.
5. Regression test: a callback delivered after the hint window still authenticates the server.
6. Regression test: retrying after a hint expiry re-runs `initiate()` and does not reuse a consumed
   PKCE state (`pending_initiate` nulled at `useMCPAuthPrompt.ts:180`, `chatGeneration.ts:912`).
7. Exactly one diagnostics beacon per id, at acceptance expiry, with the EPMCDME-14226 body shape.
8. New covering tests for `useChatAuthCallbacks.ts` and `WorkflowDetailsPage.tsx`, and
   `useMCPAuthPrompt.test.tsx` captures listener handlers rather than only recording
   `trackedAuthConfigIds` (`:21-32`).

## Non-goals

- No backend change; no new endpoint, payload field, or config key.
- No new `MCPAuthGateStatus` member, no new row field, no `initiate()` guard relaxation.
- No auto-resume or refetch for `WorkflowDetailsPage.tsx:64`, which passes no handlers today and so
  reacts to an on-time callback exactly as it will to a late one — verify-only.
- No change to the origin gate (`:55-72`), the message-shape gate, or the diagnostics body/transport.
- No new diagnostics result value for "callback arrived late".
- No reduction of IdP sign-in duration; no SAML flows unless the same untracking path is shown to apply.
- Not a fix for the separate incident where no callback ever reached the backend.
- No unrelated refactor of `chatGeneration.ts` or the auth-gate components.

## Risks

- Test churn concentrates in `useAuthCallbackListener.test.tsx` (16 cases pin timeout behaviour, five
  assert the beacon). Changed behaviour must be re-asserted deliberately, not deleted.
- Backend lifetimes are cross-repo and unverifiable from this tree; the 600 s constant is a documented
  mirror, and upstream drift silently changes the acceptance window.
- A late success fires `onAllAuthenticated`, and the blocked action's auto-retry, minutes after the
  user acted. Accepted — it is the outcome the ticket asks for, and retention is purged on unmount.
- Do not entangle with EPMCDME-14226 (`4d41f398d`), which last touched this file.

---

## Post-approval amendment — 2026-08-20 (CR-004)

The approved text above is preserved as approved. This section records one decision taken after
approval, so the spec and the shipped code do not silently disagree.

**Superseded:** the Consumers paragraph (line 43-46) states that `updateAuthenticatingPromptRow`
(`chatGeneration.ts:266-294`) exists and that "the rollback path keeps requiring `authenticating` so
it cannot clobber an authenticated row".

**What shipped instead.** Code review finding CR-004 established that the narrow rollback silently
drops a late identity-provider *denial*: it never reaches the chat row, which keeps showing
in-progress copy, while the sibling consumer `useMCPAuthPrompt` applies that same callback. The user
resolved the gate against this spec and directed that rollback widen as well, guarded.

Implementation: `updateAuthenticatingPromptRow` was renamed and generalised to
`updatePromptAuthRow(chat, authConfigId, isTarget, updater)` (`chatGeneration.ts:266`), and a single
`isLateCallbackTarget` (`row.status !== 'authenticated'`, `chatGeneration.ts:301`) now serves both
the success path (`:947`) and the rollback path (`:958`).

**Why this still honours the original intent.** The narrowing existed to stop rollback clobbering an
authenticated row. The guard `status !== 'authenticated'` enforces exactly that, so the protection is
kept while parity between the two consumers is restored. Both halves are pinned by tests in
`chatGeneration.promptAuth.test.ts` — a late error landing on a rolled-back row, and a late error
*not* clobbering an already-authenticated row.

**Known, accepted at approval time:** the widened rollback can now match a `config_error` or
`discovery_failed` row, and picks the newest of two rows sharing an `auth_config_id`. Raised by the
review lenses, judged below the emission bar, recorded here rather than fixed.

Recorded in `decisions.jsonl` under gate `code-review.final`.
