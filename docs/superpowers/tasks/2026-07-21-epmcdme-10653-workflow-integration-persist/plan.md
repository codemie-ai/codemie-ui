# Plan — EPMCDME-10653: Workflow Tool integration not persisted after tool toggle

## Requirements

**Bug**: In the Workflow editor Tool node popup (`ToolSelector` → `ToolsConfiguration` opened with `singleToolSelection={true}`), when the user picks one tool, then picks an integration for its toolkit, then toggles another tool in the same toolkit, the previously selected integration is silently wiped. On Save the workflow persists with `integration_alias = undefined`; on reopen the integration dropdown is empty.

**Root cause** (confirmed by tech-analyst): `src/hooks/useToolkitSelection.ts` `toggleSingleTool` else-branch (lines 63–72) builds a new toolkit entry from the catalog `toolkit` parameter and explicitly writes `settings: undefined`, discarding the `settings` field of the existing `selectedToolkits` entry.

**Fix surface**:
- Change line 68 of `src/hooks/useToolkitSelection.ts` from `settings: undefined,` to `settings: existingToolkit?.settings,`.
- Add one regression test in `src/hooks/__tests__/useToolkitSelection.test.ts` covering the "toolkit already has settings → toggle a new tool → settings preserved" path.

**Non-goals**:
- Do not touch `toggleMultiTool` (Assistants form flow is unaffected).
- Do not touch tool-level `settings_config=true` behavior — for a per-tool integration, the old tool row is replaced by a new tool row with no prior settings, which is correct-by-design (the integration is stored on `tool.settings`, not `toolkit.settings`).
- Do not change extraction/hydration code (`extractToolFromToolkits`, `getToolkitsFromConfiguration`, `normalizeToolkitSettingsForToolForm`) — analysis confirms they are correct.

## Tasks

### Task 1 — Add regression test: toggleSingleTool preserves toolkit.settings when a different tool is toggled

**Test-first: yes** — write a new test case in `src/hooks/__tests__/useToolkitSelection.test.ts` describing the missing invariant: when `selectedToolkits[0].settings` is a non-null `Setting`, calling `toggleSingleTool(sameToolkit, differentTool)` must yield a `selectedToolkits[0].settings` that equals the previous setting. Follow the existing test style in that file (arrange a fake toolkit + integration setting object, call the hook via `renderHook`, assert on the `onToolkitsChange` mock's payload).

The test must fail against current `settings: undefined` behavior. Run the test to observe RED before implementing the fix.

### Task 2 — Fix `toggleSingleTool` to preserve existing toolkit settings

**Test-first: no** (test written in Task 1 provides the guard) — in `src/hooks/useToolkitSelection.ts`, change line 68 in the else-branch of `toggleSingleTool`:

```diff
-        settings: undefined,
+        settings: existingToolkit?.settings,
```

Rationale: `existingToolkit` is already resolved above via `selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)`. If no prior toolkit is selected, `existingToolkit` is `undefined` and the fallback stays `undefined` — matching current behavior for the first-click case. If a prior toolkit with an integration exists, its settings survive the tool toggle.

Run the Task 1 test to observe GREEN. Run the full `useToolkitSelection.test.ts` file to confirm no regressions in the three existing `toggleSingleTool` cases (they all start from empty selected state and are unaffected by this branch).

### Task 3 — Commit with EPMCDME-10653 prefix per repo git-workflow standard

**Test-first: no** — single commit `EPMCDME-10653: Preserve toolkit integration when toggling single tool selection`. Includes the hook change and the new test.

### Task 4 — Scope extension after code review: gate the preservation by tool.settings_config

Follow-up from the code-review round: if the newly toggled tool has `settings_config: true`, the toolkit-level `settings` is not what `extractToolkitSettings` (`src/utils/toolkit.ts`) reads on save — it reads `tool.settings`. Blindly preserving `existingToolkit?.settings` would leave the right-side `IntegrationSelector` in the popup showing the previous integration even though the save path drops it, producing a UI/save mismatch.

**Test-first: yes** — add a second regression test in the same describe block: `existingToolkit.settings = <int>` + `secondTool.settings_config = true` → expected `settings: undefined` in the emitted toolkit. Must fail against the previous unconditional preservation.

Then narrow the else-branch in `toggleSingleTool`:

```ts
const preserveToolkitSettings = !tool.settings_config
// ...
settings: preserveToolkitSettings ? existingToolkit?.settings : undefined,
```

Commit as a fix-up on the same branch. Reviewed baseline for the check round is `93279cd8a`.
