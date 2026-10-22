# Technical Research

**Task**: mcp clone modal server configuration edit sensitive-fields
**Generated**: 2026-10-06
**Research path**: filesystem

---

## 1. Original Context

The MCP server clone flow in CodeMie UI is inconsistent and not user-friendly. Currently, cloning an MCP server configuration shows a popup that displays just an array/list of args/fields to clone, giving the user no understanding of what is actually being cloned. The proposal is to: (1) avoid showing that field-selection popup entirely, (2) automatically clone all fields except tokens, passwords, and credentials (sensitive fields), (3) notify the user that sensitive fields were removed/stripped, (4) show a single window styled like the existing 'Edit MCP' modal but titled 'Clone MCP', (5) use a CTA button labeled 'Clone Server' (or similar) that is visually/behaviorally aligned with other CTAs on that window. Need to investigate the current clone flow implementation (modal component showing array of args), the existing Edit MCP modal/window for consistency reference, and how placeholder-value warnings / stripped-fields notices currently work (there was recent related work: EPMCDME-15538 commits about 'placeholder-value warning toast', 'stripped-fields notice', 'sensitive hint', 'stale notice', 'loading scope' in the MCP clone flow). The user wants a proposed UX flow for cloning, not code changes yet.

---

## 2. Codebase Findings

### Existing Implementations (current, already-shipped EPMCDME-15538 flow)

- `src/pages/settings/administration/components/MCPCopyValuesDialog/index.tsx` — **this is the "field-selection popup" the task wants removed.** A `Popup` titled "Copy values to clone" that renders one section per `headers`/`env`/`args`/`url` group, each key as an unchecked-by-default `Checkbox` (label = raw dotted path, e.g. `headers.Authorization`, `env.API_KEY`, `args[2]`, `url.query.token`), a per-section "Select all" checkbox, and a sensitive-value hint string (`"May contain a sensitive value"`) attached via `isSensitivePath`. Footer has Cancel / Clone buttons. This is exactly the "array/list of args/fields" popup described in the task — it shows raw path strings, not semantic field names, and nothing is pre-selected.
- `src/pages/settings/administration/components/MCPCopyValuesDialog/useMCPCopyValuesDialog.ts` — pure logic: `collectCopyValuePaths(server)` groups config keys into `{section, keys}[]`; `isSensitiveKey(path)` tests `/token|secret|key|password|credential|auth/i` against the **path string**; `isSensitivePath` additionally tests the **stringified value** against the same regex (so a secret-looking value in `args` is also hinted even though its path has no sensitive-looking name). This regex is the only existing sensitivity heuristic in the codebase and is the natural candidate for an automatic "strip these" filter in the proposed flow.
- `src/pages/settings/administration/hooks/useMCPManagement.ts` — `hasCopyableValues(server)` (via `collectCopyValuePaths(server).length > 0`) decides whether to show the dialog at all; `handleCloneServer` skips the dialog and calls `runClone(server)` directly only when the source config has **no** headers/env/args/url-query keys. `runClone(server, copyValues?)` calls `mcpStore.cloneConfig`, then sets `strippedFields` from the response, sets `editingServer` to the clone response, and opens `MCPServerModal` (`setShowModal(true)`) — so **the "clone succeeds -> opens edit-style modal" half of the proposed flow already exists**; only the "always show a selection dialog first" half needs removing.
- `src/pages/settings/administration/components/MCPServerModal/index.tsx` — the Edit/Add modal, reused as the post-clone editor. Header is `props.server ? 'Edit MCP Server' : 'Add MCP Server'` — **there is no third "Clone MCP" header state today**; the task's requirement (4) is a net-new conditional. Footer CTA text is `getSubmitButtonText()`: `'Saving...'` while submitting, else `props.server ? 'Update Server' : 'Create Server Configuration'` — again two states only, no "Clone Server" variant. The footer buttons are plain `Button` (`ButtonType.SECONDARY` Cancel / `ButtonType.PRIMARY` submit, both `ButtonSize.MEDIUM`) — this is the "CTA visually/behaviorally aligned with other CTAs" reference point for requirement (5). The modal already has a dismissible "stripped fields" notice banner (`showStrippedFieldsNotice` local state, reset via `useEffect` on `props.visible`/`props.strippedFields` change) rendered above the `<form>` when `strippedFields` is non-empty — this is requirement (3)'s existing mechanism, already wired end-to-end from `mcpStore.cloneConfig`'s response through `useMCPManagement.runClone` into this prop.
- `src/store/mcp.ts` — `cloneConfig(id, copyValues?)` posts `{ copy_values: copyValues }` to `v1/mcp-configs/${id}/clone`; deliberately does **not** toggle the shared `loading` flag (comment explains this is scoped per-row via caller's `cloningId`, not the whole-table flag). Removing the dialog does not change this method's signature — `copyValues` would simply always be passed as `undefined` (clone everything) if the backend's own stripping is relied on, or the strip set would need to be computed and still passed as before if the frontend wants to actively exclude paths before calling. **This is the key open design question** (see Section 6): the backend response already carries `stripped_fields: string[]` (`MCPConfigCloneResponse`), implying the backend itself strips sensitive fields server-side and reports what it removed — nothing in this frontend repo shows the backend accepting a client-provided "exclude" list, only an "include" allowlist (`copy_values`). If backend stripping already matches "tokens/passwords/credentials", simply **always calling `cloneConfig(id)` with no `copy_values`** may be sufficient to satisfy requirement (2) without any new frontend filtering logic — this needs confirming against backend behavior, not assumed from this repo alone.
- `src/pages/settings/administration/components/MCPServerActions.tsx` — kebab menu; `Clone` entry already exists (`hidden: !canClone`, `disabled: cloning`), positioned between Edit and Copy ID. No markup change needed here under the new proposal — the menu entry point is unaffected by removing the intermediate dialog.
- `src/pages/settings/administration/MCPManagementPage.tsx` — renders `MCPCopyValuesDialog` (to be removed) and `MCPServerModal` side by side; computes `canClone = isAdmin || isMaintainer` from `userStore`; passes `strippedFields` into `MCPServerModal`.
- `src/types/entity/mcp.ts` — `MCPConfig.warnings?: {code, message, action?}[]` and `MCPConfigCloneResponse extends MCPConfig { stripped_fields: string[] }` already exist; no type changes implied by removing the dialog.

### Architecture and Layers Affected

- **Component layer**: `MCPCopyValuesDialog` (removal candidate), `MCPServerModal` (new "Clone MCP" header/CTA-text branch), `MCPServerActions` (unaffected).
- **Hook layer**: `useMCPManagement.ts` (`handleCloneServer`/`runClone` simplified to always call `cloneConfig` directly, no dialog-open branch; `hasCopyableValues`/dialog state becomes dead code).
- **Store layer**: `src/store/mcp.ts` `cloneConfig` — signature-compatible either way; `copyValues` argument's purpose changes from "user-selected allowlist" to either unused or an internal auto-computed exclude-driven allowlist.
- **Page layer**: `MCPManagementPage.tsx` (drop the `MCPCopyValuesDialog` render and `cloneDialogServer`/`handleConfirmClone`/`handleCloneDialogClose` plumbing).

### Integration Points

- `src/utils/api.ts` single HTTP layer, `v1/mcp-configs/{id}/clone` POST — payload shape (`copy_values`) and response shape (`stripped_fields`, `warnings`) are fixed by the backend contract already consumed here; this frontend repo has no OpenAPI schema for that endpoint to re-verify against.
- `src/store/user.ts` / `userStore` — `isAdmin`/`isMaintainer` gate, unaffected by this change.
- `src/utils/toaster.ts` — already used for clone failure (`toaster.error`) and the `placeholder_value_present` warning (`toaster.info`); the "notify the user that sensitive fields were removed" requirement (3) is already satisfied by the existing stripped-fields banner in `MCPServerModal`, not a toast — worth deciding in the spec whether a toast is layered on top or the existing banner suffices.

### Patterns and Conventions

- Footer CTA pattern across this feature's modals: `Button` with `ButtonType.PRIMARY`/`ButtonType.SECONDARY`, `ButtonSize.MEDIUM`, text swapped by a small `getXxxButtonText()`-style function keyed on modal mode. Any "Clone Server" CTA should follow this exact shape (new branch in `getSubmitButtonText()` or an equivalent `mode` prop), not a new button component.
- Dismissible notice pattern: local `useState` boolean + `useEffect` reset keyed on `visible`/data identity, `CrossSvg` dismiss button, `rounded-lg bg-surface-elevated border border-border-structural` styling — already the convention for the stripped-fields banner and reusable as-is if the proposal keeps that banner.
- `Popup` is mandatory for all modals (`.ai-run/guides/patterns/modal-patterns.md`); removing `MCPCopyValuesDialog` and widening `MCPServerModal`'s role still complies as long as no raw `Dialog` is introduced.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/modal-patterns.md` — mandates `Popup`, co-located `useXxxModal.ts` hooks, `footerContent` for custom footers; directly constrains how a "Clone MCP" mode would be added to `MCPServerModal` (new prop/mode, not a new modal primitive).
- No `.ai-run/guides/` entry specific to MCP or to this clone feature; conventions are derived from the sibling implementation under `src/pages/settings/administration/`.

### Architectural Decisions

- `docs/superpowers/tasks/2026-10-06-clone-mcp-config-ui/spec.md` and `plan.md` (this directory, committed same day as `HEAD`) document the **currently-shipped** design being reconsidered: explicitly chose a copy-values dialog over "always clone with empty copy_values" because "the story explicitly requires letting the user choose which values to carry over," and explicitly deferred masked-value preview/reveal as a non-goal. The present task supersedes that earlier decision — the UX proposal should note this reversal explicitly rather than silently contradicting it.
- `docs/superpowers/tasks/2026-10-06-clone-mcp-config-ui/technical-analysis.md` — prior research for the same feature area; corroborates all file/pattern findings above (store mutator shape, no masked-value precedent, admin/maintainer gating via `BudgetsManagementPage.tsx`).

### Derived Conventions

- Sensitivity detection in this codebase is **regex-based on path/value strings only** (`/token|secret|key|password|credential|auth/i`), not any schema- or type-driven field classification. Any "automatically strip tokens/passwords/credentials" behavior would most naturally reuse or tighten this exact pattern, applied now to decide exclusion rather than merely to render a hint.

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/mcp.test.ts` — covers `cloneConfig` (success unshifts response, posts `{ copy_values }`; rejection sets error and rethrows) per the prior plan's Task 2.
- `.../hooks/__tests__/useMCPManagement.test.ts` — covers `handleCloneServer`'s dialog-vs-direct branch, `handleConfirmClone` success/failure paths, and the `placeholder_value_present` toast — this file encodes the exact behavior the proposed redesign would change (the dialog-vs-direct branching) and will need the branching assertions replaced with "always calls `cloneConfig` directly."
- `.../components/__tests__/MCPServerActions.accessibility.test.tsx` — covers the Clone menu item's hidden/disabled states; unaffected by removing the intermediate dialog.
- No test file found for `MCPCopyValuesDialog` itself under its own `__tests__/` in this scan (component and hook are tested via `useMCPManagement.test.ts`'s mocked boundary, not directly) — confirm presence before deleting the component in a future implementation pass.

### Testing Framework and Patterns

- Vitest + RTL, `unit`/`integration` projects per `vitest.workspace.ts`; store tests mock `@/utils/api`; hook tests mock `@/store/mcp` and `@/utils/toaster`.

### Coverage Gaps

- No existing test asserts `MCPServerModal`'s header/CTA text for a hypothetical third "clone" mode — because that mode does not exist yet, there is nothing to extend, only to add.
- No test or code anywhere in this repo exercises backend-side field stripping logic directly (it is opaque — only `stripped_fields` in the response is observed); the UX proposal cannot assume the backend's definition of "sensitive" aligns with the frontend's `isSensitiveKey` regex without checking the backend contract.

---

## 5. Configuration and Environment

### Environment Variables

- None specific to MCP clone. Feature-flagged only by `useMcpEnabled()` (`src/hooks/useFeatureFlags`), inherited by the whole MCP management page including clone.

### Configuration Files

- None specific to this flow beyond the feature flag resolution already noted.

### Feature Flags and Deployment Concerns

- No separate flag for clone; any UX change here ships under the same `useMcpEnabled()` gate as the rest of MCP management.

---

## 6. Risk Indicators (updated 2026-10-07, second pass — confirm-popup flow)

**Scope simplified again.** The first revision's two-call sequential clone-then-update submit,
`clonedId` retry state, and client-guessed naming are all removed from scope. The flow is now:
click "Clone" → confirmation popup names the source config (`Clone "{Original Name}"`) → confirm
fires the single existing clone call → popup closes on success or failure → no auto-opened editor.
Editing a clone, if wanted, is the pre-existing, unmodified Edit MCP Server action, triggered
separately and later. `MCPServerModal` needs no new mode at all under this version.

- **Confirmation popup**: reuse the shared `src/components/ConfirmationModal/ConfirmationModal.tsx`
  (header/message/Cancel/Confirm, `confirmDisabled` prop), not a new modal primitive — consistent
  with `.ai-run/guides/patterns/modal-patterns.md`'s requirement that all modals go through `Popup`.
- **Async confirm precedent**: `UnassignFromProjectConfirmationPopup` is the one existing example of
  an async action behind `ConfirmationModal`, using local `isSubmitting` state passed to
  `confirmDisabled` to block double-submission. It is silent on error (`console.error` only) — this
  story's version must diverge from that one aspect and call `toaster.error(...)` with the same
  clone-failure message format already used in `useMCPManagement.ts`, rather than copying the
  silent behavior.
- **`useMCPManagement.handleCloneServer`/`runClone`**: simplified from "open dialog or clone
  directly, then open the edit modal" down to "clone call only, no modal open on success." The
  `MCPCopyValuesDialog` removal, `hasCopyableValues`, `cloneDialogServer`/`handleConfirmClone`/
  `handleCloneDialogClose` plumbing in `MCPManagementPage.tsx`, and the post-clone
  `setEditingServer`/`setShowModal(true)` call in `runClone` are all now dead code to remove, not
  just simplify.
- **No remaining backend-contract ambiguity, no new local-state machine, no naming-preview logic.**
  This version has the smallest net-new surface of all three drafts: a confirmation popup plus a
  single existing API call.

### Original 2026-10-07 (first-revision) risk notes — superseded, retained for traceability

- **Backend contract — RESOLVED.** Checked directly against the backend repo (`../codemie`,
  branch `EPMCDME-15538-Add-clone-mcp-capability`) and its spec
  (`docs/superpowers/tasks/2026-10-05-clone-mcp-capability/spec.md`, revised 2026-10-07): the
  clone endpoint (`POST /v1/mcp-configs/{id}/clone`) takes **no request body**, performs a full
  verbatim deep copy (secrets included, only `auth_config.id` regenerated), and returns a plain
  `MCPConfigResponse` with no `stripped_fields` and no placeholder warning. `copy_values` and all
  stripping logic were removed server-side in the same 2026-10-07 revision this frontend story now
  mirrors. No further backend verification is needed.
- **Reversal of a same-day design decision — now confirmed intentional on both sides.** The
  backend made the identical reversal (full copy instead of secure-by-default) in its own spec
  revision; this is not a frontend-only decision diverging from the backend, both halves of the
  feature agree.
- **No existing "Clone MCP" mode in `MCPServerModal`**: header text, CTA label, and any
  clone-specific framing are still net new to this component — unaffected by the contract
  resolution above.
- **New risk surface (not present in the 2026-10-06 draft): the two-call sequential submit.**
  Because the clone endpoint takes no body, applying user edits made in the draft window requires
  a second (update) call after the clone call succeeds. This introduces local state the frontend
  must track correctly: a `clonedId` set only after the clone call succeeds, so that a retry after
  an update failure never re-invokes the clone call (which would otherwise create a duplicate
  `Copy N of {Name}` record each retry). No existing code in this repo implements this
  two-call-with-conditional-retry pattern; it is net new.
- **Sensitivity regex is now unused by this flow.** `isSensitiveKey`/`isSensitivePath` remain in
  the codebase (still used only for the dialog's UI hint, which is itself being removed) but have
  no role in the verbatim-copy flow — no further action needed beyond removing the dialog that
  was their only caller.
- **No masked-value preview exists anywhere** in the codebase (reconfirmed) — moot under
  verbatim-copy; there is nothing to mask.

---

## 7. Summary for Complexity Assessment (updated 2026-10-07, second pass)

Scope narrowed twice now. The backend contract ambiguity is resolved (confirmed bodiless,
verbatim-copy clone endpoint, no stripping). The first revision's two-call sequential submit,
`clonedId` retry state, and client-guessed naming are now also removed — this version adds no new
mode to `MCPServerModal` at all.

The remaining net-new surface is small: (1) a confirmation popup (reusing the shared
`ConfirmationModal`) stating `Clone "{Original Name}"`, wired to the existing `cloneConfig` call,
with `isSubmitting`/`confirmDisabled` blocking double-submission (mirroring
`UnassignFromProjectConfirmationPopup`'s pattern) and a `toaster.error(...)` call on failure
(diverging from that precedent's silent-failure handling); (2) deleting
`MCPCopyValuesDialog`/`useMCPCopyValuesDialog.ts` outright; (3) simplifying
`useMCPManagement.handleCloneServer`/`runClone` to a single clone call with no post-success modal
open, and removing `cloneDialogServer`/`handleConfirmClone`/`handleCloneDialogClose` from
`MCPManagementPage.tsx`; (4) removing the `stripped_fields`/`placeholder_value_present` handling
from `useMCPManagement.ts` and the stripped-fields banner from `MCPServerModal/index.tsx`, since
neither is ever populated by the confirmed backend contract. Test impact:
`useMCPManagement.test.ts`'s dialog-branching, stripped-fields, and placeholder assertions need
replacing with confirm-popup-and-single-clone-call assertions; no new `MCPServerModal` test
surface is needed, since that component is untouched.

---

## 8. External References

None named by the task. The task references prior commits (EPMCDME-15538: "placeholder-value warning toast", "stripped-fields notice", "sensitive hint", "stale notice", "loading scope") as context rather than as an external source to read; these were resolved internally via `git log` and are reflected in Section 2 above as the current `MCPServerModal`/`useMCPManagement`/`mcp.ts` implementations, not as a separate document.
