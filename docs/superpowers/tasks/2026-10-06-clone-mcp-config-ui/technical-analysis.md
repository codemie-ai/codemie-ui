# Technical Research

**Task**: mcp clone management administration
**Generated**: 2026-10-06
**Research path**: filesystem

---

## 1. Original Context

Implement the UI part of "Clone MCP configuration" (EPMCDME-15538) in codemie-ui. Backend already provides POST v1/mcp-configs/{id}/clone (admin-only, optional body {copy_values: string[]}, returns a flat MCPConfigCloneResponse extending MCPConfigResponse with stripped_fields: string[]; warnings field with placeholder_value_present code added to create/update/clone responses). UI must: add a Clone action to the MCP management list (src/pages/settings/administration), gated to admin/maintainer users; add a "copy values" dialog listing the source config's headers/env/args/url-query keys grouped by section with unchecked-by-default checkboxes (optional masked-value preview+reveal, per-group select-all, sensitive-key hint) that posts selected copy_values; call the clone endpoint via a new mcpStore.cloneConfig method; disable the Clone button while in flight; on success open the existing MCPServerModal in edit mode for the new cloned config; show a stripped_fields banner on that modal open; surface the placeholder_value_present warning after save; update MCPConfig/MCPConfigRequest related types to add warnings and stripped_fields; handle clone failure with a clear error (existing toaster/error.response.data.message pattern), leaving nothing created.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/MCPManagementPage.tsx` — list page; renders `Table` with `columnDefinitions`, wires `useMCPManagement()` state/handlers, renders `MCPServerModal` and `MCPServerDetails`.
- `src/pages/settings/administration/utils/columnRenderers.tsx` — `createColumnRenderers({ handleEditServer, handleDeleteServer, handleViewDetails })` returns per-column render functions; the `actions` column renders `<MCPServerActions server=... onViewDetails=... onEdit=... onDelete=... />`. This is where a Clone entry would be wired in.
- `src/pages/settings/administration/components/MCPServerActions.tsx` — kebab menu (`NavigationMore`) with `menuActions` array (`{ title, icon, onClick }`): View Details, Edit, Copy ID, Delete. Delete uses a co-located `ConfirmationModal`. No existing per-item loading/disabled state on menu items — adding "disable while in flight" for Clone needs new local state here or in the hook.
- `src/pages/settings/administration/hooks/useMCPManagement.ts` — single hook owning all list-page state (`showModal`, `editingServer`, `detailsServer`) and handlers (`handleAddMCPServer`, `handleEditServer`, `handleModalSubmit`, `handleDeleteServer`, etc.). `handleModalSubmit` branches on `editingServer` to call `mcpStore.updateConfig` or `mcpStore.createConfig`, then closes the modal. This hook is the natural home for `handleCloneServer`/clone-dialog state, and for opening `MCPServerModal` in edit mode against the clone response (`setEditingServer(cloneResult); setShowModal(true)`).
- `src/store/mcp.ts` — Valtio `mcpStore` with `indexConfigs`, `getConfig`, `getCachedConfig`, `createConfig`, `updateConfig`, `deleteConfig`, `setFilters`, `resetFilters`. Every mutator follows the same pattern: set `loading`/`error`, `api.<verb>()`, `await response.json()`, update `this.configs`/`catalogCache`, catch block sets `this.error = \`Failed to ... : ${error.response?.data?.message ?? error.message}\`` and rethrows. No `cloneConfig` method exists yet.
- `src/pages/settings/administration/components/MCPServerModal/index.tsx` + `useMCPServerModal.ts` + `modalHelpers.ts` + `mcpServerValidation.ts` — the edit/create form `Popup`. `useMCPServerModal` resets form from `getFormValuesFromServer(server)` whenever `visible && server` changes; opening it with a cloned `MCPConfig` already works for prefill. There is no banner/notice region in the modal body today — a `stripped_fields` banner would be new markup inserted above the form, driven by a new prop (e.g. `strippedFields?: string[]`) threaded from the list page/hook.
- `src/pages/settings/administration/components/MCPServerDetails/*` (`ServerVariables.tsx`, `ServerActions.tsx`, `DetailsProperty.tsx`) — read-only side panel rendering `required_env_vars` and config details; no masking/reveal pattern exists here or anywhere in `src/components` for secret values (checked `Input`, `Popup`; no mask/reveal utility found repo-wide outside this feature's own scope). The "copy values" dialog's masked-preview+reveal is new UI with no existing component to reuse — a plain `Checkbox` (`src/components/form/Checkbox`) is available for the per-key toggles.
- `src/types/entity/mcp.ts` — `MCPConfig`, `MCPConfigRequest`, `MCPServerConfig` (`command?, url?, args?, headers?, env?, type?, auth_token?, single_usage?`), `MCPVariableDefinition`, `MCPFilters`. No `warnings` or `stripped_fields` fields on any type yet — these are additive changes requested by the task.

### Architecture and Layers Affected

- **Store layer**: `src/store/mcp.ts` — new `cloneConfig(id, copyValues?)` method, same shape as `createConfig`/`updateConfig`.
- **Hook layer**: `src/pages/settings/administration/hooks/useMCPManagement.ts` — new handlers for opening the copy-values dialog, triggering clone, in-flight disabled state, and opening `MCPServerModal` with the clone result + stripped-fields banner.
- **Component layer**: `MCPServerActions.tsx` (menu entry + permission gate), a new `MCPCopyValuesDialog`-style component (grouped checkboxes dialog), `MCPServerModal/index.tsx` (banner for `stripped_fields`, warning surfacing after save).
- **Types layer**: `src/types/entity/mcp.ts`.

### Integration Points

- `src/utils/api.ts` — single HTTP layer (`api.get/post/put/delete`), returns a `Response`-like object requiring `.json()`; errors carry `error.response?.data?.message`. Clone call is `api.post(\`v1/mcp-configs/${id}/clone\`, { copy_values })`.
- `src/store/user.ts` / `userStore` — exposes `user.isAdmin`, `user.isMaintainer`, `user.isAuditor` (`src/types/entity/user.ts:28-30`). `BudgetsManagementPage.tsx` is the canonical example of gating a feature: `const { user: currentUser } = useSnapshot(userStore)`, `const isAdmin = currentUser?.isAdmin ?? false`, `const isMaintainer = currentUser?.isMaintainer ?? false`, combine with `||` for the gate and `toaster.error('Access denied...')` for the disallowed path.
- `src/utils/toaster.ts` — used repo-wide (`toaster.error(...)`, `toaster.info(...)`) in administration pages for success/error surfacing; this is the pattern to reuse for clone failure and the `placeholder_value_present` warning.
- `NavigationMore` (`src/components/NavigationMore`) — kebab menu primitive already used for the actions column; a Clone item slots into its `items` array the same way the four existing actions do.

### Patterns and Conventions

- Store mutators: loading flag set true/false, try/catch/finally, contextual error message built from `error.response?.data?.message ?? error.message`, assigned to `this.error`, then rethrown (so the caller must also catch for toaster-level handling — currently `useMCPManagement`'s delete/update/create handlers do **not** catch themselves; callers in `MCPManagementPage.tsx` wrap async handlers and `console.error`, not `toaster.error`). A clone failure path should follow this chain but task asks for "clear error" via toaster — this will need toaster added at the call site (list page or hook), not just console logging, since neither currently reaches the user visibly beyond `mcpStore.error`.
- Form modal pattern: `useXxxModal.ts` co-located hook per `.ai-run/guides/patterns/modal-patterns.md`; `Popup` component only, never raw PrimeReact `Dialog` (already followed in `MCPServerModal`).
- Column renderer factory (`createColumnRenderers`) passes down only the handlers it needs — Clone would be added as another prop/handler threaded the same way as `handleEditServer`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/modal-patterns.md` — mandates `Popup` for all modals (never raw `Dialog`), custom logic in a co-located `useXxxModal.ts` hook, `form.reset()` on close. Directly applicable to both the copy-values dialog and the `MCPServerModal` banner addition.
- `.ai-run/guides/development/api-integration.md`, `.ai-run/guides/patterns/state-management.md` — general store/API conventions (not read in full here; existing `mcp.ts` store already demonstrates the convention consistently, so code-derived patterns are the primary source).
- `docs/superpowers/plans/2026-07-17-mcp-global-custom-toggle.md` and `docs/superpowers/specs/2026-07-17-mcp-global-custom-toggle-design.md` — prior MCP-area planning docs; not specific to clone but confirm this area has active, documented iteration history.
- `docs/superpowers/tasks/2026-07-31-fix-failing-mcps-integration-tests-in-admintables/` — prior task touching the same admin MCP table; its `technical-analysis.md`/`plan.md` may contain reusable context on `Table`/`columnRenderers` testing conventions for this exact page.

### Architectural Decisions

- No ADRs found specific to MCP clone or secret-masking. No inline `NOTE:`/`HACK:`/`ADR:` markers found in the MCP store or modal files.

### Derived Conventions

- Permission gating for admin-only actions is done inline at the page/component level via `userStore` snapshot booleans, not a shared guard/HOC.
- No existing masked-value/reveal UI pattern in the codebase — the copy-values dialog's masked preview+reveal is net-new UI, not a reuse of an existing component.

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/mcp.test.ts` — tests `indexConfigs` caching behavior by mocking `@/utils/api` (`get/post/put/delete` all mocked via `vi.fn()`); no tests yet for `createConfig`/`updateConfig`/`deleteConfig` or any clone-equivalent in this file (only `indexConfigs` is covered, per the lines read).
- `src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx` — accessibility test for the actions menu; a Clone entry will need an equivalent a11y check added.
- No test files exist yet for `useMCPManagement.ts`, `MCPServerModal`, or `columnRenderers.tsx`.

### Testing Framework and Patterns

- Vitest + React Testing Library, two projects (`unit`, `integration`) per `vitest.workspace.ts`. Store tests mock `@/utils/api` module-level with `vi.mock`.

### Coverage Gaps

- No tests for `mcpStore.createConfig/updateConfig/deleteConfig` to pattern-match for a new `cloneConfig` test.
- No tests for the admin-gating pattern (`isAdmin`/`isMaintainer`) as applied to MCP actions specifically — only `BudgetsManagementPage` has this pattern under test elsewhere.
- No existing masked-value/reveal component anywhere, so no test pattern to copy for that sub-feature either.

---

## 5. Configuration and Environment

### Environment Variables

- None specific to MCP clone found. MCP feature overall is gated by `useMcpEnabled()` (`src/hooks/useFeatureFlags`), consumed in `MCPManagementPage.tsx` to redirect away when the feature flag is off. No separate flag found for clone specifically.

### Configuration Files

- No MCP-clone-specific config files found; feature flag resolution lives in `useFeatureFlags`/runtime config (`window._env_` / `import.meta.env`), not inspected further as nothing in `feature_area` searches surfaced MCP-clone-specific env usage.

### Feature Flags and Deployment Concerns

- `useMcpEnabled()` gates the entire MCP management page; clone inherits this gate automatically since it lives inside the same page/component tree. No separate flag is implied by anything found in code.

---

## 6. Risk Indicators

- No shared "disable while in-flight per menu item" pattern exists in `MCPServerActions`/`NavigationMore` today — the clone button's disabled-while-posting requirement will need new local or hook-level state threaded through this menu, which currently has none beyond the delete-confirmation boolean.
- Error surfacing for existing create/update/delete flows does not currently reach the user via `toaster` from `useMCPManagement.ts`/`MCPManagementPage.tsx` (only `console.error` and `mcpStore.error` are set) — the task's "clear error via toaster" requirement is a UX pattern not yet present on this page, so it must be added consistently rather than inferred from an existing call site.
- No masked-value/reveal component exists anywhere in the codebase for secret-like strings; the copy-values dialog's masked preview+reveal, per-group select-all, and sensitive-key hint are all net-new UI with no precedent to copy, which is a source of design ambiguity (e.g., what counts as a "sensitive key" is undefined in the frontend today).
- `MCPConfig`/`MCPConfigRequest` types have no `warnings`/`stripped_fields` fields; every call site constructing or consuming these types (store, modal, column renderers, details panel) is a potential point that needs review once the fields are added, even though most will simply ignore the new optional fields.
- `MCPServerModal` has no existing banner/notice slot; adding a `stripped_fields` banner requires new conditional markup and a new prop threaded from `useMCPManagement`, increasing the surface touched in a component that is already fairly large (300+ lines).
- Backend route and payload shape (`MCPConfigCloneResponse`, `copy_values` body, `warnings.placeholder_value_present`) are described only in the ticket text; no OpenAPI/schema file for this backend endpoint was located in this frontend repo to cross-check field names.

---

## 7. Summary for Complexity Assessment

This task touches three layers in a well-established page: the Valtio store (`src/store/mcp.ts`, new `cloneConfig` method following the existing `createConfig`/`updateConfig` pattern), the list-page hook (`useMCPManagement.ts`, new state/handlers for the copy-values dialog and clone-then-edit flow), and two UI surfaces (`MCPServerActions.tsx` for the gated menu entry, and `MCPServerModal/index.tsx` for the stripped-fields banner), plus a brand-new dialog component for grouped, maskable copy-value checkboxes. Permission gating (`isAdmin`/`isMaintainer`) and the toaster/error.response.data.message error pattern both have direct precedent elsewhere in `src/pages/settings/administration/` (`BudgetsManagementPage.tsx`), so those sub-problems are low-novelty.

The main source of complexity is the copy-values dialog: masked-value preview+reveal and "sensitive-key hint" have zero precedent in this codebase, so that UI and its interaction model (grouping by headers/env/args/url-query, per-group select-all, unchecked-by-default) is being designed from scratch rather than adapted. A secondary risk is that error-toaster surfacing for this family of mutations isn't actually wired today (only `console.error`), so "handle clone failure with a clear error" is new UX plumbing, not a drop-in reuse. Test coverage for the store layer only exercises `indexConfigs`; `createConfig`/`updateConfig`/`deleteConfig` and all list-page hook/menu behavior are currently untested, so clone will be the first store mutator and first menu-gating logic under test in this file, with no fixtures to extend.

---

## 8. External References

None named by the task.
