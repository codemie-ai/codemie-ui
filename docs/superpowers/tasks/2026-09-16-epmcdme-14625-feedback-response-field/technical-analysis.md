# Technical Research

**Task**: feedback chat assistant messages
**Generated**: 2026-09-16
**Research path**: filesystem

---

## 1. Original Context

Fix EPMCDME-14625: Negative assistant feedback cannot be submitted due to missing response field validation error.

Summary: In the CodeMie chat UI, disliking a message and submitting feedback via the "Submit Feedback About This Assistant" modal can fail. The frontend's feedback payload can omit the `response` field — it becomes `undefined` when the assistant message's `response` property is unset for that message, and `JSON.stringify` silently drops `undefined`-valued keys — while the backend's `POST /v1/feedback` endpoint (FastAPI `FeedbackRequest` model in the sibling `codemie` backend repo) requires `response` as a mandatory non-null string. This produces a 422 validation error (`response: Field required`), and the modal remains open with no successful submission and no clear user-facing error message.

Acceptance criteria (from the Jira ticket):
- Negative feedback can be submitted successfully from the assistant response feedback modal.
- The frontend sends all required fields expected by the backend, including `response` if required.
- The backend and frontend feedback payload contracts are aligned.
- Raw validation errors such as `body.response Field required` are not exposed directly to end users.
- The user receives a clear success confirmation after feedback is submitted.
- Regression check confirms feedback submission works for normal, incomplete, failed, and technical-error assistant responses (i.e., cases where the message may have no response text at all).

Known relevant code (already located via prior research, confirm/expand in your own pass):
- `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx` — `submitFeedback` (~line 82-108, dislike path) and `submitLikeFeedback` (~line 120-145, like path) both build a feedback object with `response: message.response`, which can be `undefined`.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackPopup.tsx` — the "Submit Feedback About This Assistant" modal.
- `src/store/chats.ts` — `submitFeedback` (~line 612-655) posts to `v1/feedback` via `api.post`, no `.catch()` handler at all, so any failure only surfaces through `api.ts`'s generic default error handling.
- `src/utils/api.ts` — `makeRequest` (~line 311+), `parseErrorBody`, `formatErrorMessage`, `handleError` — the generic HTTP error/toaster pipeline; JSON body serialization at `body: JSON.stringify(body)` drops `undefined` keys.
- `src/types/entity/conversation.ts` — `ChatMessage.response?: string` (~line 157) and `FeedbackSubmission.response?: string` (~line 237), both optional.

This is the `codemie-ui` repo only — do not investigate the backend repo further (already confirmed backend requires `response: str` as a mandatory field in `FeedbackRequest`; that repo's model will not be touched by this fix, which is intended to be frontend-only: always send a valid string for `response`, and show a clear, friendly error message on failure instead of relying on generic/raw error handling).

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx`
  - `submitFeedback` (lines 82-108, dislike/negative path) builds the feedback payload with `response: message.response` (line 96) — `message.response` is typed `string | undefined`.
  - `submitLikeFeedback` (lines 127-153, like/positive path) has the identical `response: message.response` construction (line 141) — same defect exists on the like path, not only dislike.
  - Both `catch` blocks (lines 104-107, 149-152) only `console.error` and revert the optimistic `mark` state — neither shows a `toaster.error` of its own, so any failure toast a user sees currently comes solely from `api.ts`'s generic pipeline.
  - `handleLike`/`handleDislike` (lines 110-125, 155-161) control which popup opens; `deleteFeedback` (lines 60-80) is the third feedback mutation, structurally identical to the other two (uses `chatsStore.deleteFeedback`, no field currently forces `response`).
- `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackPopup.tsx` — the "Submit Feedback About This Assistant" modal named in the ticket. Pure presentational: renders feedback-type buttons + a `Textarea` comment field, calls `onSubmit` (wired to `submitFeedback(messageFeedbackMark.wrong)`) with no payload knowledge of its own. `submitDisabled={!feedback.type && !feedback.comment}` (line 62) — the modal only knows about `type`/`comment`, not `response`.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageLikeFeedbackPopup.tsx` — sibling "Submit Positive Feedback" modal, same shape, feeds `submitLikeFeedback`.
- `src/store/chats.ts`
  - `submitFeedback` (lines 612-655): re-shapes the caller's `FeedbackSubmission` into the wire payload (`feedback` object, lines 620-630) 1:1 by field name — `response: feedbackData.response` is passed through untouched, so whatever `undefined`/string arrives from the component reaches `api.post` unchanged. No `.catch()` anywhere in the chain; on failure the returned promise rejects up to `MessageFeedbackActions.submitFeedback`'s own `try/catch`.
  - On success (lines 634-654), the store updates `chat.history[historyIndex][messageIndex].userMark` from the response body's `feedback_id`/`id`; there's no local validation before the POST.
  - `deleteFeedback` (lines 657+) mirrors the same call shape but is not part of the create-feedback path and has no `response` field to omit.
  - `getMetrics`, `recognizeSpeech`, and the `moveChatToFolder().catch()` (lines 580-609) are the only other adjacent store actions with distinct `.catch()` patterns worth noting as contrast — `submitFeedback` conspicuously lacks one.
- `src/utils/api.ts`
  - `makeRequest` (lines 311-401) is the single fetch wrapper used by `api.post`; `body: JSON.stringify(body)` (line 353) — standard JS behavior drops any key whose value is `undefined` before it reaches the wire, which is exactly how `response` disappears from the outgoing JSON when `message.response` is `undefined`.
  - On a non-OK response (lines 366-395) it calls `this.parseErrorBody(response)` then, unless `skipErrorHandling` was passed, calls `this.handleError(errorData)` automatically (line 392) — this is the "generic default error handling" the ticket refers to; `chats.ts`'s `submitFeedback` never passes `skipErrorHandling`, so this generic path always fires on a validation failure.
  - `parseErrorBody` (lines 418-432) assumes the backend has already normalized its error body to `{ error: { message, details?, help? } }` (the `ErrorBody` interface, lines 90-96) and simply returns the parsed JSON as-is when `content-type` is `application/json` — it does **not** special-case a bare FastAPI/pydantic `{"detail": [...]}` shape.
  - `formatErrorMessage` (lines 106-133) — if `body.error.details` is present and is an object (e.g. an array of pydantic error dicts), it does `JSON.stringify(details)` (line 112) and appends it verbatim to the toast text. This is the concrete mechanism by which a raw validation-error shape (e.g. `[{"loc":["body","response"],"msg":"Field required","type":"missing"}]`) would render literally inside the error toast if it ever reaches `formatErrorMessage` un-filtered — i.e., the generic pipeline is the surface the "raw validation errors ... exposed directly to end users" acceptance criterion is about.
  - `handleError` (lines 442-444) is the last step: `toaster.error(formatErrorMessage(body, includeHelp))`.
- `src/utils/validationError.ts` — `ValidationError` class + `ValidationError.fromParsedError(parsedError)` (lines 30-48): the repo's established mechanism for turning a pydantic-style `details` array (`[{loc:[...], msg}, ...]`) into field-level errors instead of letting `formatErrorMessage` stringify them raw. This is already used by other stores/pages (see Patterns below) and is the direct precedent for how this ticket's "raw validation errors are not exposed" requirement is normally satisfied elsewhere in the codebase — `chats.ts`'s feedback path does **not** use it today.
- `src/types/entity/conversation.ts`
  - `ChatMessage.response?: string` (line 157) — optional; also has `message?: string` (line 158) as a separate, unrelated optional field, and a `stream?: Stream | null` (line 174) whose `getStream()` can hold in-flight content distinct from `response`.
  - `FeedbackSubmission.response?: string` (line 237) — optional, mirrors `ChatMessage.response`'s optionality; `FeedbackSubmission` is the type `MessageFeedbackActions` builds and passes into `chatsStore.submitFeedback`.
- Existing "fallback the missing response" convention already used elsewhere for **display** (not yet for the feedback payload):
  - `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:126` — `const messageText = message.response ?? ''`
  - `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:180` — `message.stream?.getStream() ?? message.response`
  - `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:354` — `message={message.response ?? ''}`
  - `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions.tsx:66` — `const plainText = message.response ?? ''`
  - `src/pages/chat/components/ChatEditOutputForm.tsx:35` — `return lastMessage?.response || ''`
  - These establish `message.response ?? ''` (or `|| ''`) as the codebase's standard way of coercing this specific optional field to a safe string for downstream consumers.
- `src/store/chats.ts:262-268` (`refreshWorkflowExecutionIds`) shows one of the concrete circumstances under which `response` legitimately stays unset/short on a message: a message that is `inProgress`, has an auth gate, or was `generationStopped` can be mid-turn with no `response` text yet — relevant to the ticket's "incomplete, failed, and technical-error" regression scenarios, though the exact producer of a genuinely empty/undefined `response` on a finalized message lives upstream in the streaming/SSE handling not fully traced in this pass.

### Architecture and Layers Affected

- **Component layer** (`src/pages/chat/.../MessageFeedbackActions/`): `MessageFeedbackActions.tsx` is where the payload is assembled and where the two `submit*Feedback` functions' `try/catch` currently only reverts UI state on failure without showing a friendly message of its own.
- **Presentational modal layer**: `MessageFeedbackPopup.tsx` / `MessageLikeFeedbackPopup.tsx` — no payload logic, but their `onSubmit` callback boundary is where a caller decides whether the modal stays open or closes.
- **State layer** (`src/store/chats.ts`): `submitFeedback` — the Valtio store action that talks to the backend and updates `currentChat` on success; this is the layer the repo's own `error-handling-patterns.md` designates as responsible for `catch → toaster → (re)throw` and where a `ValidationError`-aware catch would normally live per existing precedent (`src/store/auth.ts`).
- **HTTP client layer** (`src/utils/api.ts`): generic error parsing/toaster (`parseErrorBody`, `formatErrorMessage`, `handleError`) that fires automatically today because `chats.ts`'s `submitFeedback` passes no `skipErrorHandling` option.
- **Type layer** (`src/types/entity/conversation.ts`): `ChatMessage.response?` and `FeedbackSubmission.response?` — both optional today; any contract tightening (marking `response` required on `FeedbackSubmission`, or normalizing at the boundary) touches this file.

### Integration Points

- `MessageFeedbackActions.tsx` → `chatsStore.submitFeedback` (`@/store/chats`) → `api.post('v1/feedback', feedback)` (`@/utils/api`) → backend `POST /v1/feedback` (out of scope per task instructions).
- `MessageFeedbackActions.tsx` → `MessageFeedbackPopup` / `MessageLikeFeedbackPopup` (props: `feedback`, `onFeedbackChange`, `onSubmit`, `onHide`) — the modal is a controlled child, no store access of its own.
- `src/utils/toaster.ts` (wraps `toastify-js`, sanitizes with `DOMPurify`) is the destination for both the generic `api.ts` error toast and any component-level `toaster.info`/`toaster.error`/`toaster.success` call.
- `src/utils/validationError.ts`'s `ValidationError.fromParsedError` is consumed today by: `src/store/auth.ts` (`register`, `login`), `src/utils/workflowEditor/backendErrorHandler.ts` / `helpers/backendErrorHandler.ts`, `src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx`, `src/store/skills.ts` (per `ErrorDetail[]` parsedError typing), and the `SignInPage.tsx`/`SignUpPage.tsx` catch blocks — this is the pattern already in place elsewhere in the app for exactly the "don't show raw validation JSON" requirement in this ticket, but the feedback path does not currently participate in it.
- `getChatBEMessageIndex` (imported at `chats.ts:40`) computes the backend message index used in both `submitFeedback` and `deleteFeedback` payloads — unrelated to `response` but part of the same payload-construction code the fix will touch.

### Patterns and Conventions

- **Optional-field display coercion**: `message.response ?? ''` / `message.response || ''` is the existing, repeated convention (5 call sites found, listed above) for treating an absent `response` as an empty string rather than `undefined` — but this convention has not yet been applied at the point the feedback payload is built.
- **Store-level validation-error translation**: `ValidationError.fromParsedError(errorData.error)` inside a store's `catch`, then either `throw validationError` (for a form to map field errors) or fall through to a generic `Error` with a friendly message — established in `src/store/auth.ts` lines 45-49 and 68-72, and referenced by several other pages/stores (see Integration Points). This is the direct precedent for "don't expose `body.response Field required` directly."
- **Toaster call-site discipline**: per `.ai-run/guides/development/api-integration.md` (line 148) and `error-handling-patterns.md` (line 171), "toasts are called from stores only (never components)" and "the API client shows toaster notifications automatically on errors... unless customizing the message" (i.e., pass `skipErrorHandling: true` and show a custom one when the default would be misleading/raw).
- **`skipErrorHandling` option**: `RequestOptions.skipErrorHandling` (api.ts line 85) is the mechanism a caller uses to suppress the automatic generic toast and substitute its own — used elsewhere in the codebase (not exhaustively enumerated here) whenever a caller needs a friendlier message than the generic pipeline produces.
- **Optimistic UI + revert-on-catch**: both `submitFeedback` and `submitLikeFeedback` in `MessageFeedbackActions.tsx` set `mark` optimistically before the await and revert it (`setMark(oldMark)`) in the `catch` — this pattern must be preserved by any fix, and any new error UX (toast, popup-stays-open behavior) needs to compose with it rather than replace it.
- No factory/registry/DI pattern governs this feature area — it is plain Valtio store + React component, consistent with the rest of `src/pages/chat`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/development/api-integration.md` — canonical guide for this fix's HTTP layer. Section "Error Handling" (lines 144-181) documents: default automatic toaster behavior, the `skipErrorHandling` opt-out, and "Check response status" pattern. Section "Toast Notifications" equivalent lives in the sibling guide below.
- `.ai-run/guides/development/error-handling-patterns.md` — canonical guide for this fix's UX layer. Documents the four-layer responsibility split (API Client / Store / Component / Error Boundary — lines with the responsibility table near the top), the `src/store/assistants.ts` reference pattern for store-level `try/catch/finally` + `toaster.error`, and the Toast Notifications table (lines 161-171): `toaster.success` for "Completed mutations", `toaster.error` for failures, `toaster.info` for "Neutral status updates". Note: the current feedback success path uses `toaster.info('Thank you for your feedback')` rather than `toaster.success`, which is a mismatch against this guide's own categorization of a completed mutation — relevant context for anyone deciding whether to touch the success toast as part of this fix.
- No guide file specifically named for "feedback" exists; the feedback flow is treated as an ordinary store mutation and is expected to follow the two guides above.

### Architectural Decisions

- No ADRs or dedicated decision records found for the feedback feature specifically.
- The closest recorded "decision" is implicit in the code: `src/store/auth.ts`'s use of `ValidationError.fromParsedError` establishes that backend 422/validation payloads for this app are expected to arrive as `{ error: { details: [{loc, msg}, ...] } }` and are expected to be translated to friendly messages at the store boundary before reaching `toaster.error` — the feedback path is the outlier that does not yet follow this.
- No inline `NOTE:`/`HACK:`/`ADR:`/`DECISION:` markers found in `MessageFeedbackActions.tsx`, `MessageFeedbackPopup.tsx`, `MessageLikeFeedbackPopup.tsx`, or the `submitFeedback`/`deleteFeedback` region of `chats.ts`.

### Derived Conventions

- Guard against an absent `ChatMessage.response` at the point a string is needed, using the same `?? ''` fallback already used for display (see the five call sites above), rather than inventing a new sentinel value.
- Translate backend validation payloads via `ValidationError.fromParsedError` in the store, mirroring `src/store/auth.ts`, if the fix needs to keep surfacing *some* backend-driven messages while suppressing the raw pydantic shape.
- Keep the optimistic-mark-then-revert-on-catch shape in `MessageFeedbackActions.tsx` intact; layer any new user-facing error message inside the existing `catch` blocks rather than restructuring the flow.

---

## 4. Testing Landscape

### Existing Coverage

- No test file exists for `MessageFeedbackActions.tsx`, `MessageFeedbackPopup.tsx`, or `MessageLikeFeedbackPopup.tsx` (`find` for `*.test.*` under `MessageFeedback*` returned nothing).
- No test file exists for `chatsStore.submitFeedback` or `chatsStore.deleteFeedback` specifically — the `src/store/__tests__/chats.*.test.ts` files present (`chats.premiumTipDismissal`, `chats.getChats`, `chats.storageCleanup`, `chats.setOpenChat`, `chats.refreshWorkflowExecutionIds`, `chats.export`, `chats.updateChatListItem`) cover other store actions, none of them feedback.
- `src/utils/__tests__/api.test.ts` covers `handleError` and `formatErrorMessage` generically (including the exact "stringifies object details" case — line 76-81 — that demonstrates how a raw `details` object/array would render in a toast), but has no feedback-specific assertions.
- `src/authentication/local/__tests__/SignUpPage.integration.test.tsx` (lines 86-98) is the closest existing example of a test asserting friendly-vs-raw 422 handling: it mocks a 422 response shaped as `{ detail: [{ loc: ['body','email'], msg: '...' }, ...] }`-style pydantic errors and asserts the UI shows a friendly validation toast/field errors rather than the raw payload — a directly reusable pattern for testing this ticket's fix.

### Testing Framework and Patterns

- Vitest, two projects (`unit`, `integration`) per `vitest.workspace.ts`/`package.json` scripts (`test:unit`, `test:integration`).
- React Testing Library is used for component/integration tests (confirmed via `SignUpPage.integration.test.tsx` and other `*.integration.test.tsx` files under `src/authentication` and `src/pages`).
- Mocking pattern for the API layer: `mockAPI('DELETE', 'v1/assistants/assistant-1', { error: 'Failed to delete' }, 422)`-style helpers appear in integration tests (e.g. `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx:372`) — likely reusable for constructing a mocked `POST v1/feedback` 422 response in a new test.
- `vi.mock('file-saver', ...)`-style module mocking and `toaster` spies (`expect(toaster.error).toHaveBeenCalledWith(...)`) are the established assertion style for error-toast content, per `api.test.ts`.

### Coverage Gaps

- No unit/integration test currently exercises the dislike → `MessageFeedbackPopup` → `submitFeedback` → `chatsStore.submitFeedback` → `api.post('v1/feedback', ...)` path at all, in success or failure.
- No test currently asserts what payload is actually sent to `v1/feedback` (i.e., nothing today would catch a regression where `response` silently drops out of the JSON body again).
- No test currently exercises the like path (`submitLikeFeedback`) for the same missing-`response` defect, even though the code shows the identical construction on both paths.
- No test exercises `deleteFeedback`.
- No test exercises the "message has no response text at all" scenarios named in the ticket's regression check (incomplete / failed / technical-error assistant responses) for the feedback flow specifically, though `chats.refreshWorkflowExecutionIds.test.ts` may cover adjacent `response`-unset behavior for message hydration — not confirmed as covering the feedback flow.

---

## 5. Configuration and Environment

### Environment Variables

- No feedback-specific environment variable found. The only config-gated behavior in this feature area is `CONFIG_LIKE_FORM_KEY` (from `@/constants/common`), read via `isConfigItemEnabled(configs, CONFIG_LIKE_FORM_KEY)` in `MessageFeedbackActions.tsx` (line 114) to decide whether liking a message opens the like-feedback popup or submits immediately with an empty comment — this is a runtime app-config flag (from `appInfoStore`/`configs`), not an `import.meta.env`/`window._env_` variable.
- `src/utils/api.ts` reads `VITE_API_URL` (`window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL`, line 143) for `BASE_URL` — generic to all API calls including `v1/feedback`, not feedback-specific.

### Configuration Files

- No dedicated config file for the feedback feature. `appInfoStore`'s `configs` (consumed via `useSnapshot(appInfoStore)` in `MessageFeedbackActions.tsx`) is the runtime source for `CONFIG_LIKE_FORM_KEY` — its own config source (backend-driven feature-config endpoint) is outside this pass's scope.

### Feature Flags and Deployment Concerns

- `CONFIG_LIKE_FORM_KEY` (see above) — toggles whether the like path shows a comment popup at all; does not affect the dislike/negative-feedback path this ticket is centered on, but does affect `submitLikeFeedback`'s identical `response: message.response` defect, since that function runs regardless of which like-path branch triggered it (line 122 direct call, or line 148 via popup submit).
- No Dockerfile, CI/CD, or deployment manifest references to `v1/feedback` or feedback-specific behavior found.

---

## 6. Risk Indicators

- Speculative: the fix will need to guarantee `response` is always a valid string (not `undefined`/`null`) in the outgoing `v1/feedback` payload — the natural mechanism is the same `?? ''` coercion already used at five other `message.response` call sites, applied at (or before) payload construction in `MessageFeedbackActions.tsx` and/or `chatsStore.submitFeedback` in `chats.ts`.
- Speculative: because `submitLikeFeedback` (the like/positive path) has the exact same `response: message.response` construction as the dislike path, a fix scoped only to the dislike/negative modal would leave the identical defect live on the like path — the like path is in scope for the "aligned contract" and regression-check acceptance criteria even though the ticket title only mentions negative feedback.
- Speculative: suppressing raw validation errors (`body.response Field required`) end-to-end likely requires either (a) making the payload always valid so the 422 never occurs, and/or (b) wiring `ValidationError.fromParsedError` (or an equivalent guard) into `chatsStore.submitFeedback`'s error path so any *other* future 422 from this endpoint degrades to a friendly message instead of the generic `formatErrorMessage`'s raw `JSON.stringify(details)` behavior (`src/utils/api.ts:112`) — both are established patterns elsewhere but neither is applied to feedback today.
- Zero existing automated test coverage for the entire feedback submission/deletion flow (component, store, and payload-shape level) is a genuine gap independent of this fix — any change here ships with no regression safety net unless new tests are added.
- `MessageFeedbackActions.tsx`'s two `catch` blocks (dislike and like) currently show no component-level error feedback of their own; whatever change is made to the error UX must decide whether it relies solely on `api.ts`'s generic toast (customized by translating the error shape) or adds an explicit `toaster.error`/inline message in the component/store, and must keep the popup-stays-open vs. closes-on-error behavior deliberate rather than incidental.
- The `toaster.info('Thank you for your feedback')` success message on both paths uses `info`, not `success`, which is a pre-existing inconsistency against this repo's own documented toast-type convention (`error-handling-patterns.md` lines 161-171); whether this is in scope for the "clear success confirmation" acceptance criterion is a product/spec decision, not a research finding.
- The exact upstream conditions under which a *finalized* (non-in-progress) assistant message ends up with a genuinely empty/undefined `response` (the "incomplete, failed, technical-error" regression scenarios named in the ticket) were only partially traced in this pass (`chats.ts:262-268`'s `inProgress`/`generationStopped`/auth-gate handling is adjacent but not confirmed as the exhaustive list) — a full audit of message-finalization code paths was out of scope for this filesystem pass and may be needed before writing regression tests for every named scenario.

---

## 7. Summary for Complexity Assessment

This is a narrowly-scoped frontend fix touching three layers: the component layer (`MessageFeedbackActions.tsx`, where the feedback payload is assembled on both the dislike and, identically, the like path), the state layer (`chatsStore.submitFeedback` in `src/store/chats.ts`, which passes the payload through to `api.post('v1/feedback', ...)` unchanged), and the shared HTTP client layer (`src/utils/api.ts`'s generic error pipeline, which is what currently surfaces — or would surface — a raw validation-error shape via `formatErrorMessage`'s `JSON.stringify(details)`). No backend, database, or migration surface is involved; the task explicitly excludes the sibling backend repo. The change surface is small: a handful of files, no new architectural layer, and the repo already has two directly-reusable precedents to draw from — the `message.response ?? ''` display-coercion convention used at five other call sites, and the `ValidationError.fromParsedError` store-level translation pattern already used in `src/store/auth.ts` and elsewhere for exactly the "don't leak raw pydantic validation errors" requirement this ticket states.

Technical novelty is low — this is applying two established, already-precedented patterns to a code path that happens not to use either yet — but the risk is concentrated in completeness rather than difficulty: the identical defect exists on both the dislike and like paths (the ticket names only the negative/dislike flow), and the acceptance criteria's regression check spans four message states (normal, incomplete, failed, technical-error) whose exact producers in the streaming/finalization code were not fully traced in this pass. Test coverage posture is a real gap: zero existing automated tests touch `MessageFeedbackActions`, `MessageFeedbackPopup`/`MessageLikeFeedbackPopup`, or `chatsStore.submitFeedback`/`deleteFeedback`, so this fix ships without a regression safety net unless tests are added alongside it, and the closest reusable test pattern (`SignUpPage.integration.test.tsx`'s 422/`ValidationError` assertions) lives in a different feature area.

Key risk factors to carry into planning: (1) scope decision on whether the like path is fixed alongside the dislike path given the shared root cause; (2) whether the fix relies purely on guaranteeing a valid payload (avoiding the 422 entirely) or also hardens the generic error pipeline against a raw validation shape reaching the user in any future case; (3) the pre-existing `toaster.info` vs. `toaster.success` convention mismatch on the existing success path, which may or may not be within this ticket's intended scope; (4) the absence of any current test harness for this flow, which affects both verification effort and the shape of any regression tests the acceptance criteria implicitly call for.

---

## 8. External References

None named by the task. The task explicitly names the sibling `codemie` backend repo as the source confirming the `FeedbackRequest.response: str` mandatory-field contract, but directs the research away from investigating it further ("do not investigate the backend repo further ... that repo's model will not be touched by this fix"), so it is treated as already-confirmed background rather than a path to open in this pass.
