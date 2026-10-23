# Technical Research

**Task**: mcp test integration admin
**Generated**: 2026-10-12T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Refactor the MCP Management Test Capability (EPMCDME-15541) per requirements in MCP_TEST_CAPABILITY_REFACTORING_REQUIREMENTS.md. Main feature already exists; this is improvement/refactoring on top of an existing draft MR, not new feature work. Key areas: mcpStore.testConfig (merge last_test_* fields instead of replacing), simplify ADMIN/mcpTestSecrets.ts into a single needsIntegration check (rename to mcpTestRequirements.ts), rewrite ADMIN/MCPTestIntegrationModal.tsx to use IntegrationSelector + Checker component instead of manual env var entry, move the per-row test hook to a single page-level hook (useMCPServerTest) used by MCPManagementPage, wire it into MCPServerActions row menu and MCPServerDetails card (add 'Test integration' button there), add an 'In progress' badge state to MCPLastTestInfo/MCPLastTestBadge sourced from mcpStore.testingConfigIds, and revert leftover assistant-side changes under src/pages/assistants (MCPEnvVarsSection, formHelpers, useEnvVarMode, related tests) plus delete mcpSettingAlias.ts.

---

## 2. Codebase Findings

### Existing Implementations

Admin MCP test flow (`src/pages/settings/administration/`):
- `components/mcpTestSecrets.ts` — `getMissingSecretNames`, `needsSecrets`: derives required env var names (declared + `{{var}}`/`[var]` placeholders in url/args/headers) not already satisfied by literal `config.env` values. Target rename per task: `mcpTestRequirements.ts` with a single `needsIntegration`-style check.
- `components/useMCPConfigTest.tsx` — `useMCPConfigTest(id)`: calls `mcpStore.testConfig(id, settingsId)`, reports via `toaster`, exposes `isTesting` from `mcpStore.testingConfigIds`.
- `components/useMCPIntegrationTest.tsx` — `useMCPIntegrationTest(server)`: wraps `useMCPConfigTest`, decides (via `needsSecrets`) whether to open `MCPTestIntegrationModal` or run directly; returns `{ start, isTesting, popups }`. Currently instantiated once per row inside `MCPServerActions` — this is the "per-row test hook" the task wants consolidated into a single page-level `useMCPServerTest` used by `MCPManagementPage`.
- `components/MCPTestIntegrationModal.tsx` — builds a synthetic `MCPServerDetails` from missing secret names, uses `useEnvVarMode(..., { allowManualEntry: true })` (an assistants-side hook) and renders the assistants-side `MCPEnvVarsSection` for manual env var entry — the manual-entry UI the task wants replaced with `IntegrationSelector` + `Checker`.
- `components/MCPServerActions.tsx` — row action menu (`NavigationMore`); "Test Integration" menu item currently calls `startTest` from its own `useMCPIntegrationTest(server)` instance; renders `popups` (the modal) inline.
- `components/MCPServerDetails.tsx` — slide-over detail panel; `ServerLastTestSection` renders `MCPLastTestInfo`; `ServerActions` (not shown in excerpt) currently has Edit/Delete only — task wants a "Test integration" button added here.
- `components/MCPLastTestInfo.tsx` — `MCPLastTestInfo` (full info block) and `MCPLastTestBadge` (compact badge) read `last_test_status` and map to `BADGE_CONFIG` (`success`/`failure`/`warning`) or `NOT_TESTED`; no `in_progress` state currently. `StatusEnum.InProgress` (`'in_progress'`) already exists in both `StatusBadge` implementations (`src/components/StatusBadge.tsx` and `src/components/StatusBadge/StatusBadge.tsx`) and is styled, so adding the state is additive, not foundational.
- `MCPManagementPage.tsx` — owns `useMCPManagement()` (CRUD handlers), renders `Table` with `createColumnRenderers` (uses `MCPLastTestBadge` in a column) and `MCPServerDetails`.
- `store/mcp.ts` — `mcpStore.testConfig(id, settingsId)`: POSTs `v1/mcp-configs/{id}/test`, on success replaces the matching entry in `this.configs` with the full server response (line ~294-ish, replaces rather than merging `last_test_*` fields onto the existing config) and updates `catalogCache`; tracks in-flight tests in a module-level `inflightTests` Map and exposes `testingConfigIds: string[]` on the store.

Assistants-side MCP toolkit (`src/pages/assistants/.../MCPToolkit/`) — flagged by the task for revert of leftover changes:
- `mcpSettingAlias.ts` — `getMcpSettingAlias(serverName)`: builds a settings alias like `{name}_env_vars`. Used by `MCPEnvVarsSection.tsx`, `MCPToolkitForm/formHelpers.ts`, `MCPToolkitForm/useEnvVarMode.ts`, and also imported by the admin-side `MCPTestIntegrationModal.tsx` and `useMCPIntegrationTest.tsx` family — deleting it requires confirming no admin-side import survives after the modal rewrite.
- `MCPEnvVarsSection.tsx` — toggle between "new" (manual env var entry via `MCPServerEnvVars`) and "existing" (`IntegrationSelector`) modes; this is the component the admin modal currently reuses and the task wants reverted/removed from assistants' leftover changes while admin gets its own `IntegrationSelector` + `Checker` based UI.
- `MCPToolkitForm/formHelpers.ts` — `buildServerConfig`, `createOrUpdateMcpSetting`, `handleNewEnvVarMode`; `createOrUpdateMcpSetting` calls `userSettingsStore` to find/create/update a `'MCP'` credential setting by alias.
- `MCPToolkitForm/useEnvVarMode.ts` — `useEnvVarMode(mcpServer, project, { allowManualEntry })`: decides `envVarMode` ('new'/'existing'), looks up an existing setting by alias via `userSettingsStore.findUserSetting`.
- Tests referencing these: `MCPToolkitForm/__tests__/formHelpers.test.ts`, `MCPToolkit/__tests__/MCPToolkit.test.tsx`, and the admin-side `components/__tests__/MCPTestIntegrationModal.test.tsx` (currently depends on `useEnvVarMode`/`MCPEnvVarsSection`, so it will need rewriting alongside the modal, not just the assistants files).

### Architecture and Layers Affected
- **State layer**: `src/store/mcp.ts` (Valtio store) — `testConfig`, `testingConfigIds`.
- **Hooks layer**: `src/pages/settings/administration/components/useMCPConfigTest.tsx`, `useMCPIntegrationTest.tsx` (to be replaced/consolidated into a new `useMCPServerTest` hook, likely same directory, used once at `MCPManagementPage` level).
- **Components layer (admin)**: `MCPServerActions.tsx`, `MCPServerDetails.tsx`, `MCPTestIntegrationModal.tsx`, `MCPLastTestInfo.tsx`, `columnRenderers.tsx` (uses `MCPLastTestBadge`).
- **Components layer (assistants, revert target)**: `MCPToolkit/MCPEnvVarsSection.tsx`, `MCPToolkit/mcpSettingAlias.ts`, `MCPToolkitForm/formHelpers.ts`, `MCPToolkitForm/useEnvVarMode.ts`.
- **Shared components**: `IntegrationSelector` (two implementations exist — `AssistantForm/components/Toolkits/IntegrationSelector.tsx` for the author-side settings selector, and a differently-shaped `AssistantDetails/.../UserMapping/components/IntegrationSelector.tsx` for per-user mapping; the admin modal rewrite should target the `AssistantForm/components/Toolkits/IntegrationSelector.tsx` shape — it takes `value`, `settingsDefinitions`, `onChange`, `onAddSettingClick`). `Checker` (`src/components/Checker/Checker.tsx`) — generic test-trigger button driven by `CHECKER_STATUSES` (`UNDEFINED`/`IN_PROGRESS`/`FAILED`/`SUCCESS`), already used by the assistants-side `MCPToolkitTest.tsx` provider as the pattern to follow.

### Integration Points
- `mcpStore.testConfig` → backend `POST v1/mcp-configs/{id}/test`, optional `settings_id` body.
- `useMCPConfigTest`/`useMCPIntegrationTest` → `toaster` for success/failure/warning messages.
- `createOrUpdateMcpSetting` (assistants side, revert target) → `userSettingsStore` (`findUserSetting`, `createUserSetting`, `updateUserSetting`) with `credential_type: 'MCP'`.
- `MCPServerDetails` is rendered from `MCPManagementPage` and also referenced in the assistants `MCPToolkit.tsx` import list (name collision risk — two `MCPServerDetails` exist: the admin component and the `MCPServerDetails` **type** in `src/types/entity/mcp.ts:109`, 113 callers — purely a naming coincidence, not a dependency, but worth flagging to avoid confusion when editing imports).

### Patterns and Conventions
- Row-action menus follow `NavigationMore` + `menuActions` array (`MCPServerActions.tsx`) — any new "Test Integration" trigger stays an item in that array.
- Test-trigger UI pattern already established on the assistants side via `Checker` + `CHECKER_STATUSES` (`MCPToolkitTest.tsx`): `runTest` sets `CHECKER_STATUSES.IN_PROGRESS` → `SUCCESS`/`FAILED`, toasts via `toaster`. The admin rewrite should likely mirror this instead of the current ad hoc `isTesting` boolean + toast-only reporting.
- Store-tracked "in flight" sets (`testingConfigIds` on `mcpStore`) are the existing convention for the planned "In progress" badge, rather than local component state.
- Hooks under `src/pages/settings/administration/components/` are colocated with the components that use them (not under a separate `hooks/` dir) — `useMCPManagement.ts` lives in `.../hooks/`, but `useMCPConfigTest.tsx`/`useMCPIntegrationTest.tsx` live directly in `components/`. A new page-level `useMCPServerTest` could go either place; `hooks/` matches `useMCPManagement.ts`'s precedent for page-level MCP admin hooks.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` contains relevant guides not yet read in depth: `patterns/state-management.md` (Valtio store conventions), `patterns/custom-hooks.md`, `components/component-patterns.md`, `development/refactoring-patterns.md`. These were not opened in this pass since the task is scoped tightly enough that code exploration covered the needed conventions; the implementing agent should consult `development/refactoring-patterns.md` and `patterns/custom-hooks.md` directly given this task is explicitly a refactor of hooks.

### Architectural Decisions
No ADRs found specific to MCP testing. Inline comments in `IntegrationSelector.tsx` (assistants `AssistantForm` version) explain the `autoMode`/`onAutoModeChange` ownership contract — relevant if the rewritten `MCPTestIntegrationModal` reuses this component.

### Derived Conventions
- `last_test_*` fields are a flat set on `MCPConfig`: `last_test_at`, `last_test_status`, `last_test_message`, `last_test_error_category`, `last_test_tools_count`, `last_test_integration_alias` (see `MCPLastTestFields` type in `MCPLastTestInfo.tsx`). The task's "merge instead of replace" requirement concerns how `mcpStore.testConfig` updates `this.configs` entries after the POST response.

---

## 4. Testing Landscape

### Existing Coverage
- `src/store/__tests__/mcp.test.ts` — covers `mcpStore` including `testConfig`.
- `src/pages/settings/administration/__tests__/MCPManagementPage.lastTest.test.tsx` — specific to last-test display on the management page.
- `src/pages/settings/administration/components/__tests__/MCPServerActions.test.tsx` and `MCPServerActions.secrets.test.tsx` — cover the row menu including the secrets/test-integration path.
- `src/pages/settings/administration/components/__tests__/mcpTestSecrets.test.ts` — unit tests for `getMissingSecretNames`/`needsSecrets` (will need renaming/rewriting alongside the `mcpTestRequirements.ts` rename).
- `src/pages/settings/administration/components/__tests__/MCPTestIntegrationModal.test.tsx` — exercises the modal; currently coupled to `useEnvVarMode`/`MCPEnvVarsSection`, so this test will need a substantial rewrite when the modal switches to `IntegrationSelector` + `Checker`.
- `src/pages/settings/administration/components/__tests__/MCPServerDetails.test.tsx` — covers the detail panel (will need a case for the new "Test integration" button).
- Assistants-side revert targets have their own tests: `MCPToolkit/MCPToolkitForm/__tests__/formHelpers.test.ts`, `MCPToolkit/__tests__/MCPToolkit.test.tsx` — per the task's git history (commits already reference "removed unused prop in MCPServerConfigStep.test.tsx", "fix failing unit test"), these were already touched once during the original feature work and need re-checking after the revert.

### Testing Framework and Patterns
Vitest + React Testing Library (per repo-wide convention; confirmed via `.ai-run/guides/testing/testing-patterns.md` existing and prior commits in git log referencing "Fix failing unit test").

### Coverage Gaps
- No existing test for an "In progress" badge state in `MCPLastTestInfo`/`MCPLastTestBadge` — net-new behavior, net-new test needed.
- No existing test for a page-level `useMCPServerTest` hook (doesn't exist yet).
- No existing test for a "Test integration" button on `MCPServerDetails`'s action row.

---

## 5. Configuration and Environment

### Environment Variables
None specific to MCP testing found at the config layer; `CONFIG_KEYS` (`src/constants/configKeys.ts`) has `MCP_AUTH_ORIGIN`, `MCP_AUTH_TIMEOUT_SECONDS` for MCP OAuth broker flows, unrelated to this test-capability refactor.

### Configuration Files
No feature-specific config files found; standard `MCPFilters`/pagination config lives in `mcpStore`.

### Feature Flags and Deployment Concerns
MCP admin page itself is gated by `useMcpEnabled()` in `MCPManagementPage.tsx` (redirects away if the MCP feature flag is off) — unrelated to the test-capability internals but relevant context for anyone testing the page end-to-end.

---

## 6. Risk Indicators

- The task names `MCP_TEST_CAPABILITY_REFACTORING_REQUIREMENTS.md` as the source of requirements; it was not found anywhere in the repository (`Glob` for `**/*REFACTORING_REQUIREMENTS*` and `**/*MCP_TEST*` both returned nothing). The task_context description itself is detailed enough to work from, but the spec/plan stages should flag this as an unresolved input rather than assume the summary above is complete.
- `getMcpSettingAlias` / `mcpSettingAlias.ts` is imported by **both** the assistants-side files slated for revert **and** the admin-side `MCPTestIntegrationModal.tsx`/`useMCPIntegrationTest.tsx`-adjacent code path. Deleting `mcpSettingAlias.ts` as instructed requires the admin modal rewrite to land first (or atomically), otherwise admin code breaks on a missing import.
- Two differently-shaped `IntegrationSelector` components exist in the codebase (`AssistantForm/components/Toolkits/IntegrationSelector.tsx` vs. `AssistantDetails/.../UserMapping/components/IntegrationSelector.tsx`); picking the wrong one for the rewritten `MCPTestIntegrationModal` would misalign props (`settingsDefinitions`/`onAddSettingClick` vs. `options`/`onAdd`).
- `mcpStore.testConfig`'s current replace-in-place logic for `this.configs` (full object replace per the gap-elided code around line 286-300) needs to be read in full before changing to a merge — the merge boundary (which fields get merged vs. which get taken wholesale from the response) is not yet confirmed from the elided source.
- `MCPTestIntegrationModal.test.tsx` and `mcpTestSecrets.test.ts` are both tightly coupled to the implementation being replaced (manual env var entry, `needsSecrets`/`getMissingSecretNames` names) — expect near-total rewrites, not incremental edits.
- `useMCPIntegrationTest` is currently instantiated per-row inside `MCPServerActions` (one hook instance per table row); consolidating to a single page-level `useMCPServerTest` changes the state-ownership boundary and the modal-rendering responsibility (today each row renders its own `popups`; a page-level hook would need to render a single modal keyed by whichever server is being tested, or the hook needs to accept a server argument per-call rather than being a single fixed-id hook like today's `useMCPConfigTest(id)`).
- `CHECKER_STATUSES`-based pattern used elsewhere (`MCPToolkitTest.tsx`) is a different status model (`UNDEFINED`/`IN_PROGRESS`/`FAILED`/`SUCCESS`) than the `StatusEnum`-based model used by `MCPLastTestBadge` (`not_started`/`in_progress`/`pending`/`error`/`warning`/`success`) — the task's requirement to use `Checker` in the modal while also adding `in_progress` to `MCPLastTestBadge` means two different status vocabularies will coexist in this feature; worth normalizing explicitly in the plan rather than improvising a mapping ad hoc.

---

## 7. Summary for Complexity Assessment

This refactor touches three layers in the admin MCP settings area — the Valtio store (`mcpStore.testConfig`'s update-merge logic and its existing `testingConfigIds` tracking), a cluster of admin-only hooks/components (`useMCPConfigTest`, `useMCPIntegrationTest` → consolidate into `useMCPServerTest`; `MCPTestIntegrationModal`; `MCPServerActions`; `MCPServerDetails`; `MCPLastTestInfo`), and a revert of several assistants-side files (`MCPEnvVarsSection.tsx`, `mcpSettingAlias.ts`, `formHelpers.ts`, `useEnvVarMode.ts`) that were modified as drive-by leftovers in the original feature MR. All the target files already exist and are small/well-isolated (no new architectural layer, no new backend endpoint — `v1/mcp-configs/{id}/test` is already wired), which keeps this a bounded refactor rather than new-feature work.

The main technical complexity is the cross-cutting coupling: `mcpSettingAlias.ts` is shared between the revert-target assistants files and the admin modal being rewritten, so deletion order matters; two incompatible status vocabularies (`CHECKER_STATUSES` vs. `StatusEnum`) will need to coexist across the modal (`Checker`) and the badge (`MCPLastTestBadge`); and the per-row-to-page-level hook consolidation changes who owns modal-visibility state and requires the new hook to key off "which server" rather than a single fixed id. Test coverage on the pieces being replaced (`MCPTestIntegrationModal.test.tsx`, `mcpTestSecrets.test.ts`) is substantial but tightly bound to the old implementation, so most of it will be rewritten rather than extended — this is a cost but not a coverage gap discovered during research, since the admin area is otherwise well-tested (`MCPServerActions`, `MCPManagementPage.lastTest`, `mcpStore`).

The named requirements document (`MCP_TEST_CAPABILITY_REFACTORING_REQUIREMENTS.md`) could not be located in the repository — see External References below — so the spec stage is working from the task_context summary only; any detail not captured in that summary (e.g., exact `useMCPServerTest` signature, exact badge visual spec) is undiscovered, not absent.

---

## 8. External References

- `MCP_TEST_CAPABILITY_REFACTORING_REQUIREMENTS.md` — named by the task as the source of requirements. Searched via `Glob` across the full repository (`**/*REFACTORING_REQUIREMENTS*`, `**/*MCP_TEST*`) and found nowhere — **unresolved**. No path, absolute or relative, was given in the task_context beyond the bare filename, and no file by that name or a close variant exists in `/Users/vladimir_sesum1/codemie-dev/codemie-ui` or elsewhere searched. Downstream stages should treat the task_context's own prose (Section 1 above) as the authoritative requirements statement, and flag to the user/caller that this named file is missing if a more detailed spec is needed.

