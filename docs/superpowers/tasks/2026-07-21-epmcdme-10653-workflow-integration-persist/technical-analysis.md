# Technical Research

**Task**: workflow-editor tool-selection integration-persist useToolkitSelection
**Generated**: 2026-07-21T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-10653 — UI: Settings not saved when selecting Integration first and then Tool.

Bug report (verbatim):
When configuring a Workflow in CodeMie and adding the Git tool to an agent, the user selects an integration for Git and saves the configuration. Upon reopening the tool settings, the previously selected integration is not shown—the integration appears unchosen, indicating the configuration was not persisted.

Preconditions:
- User has access to Workflow editor in CodeMie platform
- At least one valid Git integration is available
- Workflow with a Git tool node to configure

Steps to Reproduce:
1. Open Workflow editor and select agent node/tool configuration.
2. Add Git tool to the agent.
3. Select a valid integration from the dropdown (e.g., "Edx-git-ulmo...").
4. Select one or more Git features/tools.
5. Click Save.
6. Reopen agent tool configuration for the same workflow.
7. Observe that the integration selection is not persisted (dropdown shows no selection/empty).

Expected: Integration selected for the Git tool remains after saving and reopening.

Coordinator already located the likely root cause:
- File: src/hooks/useToolkitSelection.ts
- Function: toggleSingleTool
- Issue: unconditionally sets `settings: undefined` when adding a tool. In the Workflow ToolSelector popup singleToolSelection=true is used, so any click on a tool after the integration was chosen destroys the previously assigned `toolkit.settings` (and potentially `tool.settings` when settings_config=true).

The workflow tool selection popup is opened from src/pages/workflows/editor/configPanels/components/ToolSelector.tsx and renders ToolsConfiguration with singleToolSelection={true}. On save ToolTab.saveData → extractToolFromToolkits reads integration_alias from `toolkit.settings?.alias` (or tool.settings?.alias when settings_config=true) via src/utils/toolkit.ts:extractToolkitSettings.

---

## 2. Codebase Findings

### Existing Implementations

- `src/hooks/useToolkitSelection.ts` — hook that owns all selection state mutations: `toggleSingleTool`, `toggleMultiTool`, `updateToolkitSetting`, `updateToolSetting`, `updateSelectedToolkits`
- `src/pages/workflows/editor/configPanels/components/ToolSelector.tsx` — Workflow-specific popup that renders `ToolsConfiguration` with `singleToolSelection={true}` and manages staged state
- `src/pages/assistants/components/AssistantForm/components/Toolkits/ToolsConfiguration.tsx` — shared component; routes tool clicks to `toggleSingleTool` or `toggleMultiTool` based on `singleToolSelection` prop (default `false`)
- `src/pages/assistants/components/AssistantForm/components/Toolkits/Toolkit.tsx` — renders the integration dropdowns; calls `updateToolkitSetting` (toolkit-level) or `updateToolSetting` (tool-level, `settings_config=true`)
- `src/pages/workflows/editor/configPanels/ToolTab.tsx` — reads `selectedToolkits` state on save via `extractToolFromToolkits`; initializes form on open via `ToolForm`
- `src/pages/workflows/editor/configPanels/components/ToolForm.tsx` — runs `getToolkitsFromConfiguration` + `normalizeToolkitSettingsForToolForm` in a `useEffect` on open to rehydrate form state
- `src/utils/toolkit.ts` — pure utilities: `extractToolkitSettings`, `applyToolkitSettings`, `normalizeToolkitSettingsForToolForm`
- `src/utils/workflows.ts` — `getToolkitsFromConfiguration`: reconstructs `selectedToolkits` from saved config + available toolkits + integration settings

### Bug Confirmation — toggleSingleTool

`toggleSingleTool` in `src/hooks/useToolkitSelection.ts` lines 56–74:

```ts
const toggleSingleTool = useCallback(
  (toolkit: AssistantToolkit, tool: Tool) => {
    const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)
    const toolExists = existingToolkit?.tools.find((t) => t.name === tool.name)

    if (toolExists) {
      onToolkitsChange([])
    } else {
      onToolkitsChange([
        {
          ...toolkit,          // spreads the CATALOG toolkit — has no settings
          tools: [tool],
          settings: undefined, // ← BUG: unconditionally destroys settings
        },
      ])
    }
  },
  [selectedToolkits, onToolkitsChange]
)
```

The `toolkit` parameter is passed in from the catalog of available toolkits, not from `selectedToolkits`. Catalog entries have no `settings`. `existingToolkit` (which holds the user-selected integration in its `settings` field) is found but never read in the else branch. `settings: undefined` is then written explicitly.

The fix is one line in the else branch:

```ts
settings: existingToolkit?.settings,   // preserve instead of undefined
```

### settings_config=true Path — Secondary Concern

When a tool has `settings_config === true`, the integration is stored on `tool.settings` (per-tool), not `toolkit.settings`. The `tool` parameter in `toggleSingleTool` also comes from the catalog and has no `settings`. If the user selects a per-tool integration and then clicks the same toolkit again to pick a different tool, the selected tool's settings are new (no prior entry) and there is nothing to preserve — this is correct behavior. However, if the user clicks the *same* tool name that is already selected (the `toolExists` branch), the function calls `onToolkitsChange([])` which clears everything including any `tool.settings`. This is an edge case for the deselect scenario and probably acceptable since deselecting clears the toolkit entirely.

The more realistic risk with `settings_config=true` would be: user sets integration (stored on `tool.settings` via `updateToolSetting`), then clicks a *different* tool within the same toolkit. `toggleSingleTool` builds `tools: [newTool]` where `newTool` is from the catalog (no settings). The new tool has no prior settings to preserve anyway since it's a different tool — this case is actually fine. The bug is specifically when integration is set at the *toolkit* level (`toolkit.settings`) and then the user changes the selected tool.

### Architecture and Layers Affected

- **Hook layer** (`src/hooks/useToolkitSelection.ts`): owns mutation logic — the bug lives here
- **UI/component layer** (`ToolsConfiguration.tsx`, `Toolkit.tsx`, `ToolSelector.tsx`): renders the integration picker and tool list; dispatches to the hook
- **Form/panel layer** (`ToolTab.tsx`, `ToolForm.tsx`): orchestrates load (reconstruction) and save (serialization) of the tool config
- **Utility layer** (`src/utils/toolkit.ts`, `src/utils/workflows.ts`): pure serialization and deserialization functions; these are correct and unaffected by the bug

### Integration Points

- `ToolSelector.tsx` → `ToolsConfiguration` (singleToolSelection=true) → `useToolkitSelection` (via props: `onToolkitsChange`)
- `ToolsConfiguration` routes to `toggleSingleTool` (singleToolSelection=true) or `toggleMultiTool` (false)
- `Toolkit.tsx` → `updateToolkitSetting` / `updateToolSetting` in `useToolkitSelection`
- `ToolTab.saveData` → `extractToolFromToolkits` → `extractToolkitSettings` → reads `toolkit.settings?.alias` or `tool.settings?.alias`
- `ToolForm` useEffect on open → `getToolkitsFromConfiguration` → `normalizeToolkitSettingsForToolForm` → writes to react-hook-form `toolkits` field

### State Flow — Complete Path

**Correct initialization on reopen (works fine):**
1. `ToolSelector.handleOpenToolPopup` → `setStagedToolkits(toolkits)` — copies saved `toolkits` prop (with `toolkit.settings`) into staged state
2. `ToolsConfiguration` renders with `stagedToolkits`
3. Integration picker shows the pre-selected integration from `toolkit.settings`

**Bug path when user clicks a tool after selecting integration:**
1. User opens popup: `stagedToolkits[0].settings = { alias: "Edx-git-ulmo...", ... }` ✓
2. User clicks a tool: `toggleSingleTool(catalogToolkit, tool)` is called
3. `existingToolkit` is found (has `.settings`) but ignored in the else branch
4. `onToolkitsChange([{ ...catalogToolkit, tools: [tool], settings: undefined }])` — settings wiped
5. `setStagedToolkits(newValue)` — `stagedToolkits[0].settings = undefined`
6. User clicks Save: `handleSubmitToolPopup` → `onToolkitsChange(stagedToolkits)` — propagates undefined settings
7. `ToolTab.saveData` → `extractToolFromToolkits` → `extractToolkitSettings` returns `{ alias: undefined }`
8. `integration_alias: undefined` is written to saved workflow config
9. User reopens: `getToolkitsFromConfiguration` finds the tool by name but has no integration_alias to look up → toolkit is reconstructed without settings → integration picker shows empty

**Correct multi-tool path (Assistants — unaffected):**
`toggleMultiTool` → `updateSelectedToolkits(toolkit, updatedTools)` → when existing toolkit found: `{ ...tk, tools: updatedTools }` — spreads `tk` which includes `tk.settings`. Settings are preserved.

### Patterns and Conventions

- `useCallback` with dependency arrays throughout `useToolkitSelection.ts` — standard React pattern
- Settings stored at two levels depending on `settings_config`: toolkit-level (`toolkit.settings`) for shared-integration toolkits, tool-level (`tool.settings`) for per-tool integration toolkits
- Staged state pattern in `ToolSelector.tsx`: changes are accumulated in `stagedToolkits` and committed only on explicit Save
- `hasInitialized.current` ref guard in `ToolForm` prevents re-running the initialization effect across re-renders

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` directory was found in `codemie-ui`. Conventions derived from code exploration.

### Architectural Decisions

No ADRs or recorded decisions found for this domain.

### Derived Conventions

- Two-level settings architecture (`toolkit.settings` vs `tool.settings`) is controlled by the `settings_config` boolean on the tool definition; all utility functions branch on this flag
- The staged-state pattern for popups (copy → mutate → commit) is used in `ToolSelector.tsx`; the bug occurs in the mutate step
- `normalizeToolkitSettingsForToolForm` acts as a normalization layer between stored state and form display state; it is only called on initial load, not during user interactions

---

## 4. Testing Landscape

### Existing Coverage

- `src/hooks/__tests__/useToolkitSelection.test.ts` — covers all functions exported by the hook

**`toggleSingleTool` test cases (lines 96–144):**
- Deselects all toolkits when the tool is already selected (line 97)
- Selects only the single tool when the tool is not yet selected (line 111)
- Replaces the previous toolkit selection when a different tool is selected (line 127)

**`updateToolkitSetting` test cases (lines 271–315):**
- Updates settings of an existing toolkit (line 272)
- Sets settings to undefined when null is passed (line 288)
- Does not call onToolkitsChange when toolkit does not exist (line 303)

**`toggleMultiTool` test cases (lines 146–212):** comprehensive coverage of add, remove, new-toolkit, last-tool-removed scenarios

**`updateToolSetting` test cases (lines 317–369):** updates tool settings, null → undefined, no-op when toolkit missing

### Testing Framework and Patterns

- Vitest (TypeScript) with `renderHook` from `@testing-library/react`
- `makeToolkit` factory helper used in all test cases to construct `AssistantToolkit` objects — does not set `settings` in any test call
- `act()` wraps all state mutations

### Coverage Gaps

- **Critical gap**: `toggleSingleTool` is never called with a `selectedToolkits` entry that has a non-null `settings` value. The bug (settings being wiped) is therefore not caught by any existing test.
- No test for the combined sequence: `updateToolkitSetting` → `toggleSingleTool` (select integration, then pick a tool)
- No test for `toggleSingleTool` when switching between tools within the same already-configured toolkit (the exact user flow in the bug report)
- No tests found in `src/pages/workflows/editor/configPanels/components/__tests__/` — the directory does not exist

---

## 5. Configuration and Environment

### Environment Variables

No environment variables specific to workflow tool selection or integration persistence were identified.

### Configuration Files

No feature-flag or deployment config files relevant to this bug were identified.

### Feature Flags and Deployment Concerns

None identified.

---

## 6. Risk Indicators

- **The bug is in a shared hook used by both Workflows and Assistants forms.** The fix to `toggleSingleTool` is safe for Assistants because Assistants never call `toggleSingleTool` (they always use `toggleMultiTool` via `singleToolSelection` defaulting to false). Confirmed by grep: `AssistantForm.tsx` renders `ToolsConfiguration` without the `singleToolSelection` prop.
- **No test covers the buggy code path.** The fix must be accompanied by a new test: `toggleSingleTool` with pre-existing `existingToolkit.settings` should preserve those settings in the output.
- **`settings_config=true` tools should be assessed during fix.** While the primary bug is at toolkit-level settings, developers should verify that `tool.settings` handling in `toggleSingleTool` is also correct. Current analysis indicates it is not an issue (a different tool has no prior settings to preserve), but a test for this variant would reduce ambiguity.
- **The deselect branch (`onToolkitsChange([])`)** clears both `toolkit.settings` and `tool.settings`. This is expected behavior (deselecting a tool should clear the toolkit), but should be documented in the test as intentional.
- **`ToolSelector.tsx` hardcodes `singleToolSelection={true}`** in two places (lines 217 and 245). This is the only consumer of `toggleSingleTool` in the codebase. Risk of regression is low since the toggle is not shared.
- **No component-level tests** for `ToolSelector`, `ToolForm`, or `ToolTab` — coverage of the full save/reopen lifecycle relies entirely on the hook unit tests, which currently miss the settings-preservation scenario.

---

## 7. Summary for Complexity Assessment

The bug is a single-line fix in `src/hooks/useToolkitSelection.ts`, `toggleSingleTool` else branch, line 68: change `settings: undefined` to `settings: existingToolkit?.settings`. This preserves the integration setting that was assigned by `updateToolkitSetting` prior to the tool selection click. The fix touches one line in one file.

The surrounding architecture is correctly implemented: `ToolSelector.tsx`'s staged state initializes correctly on popup open (copies `toolkit.settings` from props), `extractToolFromToolkits` reads `toolkit.settings?.alias` correctly for serialization, and `getToolkitsFromConfiguration` + `normalizeToolkitSettingsForToolForm` reconstruct the form state correctly on reopen. The entire data loss chain collapses to the single unconditional `settings: undefined` write in `toggleSingleTool`.

The affected area has a significant test gap: no existing test exercises `toggleSingleTool` with pre-configured settings. The fix requires one new test case for the "existing toolkit with settings + toggle tool" scenario. Assistants are confirmed unaffected — they route through `toggleMultiTool` which correctly spreads `...tk` (preserving `tk.settings`). Overall complexity is low: one-line code fix, one new test case, no schema or API changes, no migration or deployment concerns.
