# Technical Research

**Task**: mcp clone modal ui admin
**Generated**: 2026-10-12
**Research path**: filesystem

---

## 1. Original Context

Implement the UI-only part of the MCP server Clone form-flow feature in codemie-ui (backend already implemented). Reference story and technical analysis are at /Users/Dzmitry_Shabailau/Documents/Workspace/codemie-dev/codemie/docs/stories/2026-10-09-clone-mcp-form-flow/story.md and /Users/Dzmitry_Shabailau/Documents/Workspace/codemie-dev/codemie/docs/stories/2026-10-09-clone-mcp-form-flow/technical-analysis.md (another repo — read these two files directly for full context, then do your own research in the codemie-ui repo).

Scope: frontend (codemie-ui) only. The codemie backend already implements: POST clone-submission endpoint taking a request body (replacing the old no-body POST /v1/mcp-configs/{id}/clone), and GET /v1/mcp-configs/{id}/suggested-clone-name (read-only, returns the next-available 'Copy {N} of {Name}' suggestion). is_system/is_public now correctly copy from the source record on clone, and client_secret carry-over (existing encrypted secret preserved unless a new value is submitted) is handled server-side — none of that backend logic needs frontend research beyond knowing the two endpoint contracts/shapes.

UI changes needed (research current code to confirm exact locations/shapes, do not just restate this list):
- Remove the ConfirmationModal clone-confirmation step in MCPServerActions.tsx (showCloneConfirmation/confirmClone wiring) — Clone should open the form modal directly, no confirmation step.
- Add a third 'Clone' mode to MCPServerModal/index.tsx (title 'Clone MCP Server', submit label 'Clone Server'), alongside existing Add/Edit modes (today only Add/Edit exist, switched on `props.server` presence).
- useMCPServerModal.ts / modalHelpers.ts: prefill all fields from the source server (same pattern as existing edit-prefill `reset(getFormValuesFromServer(server))`), with the name field prefilled from the suggested-clone-name endpoint response, fetched when the row-menu Clone action is clicked, and left freely editable.
- store/mcp.ts: add a method to call the new clone-submission endpoint (replacing today's no-body cloneConfig POST) and a method to fetch the suggested name from the new GET endpoint.
- useMCPManagement.ts: handleModalSubmit needs a clone-submit branch (new record created only on modal submit, not on row-menu click); remove/replace the old handleCloneServer/cloningRef dispatch-on-click flow.
- Error handling and post-submit UX must be identical to Edit (toast for server/API errors, inline yup validation for field errors, modal closes and new row appears without page reload on success) — no clone-specific error UI.
- client_secret field must stay masked/never populated with the real value on clone prefill, same as it behaves for Edit today (the backend never sends the real secret, only has_client_secret) — note this modal edits the whole config as one raw JSON textarea, no dedicated secret field.
- Rewrite MCPServerActions.clone.test.tsx (currently tests the confirmation-popup lifecycle) and identify what new test coverage is needed for MCPServerModal's Clone mode and the name-suggestion fetch trigger.

feature_area: "mcp clone modal ui admin"

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/components/MCPServerActions.tsx` (147 lines): row menu built from a `menuActions` array; Clone item (lines 89-95) calls `showCloneConfirmation` which opens a second `ConfirmationModal` (132-141, header `Clone "{name}"?`, confirm text `Clone Server`) whose `onConfirm={confirmClone}` calls `await onClone(server)` (64-72) with local `isCloning` state. `onClone: (server: MCPConfig) => Promise<void>` and `cloning: boolean` are props passed in from the page/hook. No form is shown before the confirmation fires `onClone`.
- `src/pages/settings/administration/components/MCPServerModal/index.tsx` (305 lines): single component for Add/Edit, switched purely on `props.server` truthiness — header `props.server ? 'Edit MCP Server' : 'Add MCP Server'` (line 92), submit label via `getSubmitButtonText()` (61-64, `props.server ? 'Update Server' : 'Create Server Configuration'`). `MCPServerModalProps` = `{ visible, server: MCPConfig | null, onHide, onSubmit: (data: Partial<MCPConfigRequest>) => Promise<void> }` — there is no `mode` prop today. The entire `config` (including `auth_config`) is edited as one raw JSON `Textarea` bound to form field `serverConfig` (lines 223-240); no dedicated `client_secret` input exists anywhere in this file.
- `src/pages/settings/administration/components/MCPServerModal/useMCPServerModal.ts` (127 lines): `useForm({ resolver: yupResolver(mcpServerSchema), defaultValues: getDefaultFormValues() })`; the prefill effect (65-71) is `if (visible && server) reset(getFormValuesFromServer(server)); else if (visible) reset(getDefaultFormValues())` — this is the exact pattern the task names for reuse. `onFormSubmit` (73-81) calls `transformFormDataToSubmit(data)` then `onSubmit(submitData)` then `handleClose()`; errors are only `console.error`'d, not toasted — toasting therefore must happen in the caller (`handleModalSubmit` in `useMCPManagement.ts`) which today has no try/catch at all (see below), not inside this hook.
- `src/pages/settings/administration/components/MCPServerModal/modalHelpers.ts`: `getDefaultFormValues()`, `getFormValuesFromServer(server)` (31-40, maps `server.name/description/categories/logo_url/server_home_url/source_url/required_env_vars`, and `serverConfig: JSON.stringify(server.config, null, 2)`), `transformFormDataToSubmit(data)` (42-65, parses `serverConfig` back to `config` and builds `Partial<MCPConfigRequest>`). None of these three functions reference a name-suggestion value or any clone-specific field today.
- `src/pages/settings/administration/components/mcpServerValidation.ts`: `mcpServerSchema` (yup) validates `name`, `description`, `server_home_url`, `source_url`, `icon_url`, `categories` (max 3), `serverConfig` (required + JSON-parseable), `required_env_vars`. No field distinguishes Add/Edit/Clone — the same schema would apply to a Clone mode.
- `src/store/mcp.ts` (386 lines): `createConfig` (`POST v1/mcp-configs`, 204-225), `cloneConfig(id)` (`POST v1/mcp-configs/{id}/clone`, **no body**, 239-265, explicitly documented as *not* toggling the shared `loading` flag since it's a per-row op), `updateConfig(id, data)` (`PUT v1/mcp-configs/{id}`, 283-308). All three follow the same shape: set `this.error = null`, call `api.*`, `await response.json()`, mutate `this.configs`/`this.pagination`, catch → format `error.response?.data?.message ?? error.message` into `this.error` and rethrow. No method today calls any `GET .../suggested-clone-name`-shaped endpoint.
- `src/pages/settings/administration/hooks/useMCPManagement.ts` (166 lines): `handleModalSubmit` (73-93) branches only `editingServer ? updateConfig : createConfig` — no third branch exists; it has no try/catch (errors from the store propagate up to whatever calls `onSubmit`, i.e. `MCPServerModal`'s `useMCPServerModal.onFormSubmit`, which only `console.error`s them — meaning **today there is no toast on update/create API failure visible in this file**; the task's requirement for "toast for server/API errors, identical to Edit" needs tracing further, but at minimum there is no clone-specific error path to remove). `handleCloneServer` (101-117) is a separate dispatch-on-click flow guarded by `cloningRef`/`cloningIds` (both keyed per-row by server id) that calls `mcpStore.cloneConfig(server.id)` directly and toasts via `toaster.error(...)` on failure — this whole function plus the `cloningRef`/`cloningIds` state is the "dispatch-on-click" flow the task says must be removed/replaced. `handleEditServer` (63-66) sets `editingServer` + opens the modal — the pattern a Clone-trigger handler should mirror (set a servers-to-clone-from state, fetch the suggested name, open modal) instead of calling the store directly.
- `src/pages/settings/administration/MCPManagementPage.tsx`: wires `canClone = isAdmin || isMaintainer` (line 74), passes `handleCloneServer`, `canClone`, `cloningIds` down to the table/actions, and renders `<MCPServerModal>` (177) with `editingServer`, `handleModalClose`, `handleModalSubmit`. This is the integration point where a Clone-specific `cloningServer`/mode state and the modal's `server`/new `mode` prop would need to be threaded through.
- `src/types/entity/mcp.ts`: `MCPConfig` (42-62, includes `is_public`, `is_system`, full `config`), `MCPConfigRequest` (64-75, **no `is_system` field** — matches backend gap noted in the referenced technical-analysis), `MCPServerConfig` (24-34, includes `auth_config?: Record<string, unknown>` as an untyped dict — consistent with the backend's raw-dict `auth_config`).

### Architecture and Layers Affected

- Frontend feature components: `MCPServerActions.tsx` (row menu + confirmation removal), `MCPServerModal/index.tsx` + `useMCPServerModal.ts` + `modalHelpers.ts` (new Clone mode, prefill, name-suggestion fetch trigger).
- Page-level hook: `useMCPManagement.ts` (new clone-submit branch in `handleModalSubmit`, removal of `handleCloneServer`/`cloningRef`/`cloningIds`).
- State store: `src/store/mcp.ts` (replace/retire `cloneConfig`, add a clone-submission method and a suggested-name fetch method).
- Validation: `mcpServerValidation.ts` — likely unchanged (same schema serves Add/Edit/Clone).
- Page composition: `MCPManagementPage.tsx` (prop wiring changes as the above hooks' return shapes change).

### Integration Points

- Frontend talks to the backend only through `src/utils/api.ts`'s thin `api.get/post/put/delete` wrappers (no intermediate service layer) — both new store methods (clone-submission POST, suggested-name GET) follow the same call shape as `createConfig`/`cloneConfig` above.
- `canClone` gating (`isAdmin || isMaintainer` in `MCPManagementPage.tsx`) is the only UI-side permission check for Clone; it is unchanged by this task but must still gate the new Clone-mode-trigger handler the same way it gates today's `showCloneConfirmation`.
- `useMcpEnabled()` / `isMcpFeatureEnabled` gates whether `MCPManagementPage` renders at all — outer flag, unrelated to this task specifically.

### Patterns and Conventions

- One shared modal component switched by a presence/enum prop (`props.server` today); `react-hook-form` + `yup` (`yupResolver`) for validation; Valtio `proxy` store for list state with optimistic `unshift`/`findIndex` mutation on create/update, matching what a clone-submit path should do too.
- Per-row async-state tracking via a `Set` state + a `useRef` synchronous guard against double-dispatch (seen in `cloningIds`/`cloningRef`) — this exact pattern will need to move from "guard against double-clone-on-click" to "guard against double name-suggestion-fetch-on-click" if the fetch itself needs debouncing, or can be dropped entirely since no mutation happens on click anymore.
- Error formatting convention across all store methods: `error.response?.data?.message ?? error.message`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/modal-patterns.md`, `.ai-run/guides/patterns/form-patterns.md`, and `.ai-run/guides/patterns/state-management.md` are the P0/P1 guides this repo's AGENTS.md routes "Forms & Modals" and "State" tasks to; not opened in depth here since the existing `MCPServerModal`/`useMCPServerModal`/`mcpStore` code already demonstrates the concrete conventions to follow for this specific feature.
- No guide file is clone-specific; conventions are derived from the existing Add/Edit modal and store code (Section 2).

### Architectural Decisions

- None found specific to MCP clone in this repo's docs. The companion `codemie` repo's story/technical-analysis (read in full per task instructions) documents the backend-side decisions (is_system/is_public copy-from-source, `_prepare_auth_config_for_persistence` update-style call with `existing_encrypted_secret`) that this frontend work depends on but does not need to re-implement.
- Prior task artifacts exist at `docs/superpowers/tasks/2026-10-06-clone-mcp-config-ui/`, `docs/superpowers/tasks/2026-10-07-mcp-clone-flow-ux/`, and `docs/stories/2026-10-06-mcp-clone-flow-ux/` / `docs/stories/2026-10-06-mcp-clone-flow-redesign/` in this repo — these are prior-iteration history for the confirmation-popup flow being replaced now; not re-read in full here, but their existence confirms the confirmation-modal flow was a deliberate earlier design that this task intentionally supersedes.

### Derived Conventions

- Modal mode switching: today boolean (`props.server` truthy/falsy); extending to three states (Add/Edit/Clone) needs either a new explicit `mode` prop or continuing to overload `server` plus a second discriminator (e.g. a `isCloning`/`sourceServer` prop) — a design decision for planning, not resolved by research.
- Name-suggestion fetch: no existing "fetch on menu-item click, before modal opens" pattern exists elsewhere in this codebase to copy; `handleEditServer`'s synchronous `setEditingServer` + `setShowModal(true)` is the closest existing analog, but it has no async step before opening.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx` (113 lines, vitest + RTL): mocks `ConfirmationModal` as a bare `<dialog>`, and asserts the confirmation-popup lifecycle — opens naming the server with no call yet, Cancel closes with no call, Confirm fires exactly one `onClone` call, disables only the confirm button while in flight, and closes on resolve. Every assertion in this file depends on the `ConfirmationModal`/`showCloneConfirmation`/`confirmClone` wiring that this task removes — full rewrite needed, not an incremental edit.
- `src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts`: has a dedicated `describe('useMCPManagement - clone flow', ...)` block testing `handleCloneServer` directly against a mocked `mcpStore.cloneConfig` — fires exactly one call with the source id, guards double-dispatch synchronously, toasts `error.response.data.message` or the fallback `'Failed to clone MCP server'` on failure, and tracks two concurrent per-row clones independently via `cloningIds`. This entire `describe` block tests code (`handleCloneServer`, `cloningRef`, `cloningIds`) that the task says to remove/replace — needs a parallel rewrite, not just the component test.
- No existing test exercises `MCPServerModal` in any mode-switching capacity beyond Add vs Edit (title/submit-label), and no test exists anywhere for a "fetch a suggestion on menu click before a modal opens" interaction — this is new ground.

### Testing Framework and Patterns

- `vitest` + `@testing-library/react`; icon modules are mocked via `vi.mock('@/assets/icons/....svg?react', () => ({ default: () => <span /> }))`; `ConfirmationModal` mocked to a bare controllable `<dialog>` for assertions; store methods mocked via `vi.mocked(mcpStore.cloneConfig).mockResolvedValue(...)`/`mockRejectedValue(...)`; `renderHook`-style testing for `useMCPManagement`.
- Toaster assertions use `vi.mock` of `@/utils/toaster` then `expect(toaster.error).toHaveBeenCalledWith(...)`.

### Coverage Gaps

- No test exists today for `MCPServerModal` rendering in a third ("Clone") mode — title, submit-label, and prefill-from-source-with-suggested-name all need new coverage.
- No test exists for the name-suggestion fetch being triggered specifically on the row-menu Clone click (timing: before vs. as part of opening the modal).
- No test exists for a clone-submit branch in `handleModalSubmit` (new record created only on submit, not on click) — today's `useMCPManagement.test.ts` clone-flow tests exercise the opposite (dispatch-on-click) behavior and will need to be replaced with submit-time assertions.
- No test exists asserting the clone-prefilled `serverConfig` JSON textarea omits `client_secret` (mirrors existing Edit behavior, but is not explicitly asserted for Edit either, per a search of `modalHelpers`/`useMCPServerModal` test files — none exist for these two files today; only `MCPServerActions.clone.test.tsx` and `useMCPManagement.test.ts` cover any clone-adjacent code at all).

---

## 5. Configuration and Environment

### Environment Variables

- None specific to clone. `useMcpEnabled()` reads the general MCP feature flag (outer gate on the whole management page), unrelated to this task specifically.

### Configuration Files

- None specific to this feature.

### Feature Flags and Deployment Concerns

- This frontend change depends on the backend's two new endpoints already existing (per task_context, already implemented) — sequencing risk is backend-owned and out of scope here, but the frontend must not call the old no-body `POST /v1/mcp-configs/{id}/clone` once this change ships, since the task states it is being replaced.

---

## 6. Risk Indicators

- Speculative: `useMCPServerModal`'s `onFormSubmit` only `console.error`s a caught error (line 78-79) rather than toasting it; today's Edit/Add error-to-toast behavior (if it exists at all) must live somewhere above this hook — likely needs adding/confirming in `handleModalSubmit` or deeper in `mcpStore.updateConfig`/`createConfig`'s callers, not assumed already present, before "identical to Edit" error UX can be verified for the new Clone branch.
- Speculative: extending `MCPServerModal`'s mode switch from a boolean (`props.server` presence) to three states (Add/Edit/Clone) is a structural prop-shape change touching `MCPServerModalProps`, `UseMCPServerModalProps`, and every call site (`MCPManagementPage.tsx`) — not a localized edit.
- Speculative: because `auth_config`/`client_secret` are never surfaced as structured fields (only inside the raw JSON `serverConfig` textarea), "keeping client_secret masked on clone prefill" is automatically satisfied only if `getFormValuesFromServer`'s `JSON.stringify(server.config, null, 2)` is reused unmodified for Clone — any new Clone-specific transform of `server.config` risks reintroducing a masking regression.
- The existing `MCPServerActions.clone.test.tsx` and the `clone flow` block in `useMCPManagement.test.ts` both encode the confirmation-popup/dispatch-on-click behavior being removed — expect near-total rewrite of both, not incremental patching, with a high risk of silently losing a currently-tested guarantee (e.g. the double-dispatch guard) if the replacement tests don't re-derive an equivalent one for the new flow (e.g. double-fetch-of-suggested-name guard).
- No existing frontend code calls a `GET` endpoint synchronously tied to a menu-item click before a modal opens — the closest analogs (`getConfig`, `indexConfigs`) are page-load/data-fetch patterns, not click-triggered single-field prefills; loading/error state for this fetch (e.g. "what does the modal show if the suggested-name fetch fails or is slow") is undecided and not covered by any existing pattern in this repo.

---

## 7. Summary for Complexity Assessment

This is a frontend-only change touching four files directly (`MCPServerActions.tsx`, `MCPServerModal/index.tsx`, `useMCPServerModal.ts`, `modalHelpers.ts`) plus two supporting layers (`useMCPManagement.ts`'s `handleModalSubmit`/removal of `handleCloneServer`+`cloningRef`+`cloningIds`, and `store/mcp.ts`'s replacement of `cloneConfig` with a body-taking clone-submission call plus a new suggested-name GET call), with `MCPManagementPage.tsx` needing prop-wiring updates to match. No new DB/schema/backend work is in scope; the two backend endpoint contracts are given facts, not things to design.

Technical novelty is low-to-moderate: every primitive needed (form prefill via `reset(getFormValuesFromServer(server))`, yup validation, Valtio store POST/GET wrapper methods, toast-on-error, per-row async guard via `Set`+`useRef`) already exists in this codebase in a directly analogous shape; the work is recombination into a third modal mode and a new click-to-fetch interaction, not new architecture. The main sources of complexity are (a) extending a boolean Add/Edit mode switch to three states across several files' prop shapes, (b) correctly timing/guarding the new name-suggestion fetch on menu click without reintroducing a dispatch-on-click side effect, and (c) confirming where (if anywhere) today's Edit flow actually toasts server errors, since `useMCPServerModal.onFormSubmit` itself only logs them.

Test coverage posture is weak for the exact combination this task needs: the two existing clone-adjacent test files (`MCPServerActions.clone.test.tsx`, the clone-flow block in `useMCPManagement.test.ts`) test the flow being removed and need near-complete rewrites, and there is no existing test for `MCPServerModal` in any non-Add/Edit mode or for a click-triggered prefetch — this is new ground for the test suite, not just updated assertions on existing ground.

---

## 8. External References

- `/Users/Dzmitry_Shabailau/Documents/Workspace/codemie-dev/codemie/docs/stories/2026-10-09-clone-mcp-form-flow/story.md`: resolved. Key facts used: acceptance criteria require the Clone modal to open directly (no confirmation step) titled "Clone MCP Server", prefilled including a server-suggested `"Copy {N} of {Name}"` name that stays editable; no record is created before modal submit; is_system/is_public must match the source (private stays private, system/public stays system/public); client_secret carries over unchanged unless the admin types a new value, in which case the new value is freshly encrypted; all other fields (headers, env, args, url, auth_token, categories, description) carry over and remain editable; errors surface identically to Edit (toast for server/API errors, inline yup validation); on success the modal closes and the new server appears without a page reload. Out of scope: no change to how `client_secret` is edited for Edit itself, no change to headers/env/args/auth_token/url exposure, no re-adding of field-stripping/clone-policy, no atomic reservation of the suggested name (a submit-time collision surfaces the standard create duplicate-name error, no auto-increment retry).
- `/Users/Dzmitry_Shabailau/Documents/Workspace/codemie-dev/codemie/docs/stories/2026-10-09-clone-mcp-form-flow/technical-analysis.md`: resolved. Key facts used (frontend-relevant subset; this document already contains a detailed prior frontend research pass that this document's own Section 2 independently re-verified against current code): `MCPServerActions.tsx`'s Clone item today wires `showCloneConfirmation`→`ConfirmationModal`→`confirmClone`→`onClone(server)`, to be removed; `MCPServerModal/index.tsx` has no third mode/title concept yet and edits the whole `config` as one raw JSON textarea with no dedicated `client_secret` field — "masking" is incidental (backend never sends the real secret, only `has_client_secret`); `useMCPServerModal.ts`'s edit-prefill pattern (`reset(getFormValuesFromServer(server))`) is the named reuse target for Clone prefill; `useMCPManagement.ts`'s `handleCloneServer` dispatches `mcpStore.cloneConfig(server.id)` on click guarded by `cloningRef`/`cloningIds`, to be replaced by a submit-time branch; `store/mcp.ts`'s `cloneConfig` calls the old no-body `POST .../clone`, to be replaced; backend now exposes `GET /v1/mcp-configs/{id}/suggested-clone-name` (read-only, no DB write) and a new body-taking clone-submission endpoint, confirmed as already implemented per this task's own scope statement. Also flagged (not directly actionable by this frontend-only document, but informative): the backend's `codemie-enterprise` SAML/auth-type package could not be inspected in that research pass (unresolved external dependency, backend-side open question, out of scope for this frontend task).
