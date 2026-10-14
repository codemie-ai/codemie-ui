# Clone MCP Configuration (UI) Implementation Plan — EPMCDME-15538

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permission-gated "Clone" action to the MCP management list that, via a
copy-values dialog, calls a new `mcpStore.cloneConfig`, then opens the existing edit modal
pre-filled with the clone, surfacing stripped-fields and placeholder-value warnings.

**Architecture:** Store method mirrors `createConfig`/`updateConfig`
(`src/store/mcp.ts:202-223`). A new co-located `MCPCopyValuesDialog` (`Popup`-based, per
`.ai-run/guides/patterns/modal-patterns.md`) collects dotted-path `copy_values` from the source
config. `useMCPManagement` owns the clone/dialog/in-flight state and wires the clone result into
the existing `MCPServerModal` (new `strippedFields` prop/banner). Permission gating and error
toasts reuse the `isAdmin`/`isMaintainer` + `toaster.error` pattern from
`BudgetsManagementPage.tsx:106-113`.

**Tech Stack:** React 18, TypeScript 5, Valtio, react-hook-form, Vitest + RTL.

## Global Constraints

- Never add a masked-value preview/reveal — checkboxes show key names only (Non-goal).
- No bulk clone, no re-linking assistants/workflows, no carrying usage/audit metadata (Non-goal).
- No backend change, no capabilities endpoint, no naming-collision handling (Non-goal).
- No telemetry/clone-event tracking (Non-goal).
- No per-field highlighting inside the raw-JSON textarea — banner/list only (Non-goal).
- Only the specific row's Clone menu item disables while in flight — never all rows (Non-goal).
- Clone stays available on `is_system` configs — never add an `is_system` check (spec).
- Commit per task using the repository's existing convention
  (`.ai-run/guides/standards/git-workflow.md`); no commit format is invented here.

---

### Task 1: Types — `warnings`, `MCPConfigCloneResponse`, `auth_config`

**Files:** Modify `src/types/entity/mcp.ts:24-33` (`MCPServerConfig`), `:41-60` (`MCPConfig`).

**Produces:** `MCPConfig.warnings?: { code: string; message: string; action?: string }[]`,
`MCPServerConfig.auth_config?: Record<string, unknown>`, new exported
`MCPConfigCloneResponse extends MCPConfig { stripped_fields: string[] }`.

Test-first: no — type declarations only; exercised by Task 2's store test.

- [ ] Add `warnings` field to `MCPConfig` (after `update_date`, line 59) and `auth_config` field
      to `MCPServerConfig` (after `single_usage`, line 32), both as shown above.
- [ ] Add `export interface MCPConfigCloneResponse extends MCPConfig { stripped_fields: string[] }`
      after the `MCPConfig` interface.
- [ ] Run the project's type-check script; confirm no regressions.
- [ ] Commit.

---

### Task 2: Store — `mcpStore.cloneConfig`

**Files:** Modify `src/store/mcp.ts:28-57` (interface), insert new method after `createConfig`
(`:202-223`). Test: `src/store/__tests__/mcp.test.ts`.

**Consumes:** `MCPConfigCloneResponse` (Task 1).
**Produces:** `mcpStore.cloneConfig(id: string, copyValues?: string[]): Promise<MCPConfigCloneResponse>`.

Test-first: yes — `cloneConfig` posts to `v1/mcp-configs/{id}/clone` with `{ copy_values }`,
unshifts the response into `configs`, and on rejection sets `this.error` and rethrows; no test
exists yet.

- [ ] Extend the `vi.mock('@/utils/api', ...)` in `mcp.test.ts` so `post` is a controllable
      `vi.fn()` (mirror the existing `mockApiGet` wiring), and add a
      `describe('mcpStore.cloneConfig', ...)` block with two cases: success unshifts the response
      and calls `api.post` with `{ copy_values: copyValues }`; rejection sets `mcpStore.error` to
      a string containing the rejection's `response.data.message` and rethrows.
- [ ] Run `npx vitest run --project unit src/store/__tests__/mcp.test.ts` — expect FAIL
      (`cloneConfig is not a function`).
- [ ] Add `cloneConfig` to the `MCPStore` interface and implement it, copying `createConfig`'s
      loading/error/try-catch-finally shape exactly, swapping the call for
      `api.post(\`v1/mcp-configs/${id}/clone\`, { copy_values: copyValues })` and the error
      prefix for `Failed to clone MCP configuration:`.
- [ ] Run the test again — expect PASS.
- [ ] Commit.

---

### Task 3: `MCPCopyValuesDialog` component

**Files:** Create `src/pages/settings/administration/components/MCPCopyValuesDialog/index.tsx`
and co-located `useMCPCopyValuesDialog.ts` (per modal-patterns.md: `Popup` only, logic in the
hook). Test: `.../MCPCopyValuesDialog/__tests__/MCPCopyValuesDialog.test.tsx`.

**Consumes:** `MCPConfig`, `Checkbox` (`@/components/form/Checkbox`), `Popup` (`@/components/Popup`).
**Produces:** `collectCopyValuePaths(server: MCPConfig | null): { section: string; keys: string[] }[]`
and `MCPCopyValuesDialog({ visible, server, onHide, onConfirm }: { visible: boolean; server: MCPConfig | null; onHide: () => void; onConfirm: (copyValues: string[]) => void })`.
Dotted-path format: `headers.<Key>`, `env.<KEY>`, `args[<index>]`, `url.query.<key>` (parse
`config.url`'s query string via the `URL` API; a key is "sensitive-hinted" when it matches
`/token|secret|key|password|credential|auth/i`, cosmetic only, default stays unchecked). Sections
with zero keys are omitted entirely.

Test-first: yes — `collectCopyValuePaths` groups a config's headers/env/args/url-query keys into
dotted paths per section and omits empty sections (e.g. a config with only `headers` and `args`
yields exactly those two sections, in that key shape); test does not exist yet.

- [ ] Write the failing test for `collectCopyValuePaths` against a fixture config with
      `headers`, `env`, `args`, and a `url` carrying two query params, asserting the four
      sections and their dotted paths; add a second case asserting `[]` for an empty `config`.
- [ ] Run the test — expect FAIL (module not found).
- [ ] Implement `collectCopyValuePaths` and `isSensitiveKey` in `useMCPCopyValuesDialog.ts`
      (pure functions, as specified above), plus a `useMCPCopyValuesDialog(server)` hook holding
      a `Set<string>` of checked paths with `toggleKey`, `toggleSection` (select-all), and `reset`.
- [ ] Implement `index.tsx`: a `Popup` (`header="Copy values to clone"`, footer with
      Cancel/Clone buttons mirroring `MCPServerModal`'s footer pattern) rendering one block per
      section from the hook — a heading plus a "select all" `Checkbox`, then one `Checkbox` per
      key (label = dotted path, `hint` set when `isSensitiveKey(path)`). Confirm calls
      `onConfirm(Array.from(checked))` then resets; cancel resets without confirming.
- [ ] Run the test again — expect PASS.
- [ ] Commit.

---

### Task 4: `MCPServerActions` — gated, disable-while-cloning Clone entry

**Files:** Modify `src/pages/settings/administration/components/MCPServerActions.tsx:29-34`
(props), `:57-78` (`menuActions`). Test:
`.../components/__tests__/MCPServerActions.accessibility.test.tsx`.

**Consumes:** `NavigationItem.disabled`/`.hidden` (`src/components/NavigationMore/NavigationMore.tsx:36-45`,
already supported — `hidden` items are filtered out of the rendered menu, `disabled` items render
disabled).
**Produces:** new props `onClone: (server: MCPConfig) => void`, `canClone: boolean`,
`cloning: boolean`. Task 5 supplies these from `columnRenderers.tsx`.

Test-first: yes — the Clone menu item is absent entirely when `canClone` is false, present and
enabled when `canClone` is true and `cloning` is false, present and disabled when `cloning` is
true; no such assertions exist today.

- [ ] Add three cases to the accessibility test: render with `canClone={false}` and assert no
      "Clone" item appears in the menu; render with `canClone={true} cloning={false}` and assert
      a "Clone" item is present and not disabled; render with `cloning={true}` and assert it is
      present but disabled.
- [ ] Run the test — expect FAIL (`onClone`/`canClone`/`cloning` props don't exist).
- [ ] Extend `MCPServerActionsProps` and the component signature with the three new props. Insert
      a `menuActions` entry after `Edit`:
      `{ title: 'Clone', icon: <CopySvg className="w-[18px] h-3.5" />, onClick: () => onClone(server), disabled: cloning, hidden: !canClone }`
      (reuse the already-imported `CopySvg`).
- [ ] Run the test again — expect PASS.
- [ ] Commit.

---

### Task 5: Wire the clone flow — `columnRenderers`, `useMCPManagement`, `MCPManagementPage`

**Files:** Modify `src/pages/settings/administration/utils/columnRenderers.tsx:22-26,84-91`;
`src/pages/settings/administration/hooks/useMCPManagement.ts` (new state/handlers, around
`handleEditServer` at `:53-56`); `src/pages/settings/administration/MCPManagementPage.tsx:65-120,159-164`
(gating, dialog render). Test: new `.../hooks/__tests__/useMCPManagement.test.ts`.

**Consumes:** `mcpStore.cloneConfig` (Task 2), `MCPCopyValuesDialog` (Task 3), `MCPServerActions`
new props (Task 4), `toaster.error` (`@/utils/toaster`), `userStore` (gating, per
`BudgetsManagementPage.tsx:106-113`).
**Produces:** `useMCPManagement()` additionally returns `cloneDialogServer: MCPConfig | null`,
`cloningId: string | null`, `strippedFields: string[]`, `handleCloneServer(server: MCPConfig)`,
`handleConfirmClone(copyValues: string[])`, `handleCloneDialogClose()`. Task 6 consumes
`strippedFields`.

Test-first: yes — `handleCloneServer` calls `mcpStore.cloneConfig(id)` directly (no dialog) when
the source config has no headers/env/args/url, and opens the dialog (sets `cloneDialogServer`)
otherwise; `handleConfirmClone` on success sets `editingServer`/`showModal`/`strippedFields` from
the response, and on rejection calls `toaster.error` without touching modal state; none of this
exists yet.

- [ ] Write `useMCPManagement.test.ts` (mock `@/store/mcp`'s `cloneConfig` and
      `@/utils/toaster`'s `error`) with four cases: (1) a server with an empty `config` triggers
      a direct `cloneConfig(id, undefined)` call and leaves `cloneDialogServer` null; (2) a
      server with `config.headers` set leaves `cloneDialogServer` equal to that server and does
      not call `cloneConfig`; (3) `handleConfirmClone(['headers.Authorization'])` resolving with
      `{ ...config, stripped_fields: ['config.auth_token'] }` results in `editingServer`,
      `showModal`, and `strippedFields` reflecting that response; (4) `handleConfirmClone`
      rejecting with `{ response: { data: { message: 'boom' } } }` calls
      `toaster.error('boom')` and leaves `showModal`/`editingServer` unchanged.
- [ ] Run the test — expect FAIL (new exports don't exist).
- [ ] In `useMCPManagement.ts`: add `cloneDialogServer`, `cloningId`, `strippedFields` state; a
      `hasCopyableValues(server)` helper checking `config.headers`/`env`/`args`/`url` for any
      content; `handleCloneServer(server)` that calls the dialog-opening setter when
      `hasCopyableValues` is true, else directly awaits `mcpStore.cloneConfig(server.id)`;
      `handleConfirmClone(copyValues)` that awaits `mcpStore.cloneConfig(server.id, copyValues)`
      for the stashed dialog server; both success paths set `strippedFields`, `editingServer`,
      `showModal`, and the failure path calls `toaster.error(error.response?.data?.message ?? error.message)`
      — wrap both in a shared `runClone(server, copyValues?)` to avoid duplicating the
      try/finally that tracks `cloningId`. Add `handleCloneDialogClose()` clearing
      `cloneDialogServer`. Reset `strippedFields` in `handleModalClose` (line 58) so it never
      leaks into the next modal open. Return all six new values/handlers.
- [ ] Run the test again — expect PASS.
- [ ] In `columnRenderers.tsx`: extend `ColumnRenderersProps` with
      `handleCloneServer: (server: MCPConfig) => void; canClone: boolean; cloningId: string | null`,
      and pass `onClone={handleCloneServer} canClone={canClone} cloning={cloningId === item.id}`
      into the `<MCPServerActions>` render.
- [ ] In `MCPManagementPage.tsx`: import `userStore`, compute
      `canClone = (currentUser?.isAdmin ?? false) || (currentUser?.isMaintainer ?? false)` per
      the `BudgetsManagementPage.tsx:106-113` pattern; destructure the six new hook values and
      pass `handleCloneServer, canClone, cloningId` into `createColumnRenderers`; render
      `<MCPCopyValuesDialog visible={Boolean(cloneDialogServer)} server={cloneDialogServer} onHide={handleCloneDialogClose} onConfirm={handleConfirmClone} />`
      next to the existing `MCPServerModal`.
- [ ] Commit.

---

### Task 6: `MCPServerModal` stripped-fields banner and `placeholder_value_present` toast

**Files:** Modify `src/pages/settings/administration/components/MCPServerModal/index.tsx:34-39,88-97`;
`src/pages/settings/administration/hooks/useMCPManagement.ts:63-74` (`handleModalSubmit`);
`src/pages/settings/administration/MCPManagementPage.tsx:159-164` (pass `strippedFields`). Test:
extend `useMCPManagement.test.ts`.

**Consumes:** `strippedFields` (Task 5), `MCPConfig.warnings` (Task 1).
**Produces:** `MCPServerModal` accepts `strippedFields?: string[]`.

Test-first: yes — after `handleModalSubmit` resolves a create/update whose response's `warnings`
contains `{ code: 'placeholder_value_present', message }`, `toaster.info` is called with that
`message`; no `warnings` (or an empty array) means `toaster.info` is not called; neither
assertion exists yet.

- [ ] Extend `useMCPManagement.test.ts`: mock `mcpStore.updateConfig` to resolve
      `{ ...config, warnings: [{ code: 'placeholder_value_present', message: 'Re-enter the token' }] }`
      and assert `toaster.info('Re-enter the token')` after `handleModalSubmit` resolves; a
      second case with `warnings: []` asserts `toaster.info` is not called.
- [ ] Run the test — expect FAIL.
- [ ] In `handleModalSubmit`, capture the mutator's return value, find a `warnings` entry with
      `code === 'placeholder_value_present'`, and call `toaster.info(entry.message)` when found,
      before `handleModalClose()`.
- [ ] Run the test again — expect PASS.
- [ ] In `MCPServerModal/index.tsx`: add `strippedFields?: string[]` to the props, and render a
      dismissible info block above the `<form>` listing each path in `strippedFields` as a
      bullet, under the heading "The following values were not copied and need to be
      re-entered:", only when `strippedFields` is non-empty.
- [ ] In `MCPManagementPage.tsx`, pass `strippedFields={strippedFields}` into the
      `<MCPServerModal>` render.
- [ ] Commit.
