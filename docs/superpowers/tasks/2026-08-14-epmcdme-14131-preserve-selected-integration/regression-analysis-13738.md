# EPMCDME-14131 — regression causation analysis against EPMCDME-13738

Read-only investigation. No code was changed.

Repos and revisions inspected:

- Frontend `codemie-ui`, squash commit `50e8b9325` ("EPMCDME-13738: Per-workflow scope for personal integration settings", 2026-08-13) and the current `origin/main` (`2ae3d88c2`).
- Backend `codemie`, squash commit `559c3e0a6` (same story).

All line numbers below refer to the code as it stands on `origin/main` unless stated otherwise.

## Verdict

**Related — EPMCDME-13738 is the direct cause of EPMCDME-14131. Confidence: high.**

The story replaced the way the "Automatic Credentials Lookup" toggle decides its state. Before the
story the toggle was derived from data that the workflow editor actually persists (does the slot
carry an integration?); after the story it is derived exclusively from a new field,
`auto_credentials_lookup`, which **the workflow configuration has no place to store**. Workflow tool
slots are serialized into the workflow YAML as `{ tool, integration_alias }` only
(`src/types/workflowEditor/configuration.ts:27-30, 48-58`), and rebuilt from that YAML by
`getToolkitsFromConfiguration` (`src/utils/workflows.ts:29-139`), which never produces the flag.
Since the new derivation treats an absent flag as "enabled"
(`Toolkit.tsx:115-116` and `Toolkit.tsx:118-123`: `auto_credentials_lookup !== false`), every
re-initialised workflow tool slot comes back with the toggle ON, and
`IntegrationSelectDropdown.tsx:78` (`if (isAutoMode) return null`, added by the same story) then
hides the dropdown that would have shown the integration the author picked. The user sees exactly
what the bug describes: "Automatic lookup is selected instead of the integration the user picked".

The same mechanism also mis-renders **pre-existing assistants**: the backend defaults the new field
to `True` (`codemie/src/codemie/rest_api/models/assistant.py:155` and `:167`), so any assistant
saved before 2026-08-13 with a pinned integration now displays as "Automatic Credentials Lookup ON"
with the pinned integration hidden. Runtime behaviour is not affected in that case (the backend lets
an author-pinned integration win — `toolkit_service.py:_tool_reporting_the_missing_integration`), so
this is a display/round-trip defect rather than a credentials-resolution defect — except for the
data-loss path described in H4.

Nothing after `50e8b9325` on `main` has touched this logic (no follow-up fix exists), and the
earlier integration-scoping stories (EPMCDME-13393, EPMCDME-13337) touched only the consumer-side
"Your Integration Settings" selector and MCP dropdowns, never the author-side toolkit toggle.

## Before vs After semantics of one tool integration slot

### The three things involved

| Thing | Where it lives | Persisted? |
|---|---|---|
| `tool.settings` / `toolkit.settings` (a `Setting` object with `id` and `alias`) | in-memory `AssistantToolkit[]` in the form | assistants: yes (`settings` on `ToolKitDetails`/`ToolDetails`); workflows: yes, but only as `integration_alias` in the YAML |
| `auto_credentials_lookup` (new in 13738) | `src/types/entity/assistant.ts:224, 233` | assistants: yes (sent by `src/store/utils/assistants.ts:50, 57`, stored by backend, default `True`); **workflows: nowhere** |
| Rendered state of the `AutoCredentialsSwitch` and of `IntegrationSelectDropdown` | `Toolkit.tsx` | derived |

### BEFORE (`50e8b9325^`)

`Toolkit.tsx` kept the toggle in local component state, seeded from the persisted integration:

```ts
const [toolAutoModes, setToolAutoModes] = useState<Record<string, boolean>>(() =>
  Object.fromEntries(
    toolkit.tools.map((tool) => [
      tool.name,
      !selectedToolkit?.tools.find((t) => t.name === tool.name)?.settings,
    ])
  )
)
...
const isAutoMode = toolAutoModes[tool.name] ?? !toolValue
```

- Slot with an integration → `isAutoMode === false` → switch OFF, dropdown visible showing the alias.
- Slot without one → `isAutoMode === true` → switch ON.
- "auto lookup on" and "nothing pinned" were the same state — that ambiguity is exactly what the
  story set out to remove.
- `IntegrationSelectDropdown` checked the empty-options branch *before* the auto-mode branch, so
  `isAutoMode` hid only the `Select`, never a whole branch of UI.

Round-trip through the workflow editor was lossless for display purposes, because the only thing the
display depended on (`settings`, reconstructed from `integration_alias`) is the only thing the YAML
stores.

### AFTER (`50e8b9325` … `origin/main`)

- `Toolkit.tsx:115-116`
  `const toolkitAutoMode = (selectedToolkit as {...})?.auto_credentials_lookup !== false`
- `Toolkit.tsx:118-123`
  `isToolAutoMode(name) = (selectedToolkit?.tools.find(...))?.auto_credentials_lookup !== false`
- `Toolkit.tsx:198` `const isAutoMode = isToolAutoMode(tool.name)` — `tool.settings` is no longer
  consulted at all.
- `Toolkit.tsx:217-222` the switch is now rendered unconditionally for a selected configurable tool
  (the old `hasToolOptions` gate is gone).
- `Toolkit.tsx:223-235` / `IntegrationSelectDropdown.tsx:78` — when `isAutoMode` is true the whole
  dropdown returns `null`, so the pinned integration becomes invisible, not merely unselected.
- Writes: `useToolkitSelection.updateToolAutoLookup` / `updateToolkitAutoLookup`
  (`src/hooks/useToolkitSelection.ts:160-202`) are the *only* writers of the flag, and enabling it
  also wipes `settings` in the same update.
- `useToolkitSelection.updateToolSetting` (`:141-153`) — the function called when the user picks an
  integration — writes `settings` only; it never records `auto_credentials_lookup: false`.

Sentinel values, concretely:

| State | `settings` | `auto_credentials_lookup` | Rendered |
|---|---|---|---|
| 1. Author pinned an integration | `Setting` | `false` (only if the author flipped the switch in this session) | switch OFF + dropdown with the alias |
| 1'. Author pinned an integration, flag missing (workflow reload, legacy assistant) | `Setting` | `undefined` / `true` | **switch ON, dropdown hidden — the bug** |
| 2. Auto lookup on | `undefined` | `true` / absent | switch ON |
| 3. Lookup off, nothing pinned ("No integration") | `undefined` | `false` | switch OFF + empty dropdown |

Row 1' is a state the story's model does not admit but the persistence layer produces on every
reload.

### What survives a workflow round-trip

1. Author picks an integration in the tool popup → `updateToolSetting` → `toolkits[0].tools[0].settings = Setting`.
2. Popup "Save" → `ToolSelector.handleSubmitToolPopup` (`ToolSelector.tsx:100-103`) → form value `toolkits`.
3. Tool panel save → `ToolTab.extractToolFromToolkits` (`ToolTab.tsx:66-78`) →
   `extractToolkitSettings` (`src/utils/toolkit.ts:19-38`) → `{ tool, integration_alias }` into the
   workflow YAML. **`auto_credentials_lookup` is dropped here — there is no field for it.**
4. Reopen the tool panel (or reload the workflow) → `ToolForm` init effect
   (`ToolForm.tsx:305-343`) → `getToolkitsFromConfiguration` + `normalizeToolkitSettingsForToolForm`
   → toolkits with `settings` restored from the alias and **no `auto_credentials_lookup`**.
5. `Toolkit.tsx:198` computes `undefined !== false` → `true` → auto lookup shown as selected, the
   restored integration hidden behind `IntegrationSelectDropdown.tsx:78`.

## Hypotheses

### H1 — The auto-lookup flag has no persistence channel in the workflow config, and the UI now derives the toggle exclusively from it — **CONFIRMED**

Failing path (matches the bug's repro exactly):

- `src/types/workflowEditor/configuration.ts:27-30` (`AssistantTool`) and `:48-58`
  (`ToolConfiguration`) — the only integration-related field is `integration_alias?: string`.
- `src/utils/workflows.ts:99-138` — `getToolkitsFromConfiguration` builds toolkits by spreading the
  **catalog** toolkit (`...availableToolkit`, `:134`) and copying catalog tools (`:111`), then
  attaching `settings` resolved from the alias (`:120-122`, `:136`). No `auto_credentials_lookup` is
  ever set. The catalog endpoint itself (`GET v1/assistants/tools`, `src/store/assistants.ts:464-469`)
  is typed `list[ToolKit]` on the backend — the base model, without the new field — so the value is
  `undefined` even before the alias is applied.
- `src/pages/workflows/editor/configPanels/components/ToolForm.tsx:305-343` — the init effect that
  runs whenever the tool panel mounts (guarded by `hasInitialized`, reset on `toolConfig?.id` change
  at `:295-299`).
- `src/pages/workflows/editor/configPanels/components/ToolSelector.tsx:82-85` — `handleOpenToolPopup`
  re-seeds `stagedToolkits` from the form's `toolkits`, which came from step 2 above.
- `src/pages/assistants/components/AssistantForm/components/Toolkits/Toolkit.tsx:118-123, 198` —
  `isAutoMode` is `true` for any tool without an explicit `false`.
- `src/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelectDropdown.tsx:78`
  — `if (isAutoMode) return null` hides the selection.

The same holds for the workflow's virtual-assistant node
(`src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx:254-270`, which calls
the same `getToolkitsFromConfiguration`), so the defect covers both workflow tool nodes and inline
assistant nodes.

Note this is a *display and round-trip* defect: the alias itself still reaches the YAML
(`ToolTab.tsx:66-78` ignores the flag), so a workflow saved and never re-touched still runs with the
author's integration. What the user sees, however, is "Automatic lookup".

### H2 — The write path for "user picked an integration" never records the decision — **CONFIRMED**

`src/hooks/useToolkitSelection.ts:141-153`:

```ts
const updateToolSetting = useCallback(
  (toolkit, tool, settings) => {
    ...
    const updatedTools = existingToolkit.tools.map((t) =>
      t.name === tool.name ? { ...t, settings: settings || undefined } : t
    )
```

Picking an integration sets `settings` and nothing else. Symmetrically, `updateToolkitSetting`
(`:126-139`) writes only `settings`. So the only way the flag ever becomes `false` is the user
flipping the switch (`Toolkit.tsx:125-131`, `:282`). Combined with the backend default
`auto_credentials_lookup: bool = True` (`codemie/src/codemie/rest_api/models/assistant.py:155, 167`),
"a slot carries an integration" and "auto lookup is on" are allowed to coexist in stored data, and
the new UI resolves that contradiction in favour of auto lookup. A one-line pairing
(`updateToolSetting` also setting `auto_credentials_lookup: false`) would have made state 1'
unrepresentable — it is absent.

### H3 — Pre-existing records migrate into the wrong state — **CONFIRMED (and asserted by the story's own test)**

`src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/ToolkitAutoLookup.test.tsx:57-66`:

```
it('shows the toggle on when the flag is absent (assistants created before the field)', ...)
  expect(screen.getByRole('switch')).toBeChecked()
```

The fixture in that test has **no** `settings`, so the assertion looks harmless. The story never
added the counterpart case "flag absent **and** an integration pinned", which is the state every
legacy assistant and every workflow is in. Backend-side there is no data migration adding
`auto_credentials_lookup: false` to slots that already carry `settings`
(the story's migration `..._add_workflow_scope_to_assistant_user_mapping.py` only touches the
user-mapping collection), and pydantic fills the missing key with `True` on read.

### H4 — Toggling the (wrongly ON) switch off and on again silently drops the integration — **PLAUSIBLE, and the only data-loss path**

`src/hooks/useToolkitSelection.ts:191-192` (and `:169-170` for toolkits):

```ts
auto_credentials_lookup: enabled,
...(enabled ? { settings: undefined } : {}),
```

A user who reopens a workflow tool, sees auto lookup ON, switches it OFF (the integration reappears,
because switching off does not clear `settings`), then changes their mind and switches it back ON,
loses the pinned integration; the subsequent save writes the tool without `integration_alias`. Not
required to reproduce the reported symptom, but it turns the display bug into real data loss and
should be covered by the fix. Marked plausible rather than confirmed because it depends on a user
interaction sequence I could not execute here.

### H5 — An empty-string/undefined value colliding with an auto-lookup sentinel — **REFUTED for this bug**

The author-side dropdown has no sentinel option: `IntegrationSelectDropdown.tsx:101` matches
`settingsDefinitions.find((o) => o.id === value?.id)?.id` and renders a placeholder otherwise. The
`__none__` sentinel introduced by the story lives only in the **consumer** panel
(`src/pages/assistants/components/AssistantDetails/components/UserMapping/components/IntegrationSelector.tsx:33, 82-97`),
whose wording is "No integration" / "Default integration" — not "Automatic Credentials Lookup". That
screen is "Your Integration Settings", not the workflow tool configuration in the repro.

### H6 — The payload builder omits the integration when the auto flag is set — **REFUTED**

`ToolTab.extractToolFromToolkits` (`src/pages/workflows/editor/configPanels/ToolTab.tsx:66-78`) and
`extractToolkitSettings` (`src/utils/toolkit.ts:19-38`) read only `settings.alias`; neither consults
`auto_credentials_lookup`. For assistants, `transformAssistantToCreateDTO`
(`src/store/utils/assistants.ts:45-58`) sends `settings` and the flag side by side. Nothing strips a
pinned integration because the flag is true — except via H4.

### H7 — State reset on refetch / re-render inside an open form — **REFUTED**

The settings-sync effect in `ToolsConfiguration.tsx:154-181` rebuilds toolkits with
`{ ...toolkit, settings, tools: ... }` and `{ ...tool, settings }`, preserving unknown keys including
`auto_credentials_lookup`. Within one mounted `ToolForm`, reopening the tool popup also preserves it
(`ToolSelector.tsx:82-85, 100-103`). The loss happens only at (re)initialisation from the workflow
config — which is what "close the tool configuration and reopen" does.

### H8 — Toolkit-level (as opposed to tool-level) slots have the same defect — **CONFIRMED**

`Toolkit.tsx:269-284` passes `autoMode={toolkitAutoMode}` into `IntegrationSelector`, whose
`autoMode` prop now overrides the legacy derivation (`IntegrationSelector.tsx:65-77`:
`const isAutoMode = autoMode ?? derivedAutoMode`, and the effect returns early when `autoMode !== undefined`).
For a toolkit whose integration is stored as `toolsData[0].integrationAlias`
(`src/utils/workflows.ts:130-137`), the flag is likewise absent → auto mode → the pinned toolkit
integration is hidden by the same `IntegrationSelectDropdown.tsx:78`. Any fix must cover both
levels.

### H9 — The toggle is inert when `updateToolkitAutoLookup` is not supplied — **REFUTED as the cause**

`Toolkit.tsx:40-41` declares both callbacks optional and calls them with `?.`. If a caller omitted
them, the switch would do nothing at all (a different symptom). All live callers go through
`ToolsConfiguration.tsx:125-133, 187-215`, which always supplies them; `ExternalToolsSection` renders
external toolkits, whose integration UI is gated off by `!toolkit.is_external`.

## Other suspects ruled in / out

- **Follow-up fixes after `50e8b9325` — none.** `git log 50e8b9325..origin/main` over
  `src/pages/assistants/components/AssistantForm/components/Toolkits`, `src/hooks/useToolkitSelection.ts`,
  `src/utils/workflows.ts`, `src/utils/toolkit.ts`, `src/pages/workflows/editor/configPanels`
  returns five commits, none of which touch the auto-lookup logic
  (`766ddb2a9` a11y, `c98412cad` EPMCDME-10302, `7eebbfde9`, `4a1e44994`, `92af0c2c6`). The only
  post-story change inside `IntegrationSelectDropdown.tsx` is EPMCDME-10302 adding a `disabled`
  prop; it sits *after* `if (isAutoMode) return null` and does not alter the failing path.
- **EPMCDME-13393 (`228952c61`, `d8da26078`, `250a54c8a`, all on `main`) — ruled out.** Their file set
  is `UserMapping/*`, `InlineCredentialsContent`, `store/userSettings.ts`, `utils/assistants.tsx`.
  They never touched `AssistantForm/components/Toolkits`, `useToolkitSelection`, or the workflow tool
  panels, and the "Automatic Credentials Lookup" switch does not exist on the screens they changed.
- **EPMCDME-13337 (`1f79977c1` on `main`) — ruled out** for the same reason: per-user MCP credentials,
  MCP source selector, workflow user-context reset. MCP slots are explicitly excluded from the
  auto-lookup path (`src/utils/assistants.tsx:183-193`).
- **EPMCDME-11209 (`427bb13be`, `6e3119a90`) — origin of the switch, not the regression.** It
  introduced `AutoCredentialsSwitch` with the derive-from-`!value` semantics that worked correctly
  through a workflow round-trip; 13738 replaced that derivation.
- **Backend `559c3e0a6` — contributing, not sufficient.** Its relevant shape changes are
  `auto_credentials_lookup: bool = True` on `ToolDetails`/`ToolKitDetails`
  (`rest_api/models/assistant.py:155, 167`) and the relaxed `ToolConfig` validation
  (`core/models.py:518-528`, empty `integration_id` now allowed as an explicit "no integration").
  The `True` default is what makes legacy assistants display as auto; for workflows the frontend
  never had a field to send, so the frontend derivation alone is enough to produce the bug.

## What still needs manual reproduction

1. **The reported repro itself**, to confirm the visible symptom matches the traced path: create or
   edit a workflow → add a Tool node → pick e.g. a Jira tool → turn "Automatic Credentials Lookup"
   OFF → select a specific integration → save the tool config → close and reopen the tool node.
   Expected observation per this analysis: the switch is ON again and no dropdown is rendered.
2. **Whether the alias actually survives in the YAML** after that round-trip (switch to the YAML/code
   view of the workflow and check `tools[].integration_alias`). If it survives, the fix is
   display-only; if it does not, there is a second write path I did not find.
3. **H4 data loss**: reopen the tool, toggle the switch OFF then ON, save, and check whether
   `integration_alias` disappeared from the YAML.
4. **Legacy assistant display (H3)**: open an assistant created before 2026-08-13 that has a pinned
   toolkit or tool integration, and confirm the switch shows ON with the integration hidden. This
   decides whether the fix must be scoped to workflows only or to the shared `Toolkit` component
   (the latter is what the evidence suggests).
5. **Toolkit-level slot (H8)**: same as (1) but for a toolkit that carries one integration for all
   its tools, to confirm the right-hand `IntegrationSelector` behaves identically.
