# EPMCDME-14227 — Late MCP Auth Callback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply an MCP auth callback that arrives after the UI stops showing the spinner, by splitting the single 60 s timer into a presentation-only hint expiry and a backend-derived acceptance deadline.

**Architecture:** `useAuthCallbackListener` keeps its 60 s hint timer (spinner teardown, `onTimeout`, row rollback — unchanged) and gains a second per-id timer at `AUTH_CALLBACK_ACCEPTANCE_SECONDS = 600`. On hint expiry the id moves into a retention ref; the id gate accepts `tracked || retained`. The diagnostics beacon moves to acceptance expiry. Downstream, only `chatGeneration`'s success matcher widens.

**Tech Stack:** React 18 hooks + refs, Valtio, Vitest + RTL with fake timers (`npm run test:unit`, `npm run test:integration`).

**Spec:** `docs/superpowers/tasks/2026-08-20-epmcdme-14227-late-auth-callback/spec.md`

## Global Constraints

- Commit per task using the repository's existing convention (`.ai-run/guides/standards/git-workflow.md`); every commit carries `EPMCDME-14227`.
- Do not entangle with EPMCDME-14226 (`4d41f398d`): the beacon body, transport, clamping and comments at `useAuthCallbackListener.ts:106-141` stay byte-identical — only its call site moves.
- Behaviour pinned by `useAuthCallbackListener.test.tsx` (16 cases, 5 beacon assertions, 60 s fallback at `:380`) is **re-asserted under the new names, never deleted**.
- No backend change; no new endpoint, payload field or config key; no new `MCPAuthGateStatus` member, row field, `initiate()` guard relaxation, or diagnostics result value.
- No change to the origin gate (`:55-72`) or the message-shape gate.
- `authFlows` teardown at `:193-199` is untouched — retention lives in a ref, not state.
- `WorkflowDetailsPage.tsx:64` is verify-only: no handlers, no auto-resume, no refetch.

---

### Task 1: Extract the "spinner for this row" predicate

**Files:**
- Modify: `src/utils/mcpAuth.ts` (add export near `:44-48`); call sites `src/hooks/useMCPAuthPrompt.ts:204`, `src/pages/chat/hooks/useChatAuthCallbacks.ts:30`, `src/store/chatGeneration.ts:302`
- Test: `src/utils/__tests__/mcpAuth.test.ts` (create)

**Interfaces:** Produces `isAuthenticatingGateRow(row: { status: MCPAuthGateStatus; auth_config_id?: string | null }): boolean`.

**Test-first: yes** — importing `isAuthenticatingGateRow` from `@/utils/mcpAuth` fails to resolve; it is not exported.

- [ ] **Step 1: Write the failing test** — true for `{ status: 'authenticating', auth_config_id: 'a-1' }`; false for `authenticating` with `auth_config_id: null`; false for `authentication_required` and `authenticated` with an id.
- [ ] **Step 2: Run it, confirm failure** — `npm run test:unit -- src/utils/__tests__/mcpAuth.test.ts`.
- [ ] **Step 3: Add the export** and use it at the three call sites. All three keep the `authenticating` filter — de-duplication, not a semantic change. Do **not** touch `chatGeneration.ts:280`; that matcher widens in Task 3.

```ts
export const isAuthenticatingGateRow = (row: {
  status: MCPAuthGateStatus
  auth_config_id?: string | null
}): boolean => row.status === 'authenticating' && Boolean(row.auth_config_id)
```

- [ ] **Step 4: Run the new test plus `useMCPAuthPrompt.test.tsx` and `chatGeneration.test.ts`**, confirm green.

---

### Task 2: Two-stage timer, retention, and beacon relocation

**Files:**
- Modify: `src/hooks/useAuthCallbackListener.ts` — constants `:21-25`, resolvers `:100-104`, tracking effect `:163-220`, id gate `:259-265`, message cleanup `:273-277`, unmount `:305-312`, exports `:317-322`
- Test: `src/hooks/__tests__/useAuthCallbackListener.test.tsx`

**Interfaces:** Produces `AUTH_CALLBACK_HINT_MS`, `AUTH_CALLBACK_ACCEPTANCE_MS`, `getAuthCallbackHintMs()`, `getAuthCallbackAcceptanceMs()`, replacing the exported `AUTH_CALLBACK_TIMEOUT_MS` / `getAuthCallbackTimeoutMs` (no production importer outside this file). `AUTH_CALLBACK_TIMEOUT_MESSAGE` is renamed in Task 4, not here.

**Test-first: yes** — "accepts a success delivered after the hint timer fires but before the acceptance deadline" fails: the id is untracked at hint expiry, the message is dropped by the gate at `:259`, and `onSuccess` never runs.

- [ ] **Step 1: Add the failing cases** alongside — never replacing — the existing 16:
  - late success: advance past the hint window, rerender with the id removed from `trackedAuthConfigIds` (as a consumer rollback does), dispatch the success `MessageEvent` from the API origin → `onSuccess` called once.
  - a success during retention sends **no** beacon and clears both timers.
  - no beacon at hint expiry; exactly one beacon at acceptance expiry with the EPMCDME-14226 body shape and `waited_ms` equal to the acceptance window.
  - a callback dispatched after acceptance expiry is still dropped with the untracked warning.
  - after unmount, a dispatched callback invokes nothing (retention purged).
  - re-assert the renamed fallbacks: `getAuthCallbackHintMs()` → `60_000` for an invalid `mcpAuthTimeoutSeconds` (was `:377-381`); `getAuthCallbackAcceptanceMs()` → `600_000` by default and `900_000` when `mcpAuthTimeoutSeconds` is `900` (widen, never clamp).
- [ ] **Step 2: Run, confirm the new cases fail** — `npm run test:unit -- src/hooks/__tests__/useAuthCallbackListener.test.tsx`.
- [ ] **Step 3: Implement.** Replace `:22-23` with:

```ts
// Stage 1 — presentation only: how long the spinner shows before the row
// returns to an actionable state. Overridable via `mcpAuthTimeoutSeconds`.
const AUTH_CALLBACK_HINT_SECONDS = 60
const AUTH_CALLBACK_HINT_MS = AUTH_CALLBACK_HINT_SECONDS * 1000

// Stage 2 — how long a callback is still applied. Mirrors the shorter of the
// backend lifetimes gating this flow: _PKCE_TTL_SECONDS 600 s and
// _CALLBACK_STATE_MAX_AGE 600 s (mcp_auth/_constants.py:83, `codemie` repo);
// the 900 s DISCOVERED_FLOW_TTL_SECONDS is the looser bound.
const AUTH_CALLBACK_ACCEPTANCE_SECONDS = 600
const AUTH_CALLBACK_ACCEPTANCE_MS = AUTH_CALLBACK_ACCEPTANCE_SECONDS * 1000
```

Rename `getAuthCallbackTimeoutSeconds` / `getAuthCallbackTimeoutMs` to `getAuthCallbackHintSeconds` / `getAuthCallbackHintMs` (drop the now-wrong comment at `:103`) and add `getAuthCallbackAcceptanceMs = () => Math.max(getAuthCallbackHintMs(), AUTH_CALLBACK_ACCEPTANCE_MS)`.

In the hook: rename `timeoutsRef` → `hintTimeoutsRef`, add `acceptanceTimeoutsRef` (same `Record<string, timeout>` shape) and `retainedIdsRef = useRef<Set<string>>(new Set())`. In the tracking effect resolve `resolvedHintMs = timeoutMs ?? getAuthCallbackHintMs()` and `resolvedAcceptanceMs = Math.max(resolvedHintMs, AUTH_CALLBACK_ACCEPTANCE_MS)`; a newly tracked id (`:202-217`) schedules **both** timers.

- `onIdHintExpiry` — the current `:168-182` body minus `reportCallbackTimeoutDiagnostics`: log, delete the hint handle, add the id to `retainedIdsRef`, set `authFlows` to `authentication_required`, call `onTimeoutRef.current`.
- `onIdAcceptanceExpiry` — warn, delete the acceptance handle and the retention entry, then `reportCallbackTimeoutDiagnostics(authConfigId, resolvedAcceptanceMs)`.
- Untracking loop (`:184-200`) — clear the hint handle and tear `authFlows` down exactly as today; leave the acceptance timer and retention running. Retention is entered **only** from a hint expiry, so an untrack for any other reason (cancel, success, chat switch, `clearRows`) finds nothing retained and purges nothing extra. Do not add a cancel channel to the hook — a late success for a cancelled row finds no matching row downstream and no-ops.
- Id gate at `:259` — `if (!trackedIdsRef.current.has(id) && !retainedIdsRef.current.has(id))`. Add `retained` beside `tracked` in the observed-message log (`:242-244`) and in the drop warning.
- Accepted message (`:273-277`) — clear both handles and delete the retention entry.
- Unmount (`:305-312`) — clear both timer maps and reset `retainedIdsRef`.

- [ ] **Step 4: Run the suite**, confirm every case passes with none deleted and the five beacon assertions re-pointed at acceptance expiry.

---

### Task 3: Widen the success matcher in `chatGeneration`

**Files:**
- Modify: `src/store/chatGeneration.ts:266-294` (matcher) and its call sites `:940`, `:951`
- Test: `src/store/__tests__/chatGeneration.promptAuth.test.ts` (create)

**Interfaces:** `updatePromptAuthRow(chat, authConfigId, isTarget: (row: MCPAuthGateServer) => boolean, updater)` replaces `updateAuthenticatingPromptRow`. `markPromptAuthSuccess` / `rollbackPromptAuthRow` signatures unchanged.

**Test-first: yes** — "markPromptAuthSuccess authenticates a row already rolled back to `authentication_required`" fails: the filter at `:280` requires `status === 'authenticating'`, so the call is a no-op.

- [ ] **Step 1: Write the failing tests**, following the sibling `chatGeneration.*` suites' fixture style: (a) success applies to an `authentication_required` row for that id; (b) success still applies to an `authenticating` row; (c) success is a no-op on an already-`authenticated` row; (d) `rollbackPromptAuthRow` does not clobber an `authenticated` row; (e) both no-op for a workflow chat.
- [ ] **Step 2: Run, confirm (a) and (d) fail** — `npm run test:unit -- src/store/__tests__/chatGeneration.promptAuth.test.ts`.
- [ ] **Step 3: Implement.** Rename the helper and replace the hardcoded predicate at `:279-281` with the passed `isTarget`, keeping the reverse history walk and the in-place `mcpAuthPromptRows` mapping unchanged. Add two module-local predicates and use them at the two call sites:

```ts
// A late callback may arrive after the hint expiry rolled the row back, so the
// success path accepts any row for this id that is not already authenticated.
const isAuthSuccessTarget = (row: MCPAuthGateServer): boolean => row.status !== 'authenticated'
// Rollback stays narrow so it can never clobber an authenticated row.
const isAuthRollbackTarget = (row: MCPAuthGateServer): boolean => row.status === 'authenticating'
```

- [ ] **Step 4: Run the new suite and the six sibling `chatGeneration.*` suites**, confirm green.

---

### Task 4: Hint and waiting copy

**Files:**
- Modify: `src/hooks/useAuthCallbackListener.ts:24` + export list; importers `src/hooks/useMCPAuthPrompt.ts:19,243` and `src/pages/chat/hooks/useChatAuthCallbacks.ts:19,57`
- Modify: `src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx:162`
- Test: `AssistantAuthGate/__tests__/AssistantAuthGateRow.test.tsx`, `ChatHistory/ChatAiMessage/__tests__/ChatAiAuthPrompt.test.tsx`, and the mocked/imported literals at `src/hooks/__tests__/useMCPAuthPrompt.test.tsx:28`, `src/pages/chat/__tests__/ChatPage.test.tsx:19,82,371`, `src/pages/chat/__tests__/ChatPage.integration.test.tsx:54`

**Test-first: yes** — the row-copy assertions fail while `AssistantAuthGateRow` still renders the bare "Waiting for browser sign-in" and the rollback `error_context` still reads "Authentication didn't complete."

- [ ] **Step 1: Update the copy assertions** in `AssistantAuthGateRow.test.tsx` and `ChatAiAuthPrompt.test.tsx`, and every mocked/imported constant literal in the four test files listed above.
- [ ] **Step 2: Run those suites, confirm the copy assertions fail.**
- [ ] **Step 3: Implement.** Rename `AUTH_CALLBACK_TIMEOUT_MESSAGE` → `AUTH_CALLBACK_HINT_MESSAGE` (update both production importers and the export list) with the value `'Sign-in is taking longer than usual. It can still complete — or click to try again.'`; change the span at `AssistantAuthGateRow.tsx:162` to `'Waiting for browser sign-in — a long sign-in is normal.'`. Copy only: no markup, status or affordance changes.
- [ ] **Step 4: Run the five touched suites plus `useAuthCallbackListener.test.tsx`**, confirm green.

---

### Task 5: `useMCPAuthPrompt` captures listener handlers

**Files:** Test: `src/hooks/__tests__/useMCPAuthPrompt.test.tsx:21-32`

**Interfaces:** Consumes `AUTH_CALLBACK_HINT_MESSAGE` (Task 4) and the hint/acceptance split (Task 2).

**Test-first: yes** — "a success delivered after the hint expiry authenticates the row" fails: the recorder mock at `:27-32` never captures `onSuccess`, so there is no handler to invoke.

- [ ] **Step 1: Change the mock** to keep pushing `trackedAuthConfigIds` into `listenerCalls` *and* store the latest `{ onSuccess, onError, onTimeout }` in a hoisted `listenerHandlers`, then add:
  - late success (AC 5): `onTimeout(id)` → the row is recoverable with the hint message and drops out of `trackedAuthConfigIds`; then `onSuccess(id)` → the row is `authenticated` with `error_context: null`, `onAllAuthenticated` fires and rows clear.
  - retry after a hint expiry (AC 6): after `onTimeout(id)`, `initiate` posts to `initiate_url` again and does not reuse the consumed `pending_initiate` (nulled at `useMCPAuthPrompt.ts:180`) — assert on `mockPost` and the `window.open` spy.
  - `onError(id, code)` after a hint expiry still lands the error context on the row.
- [ ] **Step 2: Run, confirm the new cases fail** — `npm run test:unit -- src/hooks/__tests__/useMCPAuthPrompt.test.tsx`.
- [ ] **Step 3: Make them pass.** Expect no production change: `onSuccess` (`:209-226`) already matches by `auth_config_id` with no status filter. If an assertion fails, fix the fixture, not the hook.
- [ ] **Step 4: Run the suite**, confirm the pre-existing OAuth2 pending-initiate cases still pass.

---

### Task 6: Cover `useChatAuthCallbacks`

**Files:** Test: `src/pages/chat/hooks/__tests__/useChatAuthCallbacks.test.ts` (create)

**Interfaces:** Consumes `isAuthenticatingGateRow` (Task 1), `AUTH_CALLBACK_HINT_MESSAGE` (Task 4), the widened success matcher (Task 3).

**Test-first: yes** — the suite does not exist; its first case fails on the missing file.

- [ ] **Step 1: Write the suite.** Mock `@/hooks/useAuthCallbackListener` as a handler-capturing recorder (same shape as Task 5) and `@/store/chatGeneration` with `vi.fn()` for `markPromptAuthSuccess` / `rollbackPromptAuthRow`. Assert: tracked ids are the de-duplicated `authenticating` rows carrying an `auth_config_id` across `history` groups; a workflow chat and a null chat track nothing and pass no-op handlers; `onSuccess` → `markPromptAuthSuccess(chat.id, id)`; `onError` → `rollbackPromptAuthRow(chat.id, id, errorCode)`; `onTimeout` → `rollbackPromptAuthRow(chat.id, id, AUTH_CALLBACK_HINT_MESSAGE)`; and a success delivered after that same `onTimeout` still calls `markPromptAuthSuccess` — the late-callback contract for this consumer.
- [ ] **Step 2: Run, confirm failure** — `npm run test:unit -- src/pages/chat/hooks/__tests__/useChatAuthCallbacks.test.ts`.
- [ ] **Step 3: Make it pass.** No production change is expected beyond Tasks 1 and 4; if an assertion fails, the fixture is wrong, not the hook.
- [ ] **Step 4: Run the suite**, confirm green.

---

### Task 7: Cover `WorkflowDetailsPage` as verify-only

**Files:** Test: `src/pages/workflows/__tests__/WorkflowDetailsPage.authCallback.integration.test.tsx` (create)

**Interfaces:** Consumes the listener option shape from Task 2.

**Test-first: yes** — the suite does not exist; its first case fails on the missing file.

- [ ] **Step 1: Write the suite** as a new file — do not edit `WorkflowDetailsPage.integration.test.tsx`, but copy its fixture shape at `:32-60`. Use `mockAPI` / `renderPage` from `@/test-utils/integration` plus a file-scoped `vi.mock('@/hooks/useAuthCallbackListener')` recorder capturing the whole options object. Assert: an `AUTHENTICATION_REQUIRED` execution whose `output` JSON carries `auth_config_id` tracks exactly that id; malformed `output` JSON and a non-`AUTHENTICATION_REQUIRED` status track nothing; and — pinning the non-goal — `onSuccess`, `onError` and `onTimeout` are all `undefined`, with no execution refetch triggered by the page.
- [ ] **Step 2: Run, confirm failure** — `npm run test:integration -- src/pages/workflows/__tests__/WorkflowDetailsPage.authCallback.integration.test.tsx`.
- [ ] **Step 3: Make it pass.** `WorkflowDetailsPage.tsx:53-64` must not change: this task documents current behaviour, which is already correct once the listener retains late callbacks.
- [ ] **Step 4: Run the suite**, confirm green.
