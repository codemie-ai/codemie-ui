# Technical Research

**Task**: workflow editor sub-workflow node drag-drop unsaved-changes modal
**Generated**: 2026-09-01T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix the bug where dragging and dropping a Sub-Workflow node into the workflow visual editor immediately displays the 'Unsaved Changes' popup. The popup should only appear when the user attempts to navigate away, close the editor, or otherwise abandon unsaved changes — not immediately after dropping a node. The issue is in the workflow visual editor. Sub-Workflow node drag-and-drop triggers the popup immediately after the node is placed on the canvas. The node configuration panel opens showing 'Workflow is required' validation, but this validation state should NOT trigger the Unsaved Changes popup. Acceptance criteria: popup not shown immediately after drop; node added successfully; workflow marked as modified; popup shown only on navigation/close; no regression in other workflow editing actions.

---

## 2. Codebase Findings

### Existing Implementations

**Drag-and-drop node creation pipeline:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/Sidebar.tsx` — left-panel node palette; fires `handleDragStart`/`handleDragEnd` callbacks
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/SidebarNode.tsx` — individual draggable button, fires `onPointerDown`
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useReactFlowDnD.tsx` — `DnDProvider`, `useDnD`, `useDnDPosition`; pointer-capture DnD implementation; on `pointerup` resolves drop position and calls the `dropAction` callback
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/DragGhost.tsx` — floating ghost element rendered during drag

**The actual bug flow — key files:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/WorkflowEditor.tsx` — `handleCreateState` at line 315–317 calls `executeWithUnsavedCheck(() => editor.createState(type, position))`
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/WorkflowEditor.tsx` — `executeWithUnsavedCheck` at line 278–286 checks `configPanelRef.current?.isDirty()` before allowing any action; if dirty it shows the dialog instead
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/ConfigPanel.tsx` — `isDirty()` at line 316 delegates to `activeTabRef.current?.isDirty?.() ?? false`
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx` — `isDirty()` at line 122–124 returns `commonFieldsDirty || isFormDirty` where `isFormDirty` is react-hook-form's `formState.isDirty`

**State creation:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/utils/workflowEditor/actions/states/createState.ts` — for `NodeTypes.SUB_WORKFLOW` creates a state with `workflow_id: ''` (empty string, line 189)
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useWorkflowEditor.ts` — `createState` at line 126–133 calls `manager.createState` then `trackChange()`

**Sub-workflow config panel:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx` — the config form; initializes `workflow_id` from `state?.workflow_id ?? null`; has no `useEffect` to reset the form when `state` changes
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/configPanels/subWorkflowFormSchema.ts` — Yup schema: `workflow_id` is `string().nullable().required('Workflow is required')`
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/configPanels/CommonStateFields.tsx` — common name/description fields; has its own `isDirty()` exposed via ref

**Unsaved changes modal (in-editor):**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/configPanels/UnsavedChangesConfirmation.tsx` — rendered inside `ConfigPanel`; shown when `showUnsavedChangesConfirmation` state is `true`
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/ConfigPanel.tsx` — `showUnsavedChangesDialog()` at line 317 sets `showUnsavedChangesConfirmation(true)`; triggered by `executeWithUnsavedCheck` in `WorkflowEditor`

**Unsaved changes popup (app-level navigation blocker):**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/appLevel/UnsavedChangesPopup.tsx` — uses `useBlocker` from react-router; shown when `checkHasUnsavedChanges()` returns true AND a route change is attempted
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useUnsavedChangesWarning.tsx` — `UnsavedChangesProvider`, `useUnsavedChanges` hook; `checkHasUnsavedChanges()` iterates all registered `checkDirty` functions

**Global dirty-check registrations:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/components/WorkflowForm.tsx` — registers `FormIDs.WORKFLOW_FORM` with `comparator: compareWorkflowData`
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/ConfigPanel.tsx` — registers `FormIDs.WORKFLOW_CONFIG_PANEL` at line 163–174; its `comparator` is `(_initial, current) => current?.isDirty ?? false` — meaning it reports dirty whenever `activeTabRef.current?.isDirty()` returns true

### Architecture and Layers Affected

- **UI / Presentation layer**: `SubWorkflowTab`, `ConfigPanel`, `UnsavedChangesConfirmation`, `UnsavedChangesPopup`
- **Editor orchestration layer**: `WorkflowEditor` (the `executeWithUnsavedCheck` logic)
- **State / hook layer**: `useWorkflowEditor`, `useUnsavedChangesWarning`, `useReactFlowDnD`
- **Business logic / actions layer**: `createState.ts` (the shape of a freshly-created sub-workflow state)

### Integration Points

- `ConfigPanel` is tightly coupled to `WorkflowEditor` via `configPanelRef` (imperative ref). `WorkflowEditor` calls `configPanelRef.current?.isDirty()` synchronously before every mutating action.
- `ConfigPanel` registers itself with `UnsavedChangesContext` (app-level), meaning a dirty config panel also blocks router navigation.
- `SubWorkflowTab` is the `activeTabRef` target when a sub-workflow node is selected. Its `isDirty()` is what both systems read.
- react-hook-form's `formState.isDirty` is the dirtiness source; it compares `defaultValues` to current field values.

### Patterns and Conventions

- Every mutating editor action is wrapped in `executeWithUnsavedCheck`, which guards against data loss by checking the active config panel tab for unsaved changes before proceeding.
- Node config tabs expose a uniform `ConfigTab` interface (via `useImperativeHandle`): `{ isDirty: () => boolean, save: () => Promise<boolean> }`.
- New node states are initialized with empty/default field values (e.g., `workflow_id: ''`).
- The config panel tab is mounted with `key={selectedNode.id}`, so a fresh tab mount occurs each time a different node is selected.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/architecture/architecture.md` — system design
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/patterns/state-management.md` — Valtio stores, hooks, forms
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/components/component-patterns.md` — component construction
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/testing/testing-patterns.md` — test patterns

### Architectural Decisions

- `executeWithUnsavedCheck` is a deliberate guard pattern applied uniformly to every mutating editor action to prevent accidental data loss. The bug is that `handleCreateState` is also wrapped in this guard, making it check for dirty state on a tab that the user has never interacted with.
- The `ConfigPanel.useUnsavedChanges` registration uses a `comparator` that ignores `initialValues` and purely proxies `activeTabRef.current?.isDirty()` — this means it can be influenced by transient form mount state.

### Derived Conventions

- Other node types (AssistantTab, IteratorTab, ToolTab) have `workflow_id`-equivalent fields initialized to empty strings or nulls, and they all exhibit the same potential — but in practice they don't trigger the popup because either their `defaultValues` match what the store returns, or the `isDirty` lifecycle resolves on mount without react-hook-form flagging a change.
- The `key={selectedNode.id}` pattern on NodePanel means the tab is freshly mounted when the node is created and auto-selected, so `isFormDirty` starts at `false`. The bug must be caused by something that makes `isFormDirty` become `true` after mount but before the user acts — or by another path that triggers `executeWithUnsavedCheck` after mount.

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx` — covers: renders WorkflowSelector, `save()` produces correct shape, `isDirty()` returns `false` when clean
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` — covers: `isDirty()` for general config and YAML tabs; `showUnsavedChangesDialog()` shows dialog; `save()` flushes generalConfigTab; SubWorkflow is mocked with a permanently-clean ref (`isDirty: () => false`)
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/__tests__/Sidebar.test.tsx` — sidebar rendering
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx` — canvas node rendering
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` — page-level integration; covers AI Refine/Revert flow only

### Testing Framework and Patterns

- Vitest with React Testing Library (`unit` and `integration` projects via `vitest.workspace.ts`)
- Fixtures: MSW for API mocking, `vi.fn()` for callbacks
- Mocking pattern for config tabs: `vi.mock` the entire tab module and provide a ref object with `{ isDirty: () => false, save: vi.fn() }`
- Integration tests render the full page with `MemoryRouter` and `UnsavedChangesProvider`

### Coverage Gaps

1. `SubWorkflowTab.isDirty()` returning `true` is untested — only `false` is verified
2. `ConfigPanel` with a SubWorkflow node selected and a dirty form is untested (mock always returns clean)
3. The drag-and-drop node creation flow followed immediately by `executeWithUnsavedCheck` is not integration-tested
4. The interaction between `UnsavedChangesConfirmation` showing and `pendingAction` execution after node creation has no test
5. `EditWorkflowPage.integration.test.tsx` has no sub-workflow or unsaved-changes coverage

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_SUB_WORKFLOW_ENABLED` or equivalent feature flag — `Sidebar.tsx` calls `useSubWorkflowEnabled()` to conditionally show the Sub-Workflow node template; the exact env var name should be read from that hook's implementation

### Configuration Files

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/utils/workflowEditor/constants.ts` line 124: `sub_workflow: 'workflow_id'` — maps node type to its primary resource field for validation purposes

### Feature Flags and Deployment Concerns

- The Sub-Workflow node is feature-flagged behind `useSubWorkflowEnabled()`. The fix applies only when this flag is enabled; no deployment configuration change is required.

---

## 6. Risk Indicators

- **Root cause is in `WorkflowEditor.handleCreateState`**: it calls `executeWithUnsavedCheck` which checks `configPanelRef.current?.isDirty()` before executing. At the moment `handleCreateState` is called, there is already a previously-selected node's `SubWorkflowTab` mounted as the active tab — and that tab's `isFormDirty` is `true` because its `workflow_id` field was never saved. The new node creation fires `executeWithUnsavedCheck`, finds the old tab dirty, and shows the dialog instead of creating the node. This is the same mechanism that correctly blocks undo/beautify/selection-change, but it should not block the creation of a new node when the previously-open panel belongs to a different node or when the dirty state is from a freshly-dropped node's own empty form.

- **Secondary scenario**: if the user dropped a Sub-Workflow node, the new tab mounts with `defaultValues: { workflow_id: null }`, the state has `workflow_id: ''`, and react-hook-form with `mode: 'onChange'` compares `null` (defaultValue) against `''` (current state's value) — these are not equal, so `isFormDirty` becomes `true` immediately after mount. This would make the very next `executeWithUnsavedCheck` call (e.g., a ReactFlow node-position change event) trigger the dialog.

- **`ConfigPanel.useUnsavedChanges` comparator ignores `initialValues`** — the `comparator` at line 169–173 always returns `current?.isDirty ?? false` regardless of what `initialValues` was. This means the app-level navigation blocker (`UnsavedChangesPopup`) is also active whenever a config tab reports dirty, not just when something genuinely changed relative to a saved baseline.

- **`null` vs `''` mismatch in `SubWorkflowTab` defaultValues**: `createState.ts` initializes `workflow_id: ''`, but `SubWorkflowTab` initializes `defaultValues: { workflow_id: state?.workflow_id ?? null }`. When `state.workflow_id` is `''`, the defaultValue is `''` (falsy, so `null` from the `??` operator), not `''`. So `defaultValues.workflow_id = null` but `getValues().workflow_id = ''` (or whatever the controlled input binds). React-hook-form sees them as different → `isFormDirty = true` immediately on mount.

- **No test for the `null` vs `''` mismatch path** — the exact mount-time dirty condition is not exercised by `SubWorkflowTab.test.tsx`.

- **`handleCreateState` wrapping in `executeWithUnsavedCheck` is the architectural question**: the guard exists to protect unsaved changes on the currently-open panel before replacing it. It should block node-creation if there IS an unsaved panel open. The bug report says the popup appears "immediately after dropping" — this means either (a) there was already a dirty sub-workflow panel open when the user dropped the second node, or (b) the new node's own tab mounts dirty. Both paths lead here.

- **Fix must not regress the guard for other node types**: `executeWithUnsavedCheck` correctly protects AssistantTab, ToolTab, IteratorTab, etc. Any fix that bypasses the check for sub-workflow creation would also need to be verified against those types.

---

## 7. Summary for Complexity Assessment

The bug resides at the intersection of three systems: the `executeWithUnsavedCheck` guard in `WorkflowEditor`, react-hook-form's `isDirty` tracking in `SubWorkflowTab`, and the `ConfigPanel.useUnsavedChanges` registration. There are two distinct root causes that can produce the symptom. The first is a `null` vs `''` defaultValue mismatch: `createState.ts` stores `workflow_id: ''`, but `SubWorkflowTab` initializes `defaultValues: { workflow_id: state?.workflow_id ?? null }` — when `workflow_id` is `''` (falsy), the `?? null` coercion gives `null`, making react-hook-form see an immediate divergence from the stored value and flag `isFormDirty = true` on mount. The second cause is that `handleCreateState` itself is wrapped in `executeWithUnsavedCheck`, so if a previously-opened sub-workflow node had a dirty (unsaved) tab, dropping another node triggers the guard. Both causes require targeted, narrow fixes that touch at most 2–3 files.

The affected layers are: UI/presentation (`SubWorkflowTab.tsx` — defaultValues initialization), editor orchestration (`WorkflowEditor.tsx` — possible guard exemption for fresh node creation), and potentially the actions layer (`createState.ts` — ensuring `workflow_id` is initialized consistently with what the form expects). The file change surface is small: 1–3 source files plus corresponding test additions. The primary fix candidate is correcting the `null`/`''` mismatch in `SubWorkflowTab`'s `defaultValues` so the form is not dirty on mount.

Test coverage for the affected area is weak: `SubWorkflowTab.test.tsx` only tests `isDirty() === false`; there is no integration test covering the drag-drop → unsaved-changes interaction. The fix should add a test asserting `isDirty()` returns `false` when the tab is freshly mounted with a new (empty) sub-workflow state, and a test verifying `executeWithUnsavedCheck` does not show the dialog immediately after a node drop. Key risk: the fix must not weaken the guard for legitimate dirty-state protection on other node types or on an already-opened sub-workflow tab.
