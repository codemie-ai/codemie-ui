# Technical Research

**Task**: mcp auth callback timeout postmessage
**Generated**: 2026-08-20
**Research path**: codegraph

---

## 1. Original Context

Summary: MCP auth UI discards a callback that arrives after its 60 s timeout. When a user's sign-in at an MCP server's identity provider takes longer than 60 seconds, the backend completes the flow and stores a valid token, but the Web UI has already abandoned the wait and permanently discards the result. The user sees the popup close, then "Authentication didn't complete. Click to try again.", while the token sits unused in TMS. Code defect found by inspection; codemie-ui only, no backend change.

Root cause — three compounding defects in codemie-ui:

1. The UI timeout is an order of magnitude shorter than the backend's tolerance for the same flow. Web UI 60 s (AUTH_CALLBACK_TIMEOUT_SECONDS, src/hooks/useAuthCallbackListener.ts:22) vs PKCE store TTL 600 s, signed callback state max age 600 s, discovered flow TTL 900 s. The comment at useAuthCallbackListener.ts:103 ("Keep the UI timeout <= the backend PKCE lifetime") is satisfied, but 60 s is far below what a real interactive sign-in with MFA and consent needs.

2. The timeout un-tracks the auth_config_id, so a late success is silently dropped: src/hooks/useMCPAuthPrompt.ts:201-207 tracks only rows whose status === 'authenticating'; onTimeout (useMCPAuthPrompt.ts:238-246) moves the row to a recoverable status; that removes the id from trackedAuthConfigIds, so the listener's tracking effect deletes it from trackedIdsRef; the late postMessage arrives, trackedIdsRef.current.has(...) is false, and it is logged as "Ignoring auth callback for untracked auth_config_id" and dropped.

3. The chat consumer would swallow a late success even if tracking were fixed: updateAuthenticatingPromptRow (src/store/chatGeneration.ts:280) only matches rows whose status is still 'authenticating', so markPromptAuthSuccess becomes a no-op once the timeout has rolled the row back.

Impact: any user whose IdP sign-in exceeds the timeout cannot authenticate through the UI; tokens accumulate in TMS orphaned from the UI's view; presents as "works for some users, not others".

Acceptance criteria:
1. A user completing an MCP server sign-in within the backend PKCE lifetime is authenticated in the UI: the row turns authenticated and the integration test re-runs.
2. The default UI callback timeout is derived from, or explicitly aligned with, the backend lifetimes rather than an unrelated hard-coded value, and the derivation is documented at the definition site.
3. A callback arriving after the UI stops showing the spinner is still applied. This must hold for all three consumers of useAuthCallbackListener: useMCPAuthPrompt, src/pages/chat/hooks/useChatAuthCallbacks.ts, and src/pages/workflows/WorkflowDetailsPage.tsx.
4. While waiting, the UI communicates that a long sign-in is expected rather than implying failure.
5. Regression test: a callback delivered after the timeout window still authenticates the server.

Notes: the mcpAuthTimeoutSeconds application setting already overrides the 60 s default (useAuthCallbackListener.ts:100-104). Retrying after a timeout does not reuse a consumed PKCE state (pending_initiate is nulled when the popup opens — useMCPAuthPrompt.ts:180, src/store/chatGeneration.ts:912) — worth a regression test, not a fix. Two of the three consumers have no test coverage (useChatAuthCallbacks, and WorkflowDetailsPage which passes no callbacks at all).

Out of scope: reducing IdP sign-in duration; SAML MCP auth flows unless the same un-tracking path applies; the separate incident with a different cause where no callback ever reached the backend.

---

## 2. Codebase Findings

### Existing Implementations

- `src/hooks/useAuthCallbackListener.ts` — the shared cross-window listener. Constants at `:21-25` (`AUTH_CALLBACK_EVENT_TYPE = 'mcp_auth_callback'`, `AUTH_CALLBACK_TIMEOUT_SECONDS = 60`, `AUTH_CALLBACK_TIMEOUT_MS`, `AUTH_CALLBACK_TIMEOUT_MESSAGE`). Resolution order for the timeout: `timeoutMs` option → `getAuthCallbackTimeoutMs()` (`:104`) → `getAuthCallbackTimeoutSeconds()` (`:100`) → runtime config → the 60 s constant. `getPositiveInteger` (`:86`) rejects non-integers and values ≤ 0. Three effects: handler refs (`:157`), the tracking/timer diff effect (`:163-220`), the `message` listener (`:222-303`), plus an unmount cleanup (`:305-312`).
- Tracking mechanics: `trackedIdsRef` is a `Set` rebuilt on every change of `trackedAuthConfigIds` (`:165`, `:219`). Ids present before but absent now have their timer cleared and their `authFlows` entry deleted (`:184-200`). New ids get a `setTimeout(onIdTimeout, resolvedTimeoutMs)` and an `authenticating` flow (`:202-217`).
- `onIdTimeout` (`:168-182`) logs, deletes the timer, calls `reportCallbackTimeoutDiagnostics`, sets the flow to `authentication_required` with `AUTH_CALLBACK_TIMEOUT_MESSAGE`, then invokes `onTimeoutRef.current`.
- Message handling (`:230-296`) performs three gates in order: shape (`isAuthCallbackMessage`), origin (`getApiOrigin()`, `:55-72`), then `trackedIdsRef.current.has(auth_config_id)` (`:259`) — the third gate is where a late callback is dropped and warned about. A diagnostic `console.info('[mcp-auth] message observed', …)` at `:236` already records `tracked: false` for such messages.
- `reportCallbackTimeoutDiagnostics` (`:111-141`) — fire-and-forget `navigator.sendBeacon`/`fetch` POST to `${api.BASE_URL}/v1/mcp-auth/oauth2/callback-diagnostics` with `result: 'timeout'`, `waited_ms` clamped to `DIAGNOSTICS_MAX_WAITED_MS = 3_600_000` (`:107`). Added by EPMCDME-14226 (commit `4d41f398d`) in this same file.
- Consumer 1 — `src/hooks/useMCPAuthPrompt.ts`: local `rows` state; `trackedAuthConfigIds` memo filters `status === 'authenticating' && auth_config_id` (`:201-207`); `onSuccess` (`:209-226`) sets `authenticated` and fires `onAllAuthenticated` + `setRows([])` once every row is authenticated; `onError` (`:228`) and `onTimeout` (`:238-246`) both roll the row back via `getRecoverableAuthStatus`. Wired at `:248`.
- Consumer 2 — `src/pages/chat/hooks/useChatAuthCallbacks.ts`: derives ids from chat history with the same `status === 'authenticating'` filter (`:25-33`); handlers delegate to `chatGenerationStore.markPromptAuthSuccess` / `rollbackPromptAuthRow`; `NOOP_HANDLERS` (`:35-39`) for workflow or absent chats.
- Consumer 3 — `src/pages/workflows/WorkflowDetailsPage.tsx:53-64`: derives a single id by JSON-parsing `execution.output` when `overall_status === 'AUTHENTICATION_REQUIRED'`, and calls `useAuthCallbackListener({ trackedAuthConfigIds })` with no handlers and no use of the returned `authFlows`.
- Store — `src/store/chatGeneration.ts`: `updateAuthenticatingPromptRow` (`:266-294`) walks history backwards and matches `row.auth_config_id === authConfigId && row.status === 'authenticating'` (`:279-281`); `getAuthenticatingPromptIdsFromChat` (`:296-310`) applies the same status filter; `markPromptAuthSuccess` (`:936-945`) and `rollbackPromptAuthRow` (`:947-956`) both route through it. `initiatePromptAuth` (`:822-889`), `continuePromptAuth` (`:891-918`, nulls `pending_initiate` at `:912`), `cancelPromptAuth` (`:920-934`).
- Presentation — `src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx`: `ROW_STYLES` (`:33`), `STATUS_BADGES` (`:42`, `authenticating` → `InProgress` / "Authenticating"), Continue/Cancel only when `pending_initiate` is set (`:85-87`, `:116-132`), and the spinner block at `:159-164` with the copy "Waiting for browser sign-in" (`:162`). Rendered by `ChatAiAuthPrompt.tsx:68-82` and by `MCPToolsSelectionStep.tsx` / `MCPToolkitTest.tsx`.
- Utilities — `src/utils/mcpAuth.ts` (payload normalisation, `MCP_AUTH_GATE_STATUSES`, recoverable-status resolution) and `src/utils/mcpAuthInitiate.ts` (`getRecoverableAuthStatus`, `getPendingInitiate`, `MISSING_REDIRECT_HOSTNAME_MESSAGE`, `POPUP_BLOCKED_AUTH_MESSAGE`).
- Types — `src/types/entity/mcpAuth.ts`: `MCPAuthGateStatus` (`:24`), `MCPAuthRecoverableStatus` (`:25`), `MCPAuthGateServer` (`:36-48`), `MCPAuthPendingInitiate` (`:30`).

### Architecture and Layers Affected

- **Global hooks (`src/hooks/`)** — `useAuthCallbackListener.ts` (shared listener, timers, origin gate, diagnostics beacon), `useMCPAuthPrompt.ts` (assistant/toolkit prompt state machine). Adjacent, not currently in the flow: `usePopupWindow.ts` (poll-based popup close detection, used by `useOAuth`).
- **Page-level hooks and pages** — `src/pages/chat/hooks/useChatAuthCallbacks.ts`, `src/pages/chat/ChatPage.tsx` (its only caller), `src/pages/workflows/WorkflowDetailsPage.tsx`.
- **Valtio store layer (`src/store/`)** — `chatGeneration.ts` (prompt-row lifecycle) and `appInfo.ts` (runtime config accessors `getMcpAuthOrigin` `:140`, `getMcpAuthTimeoutSeconds` `:145`, fed by `fetchCustomerConfig` `:164` from `GET /v1/config`).
- **Presentational components (`src/pages/chat/components/`)** — `AssistantAuthGate/AssistantAuthGateRow.tsx`, `ChatHistory/ChatAiMessage/ChatAiAuthPrompt.tsx`; also reused from the assistants MCP toolkit.
- **Utils / types / constants** — `src/utils/mcpAuth.ts`, `src/utils/mcpAuthInitiate.ts`, `src/types/entity/mcpAuth.ts`, `src/constants/configKeys.ts`.

### Integration Points

- Cross-window `postMessage` from the backend callback page to the SPA; the origin is `appInfoStore.getMcpAuthOrigin()` when configured, otherwise the origin of `api.BASE_URL`, otherwise `window.location.origin` (`useAuthCallbackListener.ts:55-72`).
- Backend endpoints: `POST {row.initiate_url}` (e.g. `v1/mcp-auth/oauth2/initiate`) from both `useMCPAuthPrompt.initiate` and `chatGenerationStore.initiatePromptAuth`; `POST /v1/mcp-auth/oauth2/callback-diagnostics` from the timeout beacon; `GET /v1/config` for runtime settings.
- `window.open(auth_url, '_blank')` opens the IdP tab in both non-OAuth2 initiation paths and both "Continue" paths.
- Backend PKCE / callback-state / discovered-flow lifetimes live in the `codemie` enterprise repo; nothing in this repo encodes them beyond the comment at `useAuthCallbackListener.ts:103`.

### Patterns and Conventions

- Handler props are mirrored into refs (`onSuccessRef`/`onErrorRef`/`onTimeoutRef`) so the `message` listener effect can stay mounted with `[]` deps — the established way this hook avoids re-subscribing.
- Consumers own their state shape and pass a derived `trackedAuthConfigIds` array plus callbacks; the hook owns timers and `authFlows`.
- Valtio `proxy` stores mutate rows in place through small helpers (`updatePromptRowsAtIndexes`, `updateAuthenticatingPromptRow`); components read via `useSnapshot`.
- Status vocabulary is centralised: `MCPAuthGateStatus` in types, `MCP_AUTH_GATE_STATUSES` in `utils/mcpAuth.ts`, `STATUS_BADGES`/`ROW_STYLES` keyed exhaustively by that union in `AssistantAuthGateRow.tsx`.
- Runtime settings are read through named accessors on `appInfoStore` keyed by `CONFIG_KEYS`, never by string literal at the call site.
- Defensive logging convention: every drop path emits a `[mcp-auth]` `console.warn`/`console.info` with the ids involved.
- `.ai-run/guides/patterns/custom-hooks.md`: global hooks live in `src/hooks/`, handlers wrapped in `useCallback`, complete `useEffect` deps, explicit return typing, one responsibility per hook.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- 32 guides exist under `.ai-run/guides/`; none covers MCP auth, popup/postMessage flows, or callback timeouts. Relevant general guides: `.ai-run/guides/patterns/custom-hooks.md` (hook extraction, naming, cleanup and checklist), `.ai-run/guides/testing/testing-patterns.md` (Vitest + RTL, unit vs integration projects, mocking rules, pitfalls), `.ai-run/guides/development/security-patterns.md` (cross-window messages, config, secrets — routed from `AGENTS.md` for postMessage work), `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/quality-gates.md`.
- `AGENTS.md` states both config layers are public (`import.meta.env.VITE_*` and `window._env_`) and that structure/versions are derived by command rather than stored.

### Architectural Decisions

- Inline decision comments in `useAuthCallbackListener.ts`: `:103` "Keep the UI timeout <= the backend PKCE lifetime"; `:106` the `waited_ms` ceiling mirrors `OAuth2CallbackDiagnostics` on the backend; `:109-110` diagnostics are fire-and-forget and must never affect the timeout flow; `:118-121` clamping exists because a 422 would drop exactly the long-wait record; `:231-233` and `:248-249` explain why shape is checked before origin and why observed-but-dropped messages are still logged.
- `usePopupWindow.ts:48-84` documents why popup closure is detected by polling `window.closed` rather than an event — relevant prior art for "the popup is gone" signalling, currently unused by the MCP auth flow.
- No ADR directory exists in this repository.

### Derived Conventions

- The ticket file `/home/taras_spashchenko/EPAM/cm/codemie/local/mcp-auth/tickets/3-bug-late-callback-discarded.md` was read. Beyond the summary in Section 1 it adds: a lifetime table (UI 60 s; PKCE store TTL 600 s `_PKCE_TTL_SECONDS`; `_CALLBACK_STATE_MAX_AGE` 600 s at `src/codemie/enterprise/mcp_auth/_constants.py:83`; `DISCOVERED_FLOW_TTL_SECONDS` 900 s); an interim mitigation (raise `mcpAuthTimeoutSeconds` to e.g. 300, no deploy); a "files expected to change" table naming `useAuthCallbackListener.ts`, `useMCPAuthPrompt.ts`, `chatGeneration.ts:280`, `AssistantAuthGateRow.tsx:162`, verify-only for the other two consumers, and tests `useAuthCallbackListener.test.tsx` (60 s fallback assertion), `useMCPAuthPrompt.test.tsx` (listener mock records only `trackedAuthConfigIds`), `chatGeneration.test.ts`, `ChatAiAuthPrompt.test.tsx:205`, `AssistantAuthGateRow.test.tsx:67`; an instruction not to branch this off the observability branch (EPMCDME-14226 touches the same file); and a deferred design question — a single long timeout leaves a row spinning with no cancel affordance, versus a two-stage timer (hint at ~60 s, hard expiry at the backend lifetime) which the ticket costs at a new row field, an `initiate()` guard relaxation and row UI work.
- Some line references in the ticket are stale against the working tree: the 60 s fallback assertion is at `useAuthCallbackListener.test.tsx:377-381`, not `:227`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/hooks/__tests__/useAuthCallbackListener.test.tsx` — 16 cases, the densest coverage in the area: tracked ids become `authenticating`; origin and malformed-payload rejection; untracked-id rejection (`:82-98`); success/error updating only the targeted flow and clearing its timer; timeout → `authentication_required` + `AUTH_CALLBACK_TIMEOUT_MESSAGE` + `onTimeout`; beacon sent once on timeout with exact body; beacon transport throwing does not change behaviour; no beacon on success or IdP-error paths; `waited_ms` clamping; untracking on rerender clears timers (`:334-352`); runtime-config timeout honoured (`:354-375`); `getAuthCallbackTimeoutMs()` falls back to `60_000` for an invalid config value (`:377-381`); timers cleared on unmount; listener-ready and observed-message logging.
- `src/hooks/__tests__/useMCPAuthPrompt.test.tsx` — mocks `@/hooks/useAuthCallbackListener` with a recorder that pushes `{ trackedAuthConfigIds }` into `listenerCalls` (`:21-32`); `onSuccess`/`onError`/`onTimeout` are never captured or invoked. Covers OAuth2 pending-initiate metadata and its exclusion from tracking, with `window.open` spied.
- `src/pages/chat/components/AssistantAuthGate/__tests__/AssistantAuthGateRow.test.tsx` — row rendering per status, including the waiting copy.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiAuthPrompt.test.tsx` — prompt heading, all-authenticated banner, per-row copy.
- `src/pages/assistants/.../MCPToolkit/__tests__/MCPAuthPromptWiring.test.tsx` — wiring of the prompt into the toolkit step.
- `src/store/__tests__/chatGeneration.test.ts` plus six sibling suites (`prepareRequestData`, `resumeWorkflowExecution`, `streamDrain`, `storageGuards`, `interactive`, `renamePoll`).
- `src/pages/chat/__tests__/ChatPage.test.tsx`, `ChatPage.integration.test.tsx`, `ChatPage.resize.test.tsx`.

### Testing Framework and Patterns

- Vitest + React Testing Library, two workspace projects (`unit`, `integration`) via `vitest.workspace.ts`; `*.test.tsx` → unit, `*.integration.test.tsx` → integration. Exact versions in `package.json`.
- Hook tests use `renderHook` + `act` with `vi.useFakeTimers()` in `beforeEach` and `vi.clearAllTimers()`/`vi.useRealTimers()` in `afterEach`; timeouts are driven by `await vi.advanceTimersByTimeAsync(ms)`.
- `vi.hoisted` + module-level `vi.mock` for `@/utils/api`, `@/store/appInfo`, `@/utils/toaster`, and (in `useMCPAuthPrompt.test.tsx`) for the listener hook itself. `vi.stubGlobal('navigator', …)` for the beacon; `MessageEvent` dispatched on `window` to simulate the callback.
- Unit setup mocks `useSnapshot` and `@/utils/api` globally (`setupTests.unit.ts`); integration uses real valtio plus `mockAPI`/`renderPage` from `@/test-utils/integration`.
- Guide-flagged pitfall: self-rescheduling timers surviving teardown; fake timers interfere with `waitFor`/`userEvent`.

### Coverage Gaps

- `src/pages/chat/hooks/useChatAuthCallbacks.ts` — no covering tests (codegraph reports none); its `getAuthenticatingPromptIds` filter and its three store-delegating handlers are unexercised.
- `src/pages/workflows/WorkflowDetailsPage.tsx` — no covering tests; its `trackedAuthConfigIds` JSON-parse branch and its handler-less listener usage are unexercised.
- No test drives a callback through `useMCPAuthPrompt` end-to-end, because that suite replaces the listener with a recorder.
- No test asserts the interaction between a fired timeout and a subsequently delivered callback for the same id in any consumer.
- `updateAuthenticatingPromptRow` / `markPromptAuthSuccess` / `rollbackPromptAuthRow` in `chatGeneration.ts` have no dedicated suite among the seven `chatGeneration.*` files.
- `src/utils/mcpAuth.ts` and `src/utils/mcpAuthInitiate.ts` — codegraph reports no covering tests for their exported helpers.

---

## 5. Configuration and Environment

### Environment Variables

- `src/types/global.ts:16-20` declares `EnvConfig` as exactly `VITE_ENV`, `VITE_API_URL`, `VITE_APP_VERSION`, delivered at run time via `window._env_`; build-time `import.meta.env.VITE_*` is the other layer. No MCP-auth-specific env var exists.
- `api.BASE_URL` (from `src/utils/api.ts`) is consumed by the listener for both the expected postMessage origin and the diagnostics URL.

### Configuration Files

- `src/constants/configKeys.ts:19-26` — `CONFIG_KEYS` for values from `GET /v1/config`: `IDP_PROVIDER`, `MCP_AUTH_ORIGIN: 'mcpAuthOrigin'`, `MCP_AUTH_TIMEOUT_SECONDS: 'mcpAuthTimeoutSeconds'`, plus the three banner keys.
- `src/store/appInfo.ts` — `getMcpAuthOrigin()` (`:140`) and `getMcpAuthTimeoutSeconds()` (`:145`) return `string | null`; `fetchCustomerConfig()` (`:164`) loads `v1/config` once and guards on `isConfigFetched`.
- `vitest.workspace.ts`, `setupTests.tsx`, `setupTests.unit.ts` govern the two test projects.

### Feature Flags and Deployment Concerns

- `mcpAuthTimeoutSeconds` is an admin-controlled runtime setting, not a build flag: changing it takes effect on the next `GET /v1/config` without a redeploy, and `getPositiveInteger` silently falls back to the 60 s constant for `0`, negatives, or non-numeric values.
- The served image copies a prebuilt `dist/` (root `Dockerfile`), so any constant change requires `npm ci && npm run build:prod` before an image rebuild.
- The diagnostics beacon is unconditional on timeout; its records are consumed by the backend endpoint shipped under EPMCDME-14226.

---

## 6. Risk Indicators

- One hook, three consumers with divergent contracts: `useMCPAuthPrompt` (local state), `useChatAuthCallbacks` (store), `WorkflowDetailsPage.tsx:64` (no handlers). Changing tracking semantics changes all three.
- No covering tests for `useChatAuthCallbacks.ts` or `WorkflowDetailsPage.tsx` (codegraph reports none).
- `useMCPAuthPrompt.test.tsx:27-32` mocks the listener as a recorder of `trackedAuthConfigIds`; no callback ever reaches that hook in tests.
- The "still authenticating" predicate is duplicated in five places: `useAuthCallbackListener.ts:259`, `useMCPAuthPrompt.ts:204`, `useChatAuthCallbacks.ts:30`, `chatGeneration.ts:280`, `chatGeneration.ts:302`.
- The untracking effect (`useAuthCallbackListener.ts:184-200`) both deletes `authFlows` (spinner teardown) and drops late callbacks — one mechanism, two behaviours.
- `markPromptAuthSuccess` and `rollbackPromptAuthRow` share `updateAuthenticatingPromptRow`; its filter widens for both paths at once.
- `useAuthCallbackListener.ts` was last changed by EPMCDME-14226 (`4d41f398d`); the timeout beacon at `:111-141` reports `result: 'timeout'` and is asserted in five tests.
- Waiting copy at `AssistantAuthGateRow.tsx:162` is shared by chat, assistant gate and toolkit test, with copy assertions in two suites.
- No guide covers MCP auth or postMessage; conventions derive from code plus `security-patterns.md`.
- Backend lifetimes (600 s/900 s) exist only in the other repo and the ticket comment — unverifiable from this tree.
- Ticket line references are partly stale (60 s fallback assertion is at `useAuthCallbackListener.test.tsx:380`, not `:227`).
- Speculative: a longer wait has no cancel affordance — `AssistantAuthGateRow.tsx:116-164` renders Cancel only when `pending_initiate` is set; the ticket defers the two-stage-timer alternative to implementation.

---

## 7. Summary for Complexity Assessment

The defect spans four layers of a single feature slice: the shared hook `src/hooks/useAuthCallbackListener.ts`, its three consumers (`src/hooks/useMCPAuthPrompt.ts`, `src/pages/chat/hooks/useChatAuthCallbacks.ts`, `src/pages/workflows/WorkflowDetailsPage.tsx`), the Valtio store `src/store/chatGeneration.ts`, and one shared presentational row `src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx`. All are existing files; the ticket's own file table matches what codegraph found, and no new module, endpoint or type is implied by the current code. The surface is concentrated but fan-out is real: the "row is still authenticating" predicate is duplicated in five locations, and the same effect that stops the spinner is the one that drops the late callback.

Technical novelty is low-to-moderate. Every mechanism needed already exists in the tree — ref-mirrored handlers, per-id timers, an origin gate, a runtime-config override (`mcpAuthTimeoutSeconds` via `CONFIG_KEYS`/`appInfoStore`), and an admin mitigation path that needs no deploy. What is not in the tree is the backend's lifetime values; they are cross-repo facts carried only by the ticket and one comment.

Test posture is uneven. `useAuthCallbackListener.test.tsx` is dense (16 cases, fake timers, beacon assertions) and pins current timeout behaviour including the 60 s fallback, so behavioural change lands as test churn there. The other two consumers have no tests at all, `useMCPAuthPrompt.test.tsx` stubs the listener so no callback flows through it, and the three `chatGeneration` prompt-auth methods have no dedicated suite despite seven sibling files. Chief risks: coordinating one semantic change across five predicates, verifying two untested call sites manually, and avoiding entanglement with EPMCDME-14226, which touched the same file last.
