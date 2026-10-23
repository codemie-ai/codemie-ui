# MCP Management Test Capability Refactor (EPMCDME-15541) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the MCP test-capability branch down to what EPMCDME-15541 needs — store merge semantics, a single `needsIntegration` check, an `IntegrationSelector` + `Checker`-based integration modal, one page-level test hook replacing per-row hooks, an "In progress" badge state, and a details-card test button — using existing components, and finish reverting leftover assistant-side changes.

**Architecture:** No new architectural layer. Changes confined to `src/store/mcp.ts` (merge semantics), `src/pages/settings/administration/components/` (check/modal/hook/actions/details/badge), `src/pages/settings/administration/utils/columnRenderers.tsx` + `MCPManagementPage.tsx` (wiring), and a revert of `src/pages/assistants/.../MCPToolkit/` leftovers. Baseline revert (R0) is already done/committed — do not touch it.

**Tech Stack:** React 18, TypeScript 5, Valtio, Vitest + React Testing Library.

**Spec:** Requirements reproduced verbatim in the task dispatch (ticket EPMCDME-15541) — no spec.md, no-spec refactor flow. Technical analysis: `docs/superpowers/tasks/2026-10-12-mcp-test-capability-refactor/technical-analysis.md`.

## Global Constraints

- Toaster has only `info`/`success`/`error` — never add a variant.
- Never add a new `StatusEnum` value — reuse the existing `StatusEnum.InProgress`.
- Prefer `git checkout main -- <path>` over hand-editing for exact reverts.
- Test action lives only in the row menu and details card — never in the Edit modal.
- `settings_id` is sent to the backend; secrets never go in the request body; the test must never overwrite an existing integration (only select or create one).
- `mcpStore.testingConfigIds` is in-memory only, not persisted.
- Commit per task using the repo's existing convention, prefix `EPMCDME-15541:`; commit only if asked.

## Acceptance criteria

- [ ] `git diff main -- src/pages/assistants` is empty; no file named `mcpSettingAlias` exists; `createOrUpdateMcpSetting` is not imported under `src/pages/settings/administration`.
- [ ] `needsIntegration` is the only integration-required check; no regex scanning remains.
- [ ] Config with required env vars → modal opens; selecting/creating an integration runs the test with `settings_id`; a created integration is preselected (no `setTimeout`/last-item guess).
- [ ] Modal's action button is `Checker` (not `TestIntegration`); clicking it keeps the modal open; selector/add-button disabled in-progress; "Close" always enabled, never cancels the request; after failure the user can pick another integration and re-run from the same modal.
- [ ] Config without required env vars runs immediately, sends no body.
- [ ] After a test, table + details sidebar show the new status/time; zero-tools reachable server reads as warning, distinct from failure; saving a config mid-test doesn't revert saved fields.
- [ ] Details card has a "Test integration" button starting the same flow, disabled while that config is testing.
- [ ] While testing, the row's "Last test" cell and the details card show "In progress"; closing the modal mid-flight doesn't clear it; replaced by the final status on completion (including error); other rows unaffected.

---

## Task 1: `mcpStore.testConfig` merges `last_test_*` instead of replacing (R2)

**Files:** Modify `src/types/entity/mcp.ts` (after `MCPConfig`, ~line 65); modify `src/store/mcp.ts:280-309`; test `src/store/__tests__/mcp.test.ts`.

**Interfaces:** Produces `export const LAST_TEST_KEYS = ['last_test_at','last_test_status','last_test_message','last_test_error_category','last_test_tools_count','last_test_integration_alias'] as const satisfies readonly (keyof MCPConfig)[]` in `types/entity/mcp.ts` — Tasks 6/7 import it. `testConfig(id, settingsId?)` keeps its signature/return type and its `inflightTests`/`testingConfigIds` de-dup exactly as today.

- [ ] **Step 1:** In `store/__tests__/mcp.test.ts`, extend the existing `testConfig` describe block with two cases, following that file's existing `api.post` mock style: (a) seed `mcpStore.configs` with an entry whose `name`/`config` are newer than the mocked test response, call `testConfig`, assert the list entry keeps the newer `name`/`config` but adopts the response's `last_test_*` fields; (b) seed `mcpStore.configs = []`, call `testConfig('cfg-gone')`, assert the returned result still carries `last_test_status` and `mcpStore.configs` stays `[]`.
- [ ] **Step 2:** Run `npx vitest run --project unit src/store/__tests__/mcp.test.ts` — expect the two new cases to FAIL.
- [ ] **Step 3:** Add the `LAST_TEST_KEYS` constant to `types/entity/mcp.ts` as specified above.
- [ ] **Step 4:** In `store/mcp.ts`, import `LAST_TEST_KEYS` alongside the existing `MCPConfig, MCPConfigRequest, MCPFilters` import. Replace the body between `const result: MCPConfig = await response.json()` and `return result` (lines ~292-300) with a `mergeLastTest(target)` helper that spreads `target` then overwrites only the `LAST_TEST_KEYS` from `result`, applied to `catalogCache.get(id)` (if present, re-set via `catalogCache.set`) and to `this.configs[index]` (if `findIndex` succeeds) — do not touch any other field. Leave the `finally` block (in-flight cleanup, `testingConfigIds` filter) untouched.

Test-first: yes — Step 1's two cases, written before Step 4's merge logic exists.

- [ ] **Step 5:** Run `npx vitest run --project unit src/store/__tests__/mcp.test.ts` — expect PASS, quote "Test Files" line.
- [ ] **Step 6:** `git add src/types/entity/mcp.ts src/store/mcp.ts src/store/__tests__/mcp.test.ts && git commit -m "EPMCDME-15541: Merge last_test_* fields instead of replacing config entry"`

---

## Task 2: Replace `mcpTestSecrets.ts` with `needsIntegration` (R3)

**Files:** Delete `components/mcpTestSecrets.ts` and its test; create `components/mcpTestRequirements.ts` and `__tests__/mcpTestRequirements.test.ts` (copy the deleted file's copyright header into the new one).

**Interfaces:** Produces `export const needsIntegration = (config: Pick<MCPConfig, 'required_env_vars'>): boolean => !!config.required_env_vars?.some((v) => v.required)` — the only integration-required check used anywhere downstream (Task 4 modal usage site, Task 5 hook).

- [ ] **Step 1:** Write `mcpTestRequirements.test.ts` with three cases: no `required_env_vars` → `false`; all optional → `false`; at least one `required: true` → `true`.
- [ ] **Step 2:** Run the test — expect FAIL (module doesn't exist).
- [ ] **Step 3:** Create `mcpTestRequirements.ts` with the function above; `git rm components/mcpTestSecrets.ts __tests__/mcpTestSecrets.test.ts`.

Test-first: yes — Step 1's three cases, written before the file exists.

- [ ] **Step 4:** Run the test — expect PASS.
- [ ] **Step 5:** `git add -A src/pages/settings/administration/components/mcpTestRequirements.ts src/pages/settings/administration/components/__tests__/mcpTestRequirements.test.ts && git commit -m "EPMCDME-15541: Replace regex-based secrets check with needsIntegration"`

---

## Task 3: Revert leftover assistant-side changes, delete `mcpSettingAlias.ts` (R1)

**Files:** Revert to `main`: `TOOLKIT/MCPToolkit/MCPEnvVarsSection.tsx`, `MCPToolkitForm/formHelpers.ts`, `MCPToolkitForm/useEnvVarMode.ts`, `__tests__/MCPAuthPromptWiring.test.tsx`, `__tests__/MCPServerConfigStep.test.tsx`, `__tests__/MCPServerDetail.test.tsx` (all under `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/`). Delete `MCPToolkit/mcpSettingAlias.ts`.

**Interfaces:** Pure revert — no new interface. Must land together with Task 4 (same commit): the current `MCPTestIntegrationModal.tsx` imports `MCPEnvVarsSection`/`useEnvVarMode`/`getMcpSettingAlias` from these files, so this task alone breaks the build until Task 4 rewrites the modal.

- [ ] **Step 1:** `git checkout main -- <the six files listed above>`.
- [ ] **Step 2:** `git rm src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/mcpSettingAlias.ts`.
- [ ] **Step 3:** Do not run any build/lint gate yet — the admin side is intentionally broken until Task 4 completes.

Test-first: no — pure revert to `main`; `main`'s own tests for these files are the regression check.

- [ ] **Step 4:** Hold the commit; combine with Task 4 Step 6.

---

## Task 4: Rewrite `MCPTestIntegrationModal` with `IntegrationSelector` + `Checker` (R4)

**Files:** Full rewrite of `components/MCPTestIntegrationModal.tsx` and its test.

**Interfaces:** Consumes `IntegrationSelector` (`pages/assistants/.../Toolkits/IntegrationSelector`, props `value`, `settingsDefinitions`, `addButtonLabel`, `onChange`, `onAddSettingClick`, `disabled`), `Checker` (`@/components/Checker`, props `label`, `status`, `onCheck`; self-disables while `status === CHECKER_STATUSES.IN_PROGRESS`; **no** `disabled` prop — do not add one), `CHECKER_STATUSES`/`CheckerStatus` (`@/constants`), `useNewIntegrationPopup` (`@/hooks/useNewIntegrationPopup`), `NewIntegrationPopup` default export (`pages/integrations/components/NewIntegrationPopup`, props `visible`, `onHide`, `onSuccess`, `project`, `credentialType`), `MCP_SETTINGS_TYPE` (`@/constants/settings`), `settingsStore.indexSettings()` → `{ mcp: Setting[] }`, `userStore.getDefaultProject()`.

Produces default export with props `{ visible: boolean; server: Pick<MCPConfig,'id'|'name'|'required_env_vars'>; status: CheckerStatus; onHide: () => void; onTest: (settingsId: string) => void }`. Task 5's hook owns `status`/`onTest`/`onHide`; this component never calls any create/update-setting API itself.

- [ ] **Step 1:** Rewrite the test file against the new prop contract with four cases: selector lists the MCP integrations returned by `settingsStore.indexSettings()`; clicking the `Checker` with nothing selected does not call `onTest` and shows an inline hint ("Select an integration to run the test"); selecting an integration then clicking `Checker` calls `onTest(selectedId)`; clicking "Add Environment Variables" opens `NewIntegrationPopup`, and on its `onSuccess` the modal re-fetches `indexSettings()`, diffs ids against the set captured before the popup opened, and preselects the one new id (mock `NewIntegrationPopup` with a stub exposing its `onSuccess` call if driving its real form proves heavier than needed — the behavior under test is the modal's diff logic, not the popup's own form).
- [ ] **Step 2:** Run the test — expect FAIL (current modal uses `onConfirm`, no `status` prop, manual env var UI).
- [ ] **Step 3:** Rewrite `MCPTestIntegrationModal.tsx`: on `visible` becoming true, fetch `userStore.getDefaultProject()` and `settingsStore.indexSettings()` (store the `mcp` list in state); render a `Popup` (header "Integration required", body listing required var names from `server.required_env_vars.filter(v => v.required)`, an `IntegrationSelector` wired to local `selected` state with `disabled={status === CHECKER_STATUSES.IN_PROGRESS}`, and a footer with a "Close" button (always enabled, calls `onHide`) and a `Checker` (`status` prop passed straight through, `onCheck` no-ops with an inline hint when `!selected`, otherwise calls `onTest(selected.id)`); render `NewIntegrationPopup` as a sibling of the `Popup` (not nested), wired through `useNewIntegrationPopup()`, with `onAddSettingClick` capturing the current mcp-setting ids into a ref before calling `showNewIntegrationPopup(project, MCP_SETTINGS_TYPE)`, and the popup's `onSuccess` re-fetching `indexSettings()`, diffing against the captured ids, and calling `setSelected` with the one new entry. Remove every symbol the old file had that this one doesn't need: `getErrorMessage`, `createOrUpdateMcpSetting`, `getMcpSettingAlias`, `useEnvVarMode`, `MCPEnvVarsSection`, `validateManualEnvVars`, the busy flag, the submit ref, the error state.

Test-first: yes — Step 1's four cases, written before the rewrite.

- [ ] **Step 4:** Run the modal test — expect PASS.
- [ ] **Step 5:** Run `git diff main -- src/pages/assistants` — expect empty (confirms Task 3 + this rewrite together satisfy R1).
- [ ] **Step 6:** `git add -A src/pages/assistants src/pages/settings/administration/components/MCPTestIntegrationModal.tsx src/pages/settings/administration/components/__tests__/MCPTestIntegrationModal.test.tsx && git commit -m "EPMCDME-15541: Revert assistants-side leftovers; rewrite MCPTestIntegrationModal with IntegrationSelector + Checker"`

---

## Task 5: Page-level `useMCPServerTest` hook, drop per-row hooks (R5, R6)

**Files:** Delete `useMCPIntegrationTest.tsx`, `useMCPConfigTest.tsx`; create `useMCPServerTest.tsx` and its test; modify `MCPServerActions.tsx`, `utils/columnRenderers.tsx`, `MCPManagementPage.tsx`; update `__tests__/MCPServerActions.test.tsx`; delete `__tests__/MCPServerActions.secrets.test.tsx` after moving any still-relevant non-auth case into the hook test or `MCPServerActions.test.tsx`.

**Interfaces:** Consumes Task 1's `mcpStore.testConfig`/`testingConfigIds`, Task 2's `needsIntegration`, Task 4's `MCPTestIntegrationModal`. Produces `useMCPServerTest(): { start: (server: MCPConfig) => void; modal: ReactNode }`: `start` opens the modal (status reset to `CHECKER_STATUSES.UNDEFINED`) when `needsIntegration(server)`, else runs the test directly; the modal's `onTest(settingsId)` runs `mcpStore.testConfig(server.id, settingsId)` and never hides the modal (only its `onHide` does); while a run is in flight for the open modal, status is `IN_PROGRESS`, then `SUCCESS` (on `last_test_status` of `success` or `warning`) or `FAILED` (on `failure` or a thrown error); every run — modal or direct — reports via `toaster`: `success` → `toaster.success` with tools count when present; `warning` → `toaster.info(last_test_message || 'Connected, but the server returned no tools.')`; `failure` → `toaster.error(last_test_message || 'MCP connection test failed')`; thrown error → `toaster.error(error.message || 'MCP connection test failed')`. `MCPServerActions` gains props `onTest: (server: MCPConfig) => void`, `isTesting: boolean`, drops its own hook and `{popups}`. `createColumnRenderers` gains `onTest`/`isTesting(id)` params threaded to `MCPServerActions` in the `actions` column. `MCPManagementPage` calls the hook once, renders `{modal}` once, and passes `start`/an `isTesting(id)` lookup (built from the page's existing `useSnapshot(mcpStore)` destructure) down to both the table and (Task 8) `MCPServerDetails`.

- [ ] **Step 1:** Write `useMCPServerTest.test.tsx` with cases: no-integration server runs immediately with `settingsId` undefined and reports success/warning/failure/thrown-error via the right toaster method with the right fallback text (five cases per R6); a needs-integration server opens the modal without calling `testConfig`; calling the modal's `onTest` never calls the hook's own `onHide`-equivalent (only an explicit `onHide` from the modal does) — assert via whatever render-returned-`ReactNode` pattern `MCPServerActions.test.tsx` already uses in this repo (read it first).
- [ ] **Step 2:** Run the test — expect FAIL (module doesn't exist).
- [ ] **Step 3:** Write `useMCPServerTest.tsx` implementing the contract above (holds `modalServer`/`status` in local state via `useState`, calls `useSnapshot(mcpStore)` so `isTesting` lookups built from its return stay reactive).
- [ ] **Step 4:** `git rm` the two old per-row hook files.
- [ ] **Step 5:** Update `MCPServerActions.tsx`: drop the `useMCPIntegrationTest` import/call and `{popups}` JSX; add `onTest`/`isTesting` props; "Test Integration" menu item calls `onTest(server)`, `disabled: isTesting`.
- [ ] **Step 6:** Update `columnRenderers.tsx`: add `onTest`/`isTesting` to `ColumnRenderersProps`, pass through to `MCPServerActions` in the `actions` renderer.
- [ ] **Step 7:** Update `MCPManagementPage.tsx`: call `const { start, modal } = useMCPServerTest()`; build `isTesting(id)` from the existing `testingConfigIds` in its `useSnapshot(mcpStore)` destructure; pass `onTest: start, isTesting` into `createColumnRenderers({...})` (include `testingConfigIds`/`isTesting` in that call's `useMemo` deps so the renderers rebuild when it changes); render `{modal}` once in `renderContent`.
- [ ] **Step 8:** Update `MCPServerActions.test.tsx` to pass `onTest`/`isTesting` props directly and assert the menu item calls `onTest` and is disabled when `isTesting`; move any still-relevant case from `MCPServerActions.secrets.test.tsx`, then delete that file.

Test-first: yes — Step 1's hook tests and Step 8's updated assertions, written before Steps 3/5/6/7's production code.

- [ ] **Step 9:** Run `npx vitest run --project unit src/pages/settings/administration` — expect PASS; confirm `MCPServerActions.secrets.test.tsx` no longer exists.
- [ ] **Step 10:** `git add -A src/pages/settings/administration && git commit -m "EPMCDME-15541: Consolidate per-row test hooks into page-level useMCPServerTest"`

---

## Task 6: Trim `MCPLastTestInfo` (R7)

**Files:** Modify `components/MCPLastTestInfo.tsx`; modify `utils/columnRenderers.tsx` call sites; update its test file (glob for the exact current filename first).

**Interfaces:** Produces: `MCPLastTestBadge`/`MCPLastTestInfo` keep their names; `MCPLastTestInfoProps.config` becomes `Partial<Pick<MCPConfig, (typeof LAST_TEST_KEYS)[number]>> | null | undefined` using Task 1's `LAST_TEST_KEYS`. `formatLastTestTime`, `formatLastTestFullTime`, the exported `MCPLastTestStatus`/`MCPLastTestFields` types, and `CATEGORY_LABELS` no longer exist anywhere in this file or its callers; call sites use `formatDateTime(value, 'relative')` / `formatDateTime(value)` directly.

- [ ] **Step 1:** Add/update a test case: a config with `last_test_error_category` set renders no "Category:" text but still renders `last_test_message` as-is (raw, no label mapping).
- [ ] **Step 2:** Run the test — expect FAIL.
- [ ] **Step 3:** In `MCPLastTestInfo.tsx`: delete `MCPLastTestStatus`, `MCPLastTestFields`, `CATEGORY_LABELS`, `formatLastTestTime`, `formatLastTestFullTime`, and the category-rendering JSX block; replace the two internal calls to the deleted wrappers with direct `formatDateTime` calls; update `MCPLastTestInfoProps.config`'s type as specified above.
- [ ] **Step 4:** In `columnRenderers.tsx`: drop the `formatLastTestFullTime, formatLastTestTime` import, replace its two call sites with `formatDateTime` (imported from `@/utils/helpers`) directly.

Test-first: yes — Step 1's case, written before the removal.

- [ ] **Step 5:** Run `npx vitest run --project unit src/pages/settings/administration/components/__tests__ src/pages/settings/administration/utils` — expect PASS.
- [ ] **Step 6:** `git add -A src/pages/settings/administration/components/MCPLastTestInfo.tsx src/pages/settings/administration/utils/columnRenderers.tsx src/pages/settings/administration/components/__tests__ && git commit -m "EPMCDME-15541: Trim MCPLastTestInfo wrappers, types, and category labels"`

---

## Task 7: "In progress" badge state from `testingConfigIds` (R11)

**Files:** Modify `MCPLastTestInfo.tsx`, `utils/columnRenderers.tsx`, `MCPManagementPage.tsx`; update `MCPLastTestInfo` test and `__tests__/MCPManagementPage.lastTest.test.tsx`.

**Interfaces:** Produces `isTesting?: boolean` on both `MCPLastTestBadge` and `MCPLastTestInfo` — when `true`, renders `StatusEnum.InProgress`/"In progress", wins over any `last_test_status`, and hides the stale relative-time/tools-count/message lines (badge only). The `last_test` column renderer (already receiving `isTesting(id)` from Task 5 Step 6/7) passes it through and hides the stale relative-time span the same way.

- [ ] **Step 1:** Add cases to `MCPLastTestInfo`'s test: `isTesting` true shows "In progress" and hides tools-count/time even when `last_test_status`/`last_test_tools_count` are set; `isTesting` false/omitted shows the normal badge. Update `MCPManagementPage.lastTest.test.tsx` (read its current seeding pattern first) so it seeds `mcpStore.testingConfigIds` directly to assert: starting shows "In progress" immediately in that row only; other rows unaffected; clearing the id (success or error path) restores the row's real status/time.
- [ ] **Step 2:** Run both test files — expect FAIL.
- [ ] **Step 3:** Add `isTesting` to `MCPLastTestBadge` (early-return the in-progress badge before the `BADGE_CONFIG` lookup) and to `MCPLastTestInfo` (pass through, and when true render only the badge row).
- [ ] **Step 4:** In `columnRenderers.tsx`'s `last_test` renderer, compute `const testing = isTesting(item.id)` and pass it to `MCPLastTestBadge`; render the relative-time span only `!testing`.
- [ ] **Step 5:** Confirm `MCPManagementPage.tsx`'s `customRenderColumns` `useMemo` depends on the live `testingConfigIds` snapshot value (not a captured copy) so starting/ending a test triggers a renderer rebuild and the `Table` re-renders every row's `last_test` cell from current data.

Test-first: yes — Step 1's cases, written before the wiring.

- [ ] **Step 6:** Run `npx vitest run --project unit src/pages/settings/administration` — expect PASS.
- [ ] **Step 7:** `git add -A src/pages/settings/administration && git commit -m "EPMCDME-15541: Add In progress badge state sourced from mcpStore.testingConfigIds"`

---

## Task 8: "Test integration" button in the details card (R10)

**Files:** Modify `components/MCPServerDetails.tsx` and `MCPServerDetails/ServerActions.tsx`; modify `MCPManagementPage.tsx`; update its test file (glob for the exact current filename first).

**Interfaces:** Produces `MCPServerDetails` props `onTest: (server: MCPConfig) => void`, `isTesting?: boolean` — passed through to `ServerActions` (new "Test integration" button, disabled + loading-labelled while `isTesting`, calling `onTest(server)`) and to `ServerLastTestSection`/`MCPLastTestInfo` (Task 7's `isTesting` prop). `MCPManagementPage` passes `start` as `onTest` and `isTesting(detailsServer.id)`; `detailsServer` must reflect Task 1's merge once a test completes — read `hooks/useMCPManagement.ts` first and, if `detailsServer` is a captured object rather than derived live from the `configs` snapshot, change it to look itself up by id from the current snapshot each render.

- [ ] **Step 1:** Add test cases: a "Test integration" button renders and calls `onTest(server)` on click; it is disabled when `isTesting` is passed `true`; re-rendering with an updated `server` prop (newer `last_test_status`) updates the card's badge/text without remounting.
- [ ] **Step 2:** Run the test — expect FAIL.
- [ ] **Step 3:** In `ServerActions.tsx`, add the `onTest`/`isTesting` props and a `ConnectionSvg`-iconed "Test integration" button (secondary variant, matching the file's existing Edit/Delete button sizing), disabled and relabelled while `isTesting`.
- [ ] **Step 4:** In `MCPServerDetails.tsx`, add `onTest`/`isTesting` to `MCPServerDetailsProps`, pass both to `ServerActions`, and pass `isTesting` through to `ServerLastTestSection` → `MCPLastTestInfo`.
- [ ] **Step 5:** In `MCPManagementPage.tsx`, pass `onTest={start}` and `isTesting={detailsServer ? isTesting(detailsServer.id) : false}` to `MCPServerDetails`; apply the `useMCPManagement.ts` fix from the Interfaces note if needed so `detailsServer` stays live.

Test-first: yes — Step 1's cases, written before the button/prop wiring.

- [ ] **Step 6:** Run `npx vitest run --project unit src/pages/settings/administration` — expect PASS, quote "Test Files" line.
- [ ] **Step 7:** `git add -A src/pages/settings/administration && git commit -m "EPMCDME-15541: Add Test integration button to MCPServerDetails card"`

---

## Task 9: Final test sweep for touched areas (R9)

**Files:** No new production files; review only.

- [ ] **Step 1:** Run `npx vitest run --project unit src/pages/settings/administration src/store/__tests__/mcp.test.ts` — expect PASS; quote the "Test Files" line.
- [ ] **Step 2:** Grep individually for dangling references and confirm no `src/` hits: `mcpSettingAlias`; `createOrUpdateMcpSetting` under `src/pages/settings/administration`; `needsSecrets|getMissingSecretNames|hasLiteralEnvValue|collectPlaceholders|PLACEHOLDER_REGEX`; `formatLastTestTime|formatLastTestFullTime|MCPLastTestStatus|MCPLastTestFields|CATEGORY_LABELS`; `useMCPIntegrationTest|useMCPConfigTest`.
- [ ] **Step 3:** If any integration-project tests exist for this area (`*.integration.test.*` under the touched paths), run them with `--project integration`; otherwise state none exist and skip.

Test-first: no — verification pass over Tasks 1-8's own tests, not new behavior.

- [ ] **Step 4:** Only if Step 1-3 surfaced a fix: `git add -A src/pages/settings/administration src/store && git commit -m "EPMCDME-15541: Fix remaining test references after MCP test capability refactor"`

---

## Negative-constraint pass

- No new toaster variant (Task 5 uses only `success`/`info`/`error`) — no new `StatusEnum` value (Task 7 reuses `InProgress`).
- Test action stays out of the Edit modal (`MCPServerModal` untouched by every task); entry points remain the row menu (Task 5) and details card (Task 8) only.
- Test never overwrites an existing integration — Task 4's modal only selects or creates via `NewIntegrationPopup`, and explicitly drops `createOrUpdateMcpSetting`.
- Secrets never go in the request — Task 1's body stays `{ settings_id }` only.
- No regex scanning remains (R3) — Task 2 deletes every regex/placeholder helper; `needsIntegration` is a plain `.some()`.
- `Checker` is not modified to add a `disabled` prop — Task 4 no-ops the click handler and shows an inline hint instead.
- No `setTimeout`/last-item guess for preselecting a created integration — Task 4 diffs captured ids against the refreshed list.
- No per-row hooks remain — Task 5 deletes both per-row hooks; `MCPServerActions`/`MCPServerDetails` take `onTest`/`isTesting` as props only.
- "In progress" state is in-memory only (R11) — Task 7 reads `mcpStore.testingConfigIds`, no persistence touched.
- R8's "keep as is" items (last_test_* field definitions, the Last-test column's existence, `ServerLastTestSection`'s existence, the row menu entry's existence) are not removed by any task — only their handlers/consumers change.
