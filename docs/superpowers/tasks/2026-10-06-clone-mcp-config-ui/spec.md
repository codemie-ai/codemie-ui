# Spec: Clone MCP Configuration (UI) — EPMCDME-15538

## Approach

Add a `Clone` action to the MCP management list that opens a new "Copy values" dialog, posts
the selected paths to the existing clone endpoint via a new `mcpStore.cloneConfig`, then opens
the existing `MCPServerModal` in edit mode pre-loaded with the clone response. Stripped-fields
and placeholder warnings surface as banners/toasts rather than per-field highlighting, since the
modal edits raw JSON. Permission gating and error surfacing reuse the `isAdmin`/`isMaintainer` +
`toaster.error` pattern already established in `BudgetsManagementPage.tsx`
(`src/pages/settings/administration/BudgetsManagementPage.tsx`), rather than inventing a new one.

Rejected: (a) skipping the copy-values dialog and always cloning with empty `copy_values` —
rejected because the story explicitly requires letting the user choose which values to carry
over; (b) a fully generic "diff viewer" for stripped fields — rejected as over-scoped against a
single-textarea modal; a flat bulleted list of dotted paths is sufficient and matches the
existing warning/toast idioms already in the app.

## Changes

**Types** (`src/types/entity/mcp.ts`): add `warnings?: { code: string; message: string; action?: string }[]`
to `MCPConfig`/`MCPConfigResponse`-equivalent type(s); add `MCPConfigCloneResponse extends MCPConfig`
with `stripped_fields: string[]`; add `auth_config?: Record<string, unknown>` to `MCPServerConfig`
if not already present (verify at `src/types/entity/mcp.ts` before adding — do not duplicate).

**Store** (`src/store/mcp.ts`): add
```ts
cloneConfig(id: string, copyValues?: string[]): Promise<MCPConfigCloneResponse>
```
following the exact loading/error/try-catch-finally/rethrow shape of `createConfig`/`updateConfig`
(same file, existing methods) — `api.post(\`v1/mcp-configs/${id}/clone\`, { copy_values: copyValues })`,
`.json()`, unshift into `this.configs`.

**Copy-values dialog** (new, `src/pages/settings/administration/components/MCPCopyValuesDialog/`,
`index.tsx` + co-located `useMCPCopyValuesDialog.ts`, per `.ai-run/guides/patterns/modal-patterns.md`
— `Popup`, never raw `Dialog`): built from the *source* config's own `headers`, `env`, `args`,
and `url` query keys, grouped into four sections (omit a section with no keys). Each key is an
unchecked-by-default checkbox; its dotted path (`headers.<Key>`, `env.<KEY>`, `args[<index>]`,
`url.query.<key>`) is what gets collected into `copy_values` on confirm. Each section has a
"select all" control. A key is flagged with a small inline hint icon/label when its name matches
`/token|secret|key|password|credential|auth/i` — this is cosmetic only and does not change
default-unchecked state. No masked-value preview/reveal is included (see Non-goals). If the
source config has no header/env/arg/url-query keys at all, skip the dialog and call
`cloneConfig(id)` with no `copy_values` directly.

**Menu entry** (`MCPServerActions.tsx` + `columnRenderers.tsx`): add a `Clone` item to the existing
`menuActions` array, positioned after `Edit`. Visible only when the viewer is admin or maintainer
(same boolean source as the page-level gate — `userStore.user.isAdmin`/`isMaintainer`); otherwise
omitted from the menu entirely (not merely disabled), satisfying "never see an enabled Clone
action" via not seeing it at all. No `is_system` check — system configs remain cloneable.

**Hook** (`useMCPManagement.ts`): new state for copy-values dialog visibility/target config and an
in-flight boolean keyed by config id (or a single in-flight id, since clone is one-at-a-time from
the menu). `handleCloneServer(server)` opens the dialog; `handleConfirmClone(copyValues)` sets
in-flight, calls `mcpStore.cloneConfig`, and on success sets `editingServer` to the response and
opens `MCPServerModal`, also stashing `stripped_fields` for the banner. On failure, calls
`toaster.error(error.response?.data?.message ?? error.message)`, leaves the list/modal untouched,
clears in-flight — no partial state is shown. While in-flight, the Clone menu item for that row is
disabled (new local/hook state; no existing per-item disabled pattern to reuse, per analysis).

**Modal banner** (`MCPServerModal/index.tsx`): new optional `strippedFields?: string[]` prop;
when non-empty and the modal is freshly opened for a clone, render a dismissible info banner
above the form listing the stripped paths in plain language (e.g. "The following values were not
copied and need to be re-entered: …"). On any save (create or update) whose response contains a
`warnings` entry with `code === "placeholder_value_present"`, show `toaster.info` (or `.error`,
matching existing severity conventions for non-blocking warnings) with that warning's `message`
after the save succeeds — this is independent of the clone flow and applies to ordinary
create/update too, per requirement 7.

## Acceptance Criteria

- Clone item appears in the MCP row menu only for admin/maintainer viewers; absent for everyone else.
- Clone is available on system-provided configs.
- Clicking Clone (when the source has any headers/env/args/url-query keys) opens a dialog grouping those keys by section, each unchecked by default, each group select-all-able, sensitive-looking keys visually hinted; confirming calls `cloneConfig` with the checked paths as `copy_values`.
- If the source has none of those keys, Clone calls `cloneConfig` directly with no dialog.
- On clone success, `MCPServerModal` opens pre-filled with the clone response in edit mode; no navigation occurs otherwise.
- On clone failure, a toaster shows the server's error message; no modal opens; the list is unchanged; the Clone action re-enables.
- The Clone menu item is disabled for a row while that row's clone request is in flight.
- When the modal opens for a fresh clone with a non-empty `stripped_fields`, a banner lists those paths.
- After any create/update save whose response includes a `placeholder_value_present` warning, a toast surfaces that warning's message.
- `mcpStore.cloneConfig`, the new types (`warnings`, `stripped_fields`, `auth_config` if missing), and the dialog all exist as specified above.

## Non-goals

- Masked-value preview with a reveal toggle — explicitly deferred; checkboxes show key names only, never values.
- Bulk clone, re-linking assistants/workflows to the clone, carrying over usage history/counters/audit metadata.
- Any backend change, a capabilities endpoint, or client-side naming-collision handling.
- Telemetry/clone-event tracking.
- Per-field highlighting of stripped values inside the raw-JSON textarea (banner/list only).
- A generic "disable all menu items while any row is busy" mechanism — only the specific row's Clone item is disabled.

## Testing

Extend `src/store/__tests__/mcp.test.ts` with a `cloneConfig` case mirroring how `createConfig`
would be tested (mock `api.post`, assert unshift + loading/error transitions). Add an a11y/menu
test for the new Clone entry alongside `MCPServerActions.accessibility.test.tsx`. No existing test
covers `useMCPManagement.ts` or `MCPServerModal`; new behavior here should get at least one
integration-style test per the project's `integration` Vitest project if time allows, but is not
blocking given no prior coverage baseline exists for either file.
