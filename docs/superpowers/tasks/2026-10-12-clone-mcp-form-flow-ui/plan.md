# MCP Server Clone Form-Flow (UI-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Clone confirmation-popup flow with a flow that fetches a suggested name, then opens the existing Add/Edit modal in a new "Clone" mode, prefilled from the source server, creating the new record only on modal submit.

**Architecture:** Extend `MCPServerModal` with an explicit `mode: 'add' | 'edit' | 'clone'` prop (plus a `cloneSource`/`suggestedName` pair for Clone's prefill), add two `store/mcp.ts` methods (`fetchSuggestedCloneName`, `cloneConfigFromForm`) following the exact create/update shape, add a clone-submit branch to `useMCPManagement.ts`'s `handleModalSubmit`, and replace `MCPServerActions.tsx`'s confirmation-popup wiring with a blocking name-fetch-then-open-modal click handler. Add toast-on-error to the shared submit path so Edit and Clone are provably identical.

**Tech Stack:** React 18, TypeScript, react-hook-form + yup, Valtio store, Vitest + RTL.

Commit per task using the repository's existing convention.

## Global Constraints

- Do NOT add any confirmation-popup step before the Clone modal opens.
- Do NOT create/mutate any record from the name-suggestion fetch (GET only); the new record is created only on "Clone Server" click inside the modal.
- Do NOT introduce any new transform of `server.config` for Clone prefill — reuse `getFormValuesFromServer` unmodified (same `JSON.stringify(server.config, null, 2)` path Edit uses).
- Do NOT add clone-specific error UI — fix the one shared toast-on-error path so Edit and Clone both use it, not a second mechanism.
- Do NOT re-add copy_values/field-stripping logic.
- Do NOT implement atomic name reservation/auto-increment retry — a submit-time duplicate-name collision surfaces the standard create/update error.
- Do NOT call the old no-body `POST /v1/mcp-configs/{id}/clone` after this ships.
- Out of scope: any backend change; Edit's own client_secret editing UI; headers/env/args/auth_token/url exposure changes.

---

## Acceptance criteria

- [ ] Clicking "Clone" opens a modal titled "Clone MCP Server" directly, no confirmation step, fields prefilled from the source server.
- [ ] Name field is prefilled with the server-suggested "Copy {N} of {Name}" value and stays editable.
- [ ] No record is created until "Clone Server" is clicked inside the modal.
- [ ] is_public/is_system/client_secret/headers/env/args/url/auth_token/categories/description all carry over as prefilled, editable values and are passed through to the clone-submission endpoint exactly as create/update do today.
- [ ] client_secret prefill is masked identically to Edit (no new `server.config` transform for Clone).
- [ ] Validation errors, duplicate-name collisions, and server errors on submit display identically to Edit (toast for server/API errors, inline yup validation) — includes fixing Edit's own silent-`console.error` gap so both are provably identical.
- [ ] On success, modal closes and new server appears in the list without a page reload.
- [ ] Menu item shows a brief loading state while the suggested-name fetch is in flight; on fetch failure, a toast fires and the modal does NOT open.

---

### Task 1: Store — replace `cloneConfig` with `cloneConfigFromForm` + add `fetchSuggestedCloneName`

**Files:**
- Modify: `src/store/mcp.ts:239-265` (replace `cloneConfig(id)`)
- Test: `src/store/__tests__/mcp.test.ts` (new or existing — add a describe block)

**Interfaces:**
- Produces: `mcpStore.cloneConfigFromForm(id: string, data: Partial<MCPConfigRequest>): Promise<MCPConfig>` — `POST v1/mcp-configs/${id}/clone` with `data` as body, same `this.error`/`this.configs.unshift`/`this.pagination.totalCount += 1` / catch-rethrow shape as `createConfig` (src/store/mcp.ts:204-225).
- Produces: `mcpStore.fetchSuggestedCloneName(id: string): Promise<string>` — `GET v1/mcp-configs/${id}/suggested-clone-name`, `await response.json()`, returns `result.suggested_name`; no `this.configs`/`this.pagination` mutation (pure read); same `this.error` catch-rethrow convention.

**Test-first: yes — write a failing test asserting `cloneConfigFromForm('id-1', data)` POSTs to `v1/mcp-configs/id-1/clone` with `data` as body and unshifts the result into `this.configs`, and a second failing test asserting `fetchSuggestedCloneName('id-1')` GETs `v1/mcp-configs/id-1/suggested-clone-name` and resolves to `result.suggested_name` without touching `this.configs`.**

- [ ] Write the two failing tests above (mock `api.post`/`api.get` the same way existing `createConfig`/`updateConfig` tests do).
- [ ] Run tests, confirm failure (methods don't exist yet).
- [ ] Implement both methods in `store/mcp.ts`, delete the old `cloneConfig`.
- [ ] Run tests, confirm pass.
- [ ] Commit.

---

### Task 2: `MCPServerModal` — add explicit Clone mode

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerModal/index.tsx:34-39,61-64,92` (props + title/submit-label switch)
- Modify: `src/pages/settings/administration/components/MCPServerModal/useMCPServerModal.ts:32-37,65-71` (props + prefill effect)
- Test: `src/pages/settings/administration/components/MCPServerModal/__tests__/MCPServerModal.clone.test.tsx` (new)

**Interfaces:**
- Produces: `MCPServerModalProps` becomes `{ visible, mode: 'add' | 'edit' | 'clone', server: MCPConfig | null, cloneSource?: MCPConfig | null, suggestedName?: string, onHide, onSubmit }`. `server` stays the Edit-prefill source (unchanged meaning); `cloneSource`/`suggestedName` are Clone-only and ignored in Add/Edit modes.
- Consumes: nothing new from other tasks.

**Test-first: yes — failing test rendering `<MCPServerModal mode="clone" cloneSource={server} suggestedName="Copy 2 of Foo" server={null} .../>` asserts the header is "Clone MCP Server", the submit button reads "Clone Server", and the `name` field's initial value is `"Copy 2 of Foo"` (not the source's literal name).**

- [ ] Write the failing test (reuse the existing icon/svg mocks from `MCPServerActions.clone.test.tsx` as needed for this directory).
- [ ] Run test, confirm failure (no `mode` prop, no "Clone Server" text, prefill untouched).
- [ ] In `useMCPServerModal.ts`, change the prefill effect to:
  `if (visible && mode === 'edit' && server) reset(getFormValuesFromServer(server)); else if (visible && mode === 'clone' && cloneSource) reset({ ...getFormValuesFromServer(cloneSource), name: suggestedName ?? cloneSource.name }); else if (visible) reset(getDefaultFormValues())`.
- [ ] In `index.tsx`, change header to `mode === 'edit' ? 'Edit MCP Server' : mode === 'clone' ? 'Clone MCP Server' : 'Add MCP Server'` and `getSubmitButtonText()` to add the `mode === 'clone' ? 'Clone Server'` branch (keep `isSubmitting` precedence first).
- [ ] Run test, confirm pass.
- [ ] Commit.

---

### Task 3: Shared toast-on-error for modal submit (Edit and Clone identical)

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerModal/useMCPServerModal.ts:73-81` (`onFormSubmit`'s catch)
- Test: `src/pages/settings/administration/components/MCPServerModal/__tests__/useMCPServerModal.test.ts` (new, or extend if one exists)

**Interfaces:**
- Consumes: `toaster.error(text: string)` from `@/utils/toaster` (same API `useMCPManagement.ts`'s old `handleCloneServer` used).

**Test-first: yes — failing test: when `onSubmit` rejects with `{ response: { data: { message: 'boom' } } }`, `toaster.error` is called with `'boom'` and the modal does not close (no `handleClose()` call).**

- [ ] Write the failing test (mock `@/utils/toaster`, call the hook's `onFormSubmit` with a rejecting `onSubmit`).
- [ ] Run test, confirm failure (today only `console.error`s).
- [ ] Replace the `catch` block in `onFormSubmit` with `toaster.error(error?.response?.data?.message ?? error?.message ?? 'Failed to save MCP server')` (no `handleClose()` on error — unchanged from today's success-only `handleClose()` call).
- [ ] Run test, confirm pass; also run the existing Edit success-path test to confirm no regression.
- [ ] Commit.

---

### Task 4: `useMCPManagement.ts` — clone-submit branch, remove dispatch-on-click flow

**Files:**
- Modify: `src/pages/settings/administration/hooks/useMCPManagement.ts:27-41` (state), `:73-93` (`handleModalSubmit`), `:100-117` (delete `handleCloneServer`/`cloningRef`/`cloningIds`), return block `:144-165`
- Test: `src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts:63-162` (rewrite the whole `'useMCPManagement - clone flow'` describe block)

**Interfaces:**
- Produces: `modalMode: 'add' | 'edit' | 'clone'`, `cloneSource: MCPConfig | null`, `suggestedCloneName: string | undefined`, `fetchingCloneNameId: string | null`, `handleCloneMenuClick(server: MCPConfig): Promise<void>` (fetches suggested name via `mcpStore.fetchSuggestedCloneName`, sets `fetchingCloneNameId` for the guard, opens the modal in clone mode on success, toasts and does not open on failure — single scoped guard, not a `Set`).
- `handleModalSubmit` gains a third branch: `modalMode === 'clone' && cloneSource ? await mcpStore.cloneConfigFromForm(cloneSource.id, data) : editingServer ? await mcpStore.updateConfig(...) : await mcpStore.createConfig(...)`.
- Removes: `cloningIds`, `cloningRef`, `handleCloneServer` entirely.

**Test-first: yes — rewrite the `'useMCPManagement - clone flow'` block: (a) `handleCloneMenuClick` calls `fetchSuggestedCloneName` once, then opens the modal (`showModal === true`, `modalMode === 'clone'`, `cloneSource` set, `suggestedCloneName` set) with no record created; (b) on `fetchSuggestedCloneName` rejection, toasts and `showModal` stays `false`; (c) `handleModalSubmit` in clone mode calls `cloneConfigFromForm(cloneSource.id, data)` exactly once and not `createConfig`/`updateConfig`.**

- [ ] Rewrite the three cases above as failing tests against the new shape (drop the old `cloneConfig`/`handleCloneServer`-dispatch-on-click assertions entirely).
- [ ] Run tests, confirm failure.
- [ ] Implement `handleCloneMenuClick`, the clone branch in `handleModalSubmit`, and delete `handleCloneServer`/`cloningRef`/`cloningIds`.
- [ ] Run tests, confirm pass.
- [ ] Commit.

---

### Task 5: `MCPServerActions.tsx` — remove confirmation popup, wire blocking fetch-then-open

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerActions.tsx:30-38` (props), `:49-72` (remove clone confirmation state/handlers), `:89-95` (menu item), `:132-141` (remove the clone `ConfirmationModal`)
- Test: `src/pages/settings/administration/components/__tests__/MCPServerActions.clone.test.tsx` (full rewrite)

**Interfaces:**
- Consumes: `onCloneClick: (server: MCPConfig) => Promise<void>` (replaces `onClone`), `cloningNameFetchPending: boolean` (replaces `cloning`, drives the menu item's loading/disabled state while the name fetch is in flight).
- Removes: `isCloneConfirmationVisible`/`showCloneConfirmation`/`cancelClone`/`confirmClone`/`isCloning` and the second `ConfirmationModal`.

**Test-first: yes — rewrite the file: (a) clicking "Clone" calls `onCloneClick(server)` directly with no dialog ever appearing; (b) while `onCloneClick`'s promise is pending, the Clone menu item shows disabled/loading and `onCloneClick` is not called a second time on a repeat click; (c) when `onCloneClick` rejects, no dialog appears and the item returns to its normal (non-loading) state.**

- [ ] Rewrite `MCPServerActions.clone.test.tsx` with the three cases above (drop every `ConfirmationModal`-for-clone assertion; keep the Delete `ConfirmationModal` mock/tests untouched).
- [ ] Run tests, confirm failure.
- [ ] Remove the clone-confirmation state/handlers/`ConfirmationModal`, wire the `Clone` menu item's `onClick` to `onCloneClick(server)` directly, drive `disabled`/loading styling off `cloningNameFetchPending`.
- [ ] Run tests, confirm pass.
- [ ] Commit.

---

### Task 6: Wire `MCPManagementPage.tsx` + `columnRenderers.tsx` to the new shapes

**Files:**
- Modify: `src/pages/settings/administration/utils/columnRenderers.tsx:22-29,90-99` (`ColumnRenderersProps`, `actions` renderer)
- Modify: `src/pages/settings/administration/MCPManagementPage.tsx:82-97,120-138,177-182` (destructure new hook fields, pass `mode`/`cloneSource`/`suggestedName` to `MCPServerModal`, pass `onCloneClick`/`cloningNameFetchPending` through `createColumnRenderers`)

**Interfaces:**
- Consumes: `modalMode`, `cloneSource`, `suggestedCloneName`, `fetchingCloneNameId`, `handleCloneMenuClick` from Task 4's `useMCPManagement`; `onCloneClick`/`cloningNameFetchPending` props from Task 5's `MCPServerActions`; `mode`/`cloneSource`/`suggestedName` props from Task 2's `MCPServerModal`.

**Test-first: no — this task only re-wires prop names/values through already-tested components; no new branching logic is introduced here, so no new test is meaningful beyond the ones already written in Tasks 2, 4 and 5.**

- [ ] Update `ColumnRenderersProps` and the `actions` renderer in `columnRenderers.tsx` to accept and forward `onCloneClick`/`cloningNameFetchPending` instead of `handleCloneServer`/`cloningIds`.
- [ ] Update `MCPManagementPage.tsx` to destructure the new `useMCPManagement` fields, pass `mode={modalMode}` / `cloneSource` / `suggestedName={suggestedCloneName}` to `<MCPServerModal>`, and pass `onCloneClick={handleCloneMenuClick}` / `cloningNameFetchPending={fetchingCloneNameId === item.id}` into `createColumnRenderers`.
- [ ] Commit.
