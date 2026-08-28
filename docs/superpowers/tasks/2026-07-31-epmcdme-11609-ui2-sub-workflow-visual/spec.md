# EPMCDME-11609-UI-2: Sub-workflow Node Visual Component and Config Panel

## Context

Story 1 laid the type-wiring foundation: `NodeTypes.SUB_WORKFLOW`, `SubWorkflowStateConfiguration`,
`inferNodeType` fix, serialization round-trip, `useSubWorkflowEnabled()`, and the node template in
the `HIDDEN` category. Story 2 makes the node user-visible: SVG icon, node card in the editor canvas,
config panel tab with workflow selector and input-mapping editor, and proper sidebar gating.

---

## Deliverables

Twelve changes, each building on the previous. The implementation order matters — lower tasks depend on
higher ones.

---

### D1 — SVG icon: `node-sub-workflow.svg`

**File:** `src/assets/icons/node-sub-workflow.svg`

32 × 32 viewBox, fill-based (no stroke), following the exact pattern of `node-tool.svg`:
- Path 1: rounded-rect background, color `#8B5CF6` (violet — distinct from all existing node icons).
- Path 2: white interior icon. Shape: two stacked right-pointing arrows ("nested flow"), constructed from fill-based polygon/path shapes, no stroke attributes.

SVG template structure:
```xml
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 0.5H24C28.1421 0.5 31.5 3.85786 31.5 8V24C31.5 28.1421 28.1421 31.5 24 31.5H8C3.85786 31.5 0.5 28.1421 0.5 24V8C0.5 3.85786 3.85786 0.5 8 0.5Z" fill="#8B5CF6"/>
  <!-- white interior: nested-arrows / sub-flow symbol, fill="white", no stroke -->
</svg>
```

---

### D2 — Promote SUB_WORKFLOW from HIDDEN to ACTION in `nodeTemplates`

**File:** `src/types/workflowEditor/base.ts`

Change the SUB_WORKFLOW entry in `nodeTemplates` (currently `category: NodeTemplateCategory.HIDDEN`):
- `category: NodeTemplateCategory.ACTION`
- `icon`: import `NodeSubWorkflowSvg from '@/assets/icons/node-sub-workflow.svg?react'` and set `icon: NodeSubWorkflowSvg`
- `label` stays `'Sub-Workflow'`

The template moves out of the hidden bucket; Sidebar gating (D3) controls visibility at render time.

---

### D3 — Sidebar feature-flag filtering

**File:** `src/pages/workflows/editor/Sidebar.tsx`

The module-level `actionNodes` array stays unchanged (no hook outside a component).
Inside the `Sidebar` component body, add runtime filtering:

```typescript
const isSubWorkflowEnabled = useSubWorkflowEnabled()
const visibleActionNodes = actionNodes.filter(
  (t) => t.type !== NodeTypes.SUB_WORKFLOW || isSubWorkflowEnabled
)
```

Replace the JSX `{actionNodes.map(...)}` loop with `{visibleActionNodes.map(...)}`.

Required imports: `useSubWorkflowEnabled` from `@/hooks/useFeatureFlags`, `NodeTypes` from
`@/types/workflowEditor/base` (already imported in the file via `NodeType`; add `NodeTypes` to the
named import).

---

### D4 — `SubWorkflowNode` ReactFlow card

**File:** `src/pages/workflows/editor/nodes/SubWorkflowNode.tsx`

Pattern: exact copy of `ToolNode.tsx`, replacing `NodeTypes.TOOL` with `NodeTypes.SUB_WORKFLOW`.

```typescript
export const SubWorkflowNode = ({ data, selected, id }: CommonNodeProps) => {
  const state = data.findState(id)
  const isConnected = state?._meta?.is_connected ?? false
  return (
    <BaseNode selected={selected} isConnected={isConnected} hasError={data.hasError}
      status={data.status} success={data.success} failures={data.failures} active={data.active}>
      <Handle type="target" position={Position.Left} status={data.status} />
      <NodeHeader type={NodeTypes.SUB_WORKFLOW} title={id} />
      <Handle type="source" position={Position.Right} status={data.status} />
    </BaseNode>
  )
}
```

Export type: named export (matches ToolNode pattern).

---

### D5 — Register `SubWorkflowNode` in the node-type component map

**File:** `src/pages/workflows/editor/nodes/index.tsx`

Add `[NodeTypes.SUB_WORKFLOW]: SubWorkflowNode` to the `nodeTypeComponents` object alongside the other
node registrations.

---

### D6 — `getSelectableWorkflows` store method

**File:** `src/store/workflows.ts`

Add to `WorkflowsStore` interface:
```typescript
getSelectableWorkflows: (params?: { search?: string; project?: string }) => Promise<Workflow[]>
```

Add implementation to `workflowsStore`:
```typescript
async getSelectableWorkflows({ search, project } = {}) {
  const filters = cleanObject({ search, project })
  const url = `v1/workflows/selectable?filters=${encodeURIComponent(JSON.stringify(filters))}`
  return api.get(url).then((res) => res.json()).then((res) => res.data ?? res)
},
```

---

### D7 — `WorkflowSelector` extended with `getOptions` prop

**File:** `src/pages/workflows/components/WorkflowSelector.tsx`

Add optional prop to `WorkflowSelectorProps`:
```typescript
getOptions?: (params: { search?: string; project?: string }) => Promise<Workflow[]>
```

In `fetchWorkflowOptions`, use `getOptions` if provided, else fall back to
`workflowsStore.getWorkflowOptions`:

```typescript
const fetchWorkflowOptions = async (search: string = '') => {
  try {
    const fetcher = getOptions ?? workflowsStore.getWorkflowOptions
    const workflows = await fetcher({ search, project })
    const formattedOptions: WorkflowSelectorOption[] = workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      iconUrl: workflow.icon_url ?? '',
    }))
    setOptions(formattedOptions)
  } catch (error) {
    console.error('Error fetching workflow options:', error)
    setOptions([])
  }
}
```

No other changes to WorkflowSelector; the existing `singleValue` prop, `onChange`, and `value` wiring
are unchanged.

---

### D8 — `InputMappingEditor` component

**File:** `src/pages/workflows/editor/configPanels/components/InputMappingEditor.tsx`

Key-value editor for `Record<string, string>`. No external dependencies beyond React.

Props:
```typescript
interface InputMappingEditorProps {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  disabled?: boolean
}
```

Internal state: `rows: { key: string; value: string }[]`. Initialized from `value` prop.
Rows-to-record conversion: `Object.fromEntries(rows.map(r => [r.key, r.value]))`.

Behavior:
- "Add row" button appends `{ key: '', value: '' }`.
- Each row has an editable `key` input, an editable `value` input, and a "Remove" button.
- On any key or value change, rebuild the `Record` and call `onChange`.
- When `disabled`, inputs and buttons are read-only.

Rendering: `<div className="flex flex-col gap-2">` with one `<div className="flex gap-2">` per row
(key input, value input, remove button) and an "Add mapping" button at the bottom.

---

### D9 — `subWorkflowFormSchema.ts`

**File:** `src/pages/workflows/editor/configPanels/subWorkflowFormSchema.ts`

```typescript
import * as Yup from 'yup'

export interface SubWorkflowFormValues {
  workflow_id: string | null | undefined
  input_mapping: Record<string, string> | null | undefined
}

export const subWorkflowFormSchema = Yup.object().shape({
  workflow_id: Yup.string().nullable().optional(),
  input_mapping: Yup.object().nullable().optional(),
})
```

---

### D10 — `SubWorkflowTab` config panel tab

**File:** `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx`

Module-level field registration (before component definition):
```typescript
registerFields(['workflow_id', 'input_mapping'], NodeTypes.SUB_WORKFLOW, 'resource_validation')
```

Props interface mirrors all other tabs:
```typescript
interface SubWorkflowTabProps {
  project: string
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete: () => void
  onDuplicate?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface SubWorkflowTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}
```

`forwardRef<SubWorkflowTabRef, SubWorkflowTabProps>` pattern.

**Form setup** using `react-hook-form` + `yupResolver(subWorkflowFormSchema)`:
- `defaultValues`: `{ workflow_id: state?.workflow_id ?? null, input_mapping: state?.input_mapping ?? {} }`
- Controller-driven `WorkflowSelector` (singleValue) and `InputMappingEditor`.

**`WorkflowSelector` wiring:**
```typescript
// Convert workflow_id string → WorkflowSelectorOption[] for the selector
const workflowSelectorValue: WorkflowSelectorOption[] = workflowIdValue
  ? [{ id: workflowIdValue, name: '' }]   // name resolved by selector internally
  : []

// On change: extract opts[0]?.id
onChange={(opts) => field.onChange(opts[0]?.id ?? null)}
```

Pass `getOptions={workflowsStore.getSelectableWorkflows}` so the selector hits `/v1/workflows/selectable`.

**`InputMappingEditor` wiring:**
```typescript
<InputMappingEditor
  value={field.value ?? {}}
  onChange={field.onChange}
  disabled={isSubmitting}
/>
```

**`saveData`** flow (same structure as ToolTab):
1. Clear `validationError` if present.
2. Validate `commonStateFieldsRef.current`.
3. Trigger form validation.
4. Build `updatedStateConfig: SubWorkflowStateConfiguration`:
   - Spread `buildCommonStateConfig(commonValues, state)`
   - `workflow_id: formValues.workflow_id ?? ''`
   - `input_mapping: formValues.input_mapping ?? {}`
5. Call `onConfigChange({ state: { id: stateId, data: updatedStateConfig } })`.
   - Note: SUB_WORKFLOW has no actor-level config (no `actors` key in the update) — the workflow
     reference lives entirely on the state itself.
6. Reset refs and form; return `true`.

**`useImperativeHandle`** exposes `isDirty` and `save`.

**JSX structure:**
```tsx
<>
  <form onSubmit={handleSave} className="flex flex-col gap-4">
    <ValidationError message={validationError} />
    <ConfigAccordion title="Sub-Workflow Configuration" defaultExpanded={true}>
      {/* WorkflowSelector for workflow_id */}
      {/* InputMappingEditor for input_mapping */}
    </ConfigAccordion>
    <CommonStateFields ref={commonStateFieldsRef} state={state} />
  </form>
  <TabFooter onCancel={...} onSave={handleSave} onDelete={onDelete} onDuplicate={onDuplicate} />
</>
```

---

### D11 — Register `SubWorkflowTab` in `ConfigPanel.tsx`

**File:** `src/pages/workflows/editor/ConfigPanel.tsx`

Two changes:
1. Import: `import SubWorkflowTab, { SubWorkflowTabRef } from './configPanels/SubWorkflowTab'`
   (direct import, not barrel, matching the pattern of ToolTab, AssistantTab, etc.)

2. Add to `nodeConfigPanels`:
   ```typescript
   [NodeTypes.SUB_WORKFLOW]: SubWorkflowTab,
   ```

3. Add `NodeTypes.SUB_WORKFLOW` to the `max-w-96 w-96` CSS condition (line ~547):
   ```typescript
   [NodeTypes.ASSISTANT, NodeTypes.CUSTOM, NodeTypes.TOOL, NodeTypes.TRANSFORM, NodeTypes.SUB_WORKFLOW].includes(
     selectedNode.type as any
   )
   ```

---

### D12 — Wire SVG icon into `WorkflowStateIcon`

**File:** `src/pages/workflows/details/WorkflowStateIcon.tsx`

Add import:
```typescript
import NodeSubWorkflowSvg from '@/assets/icons/node-sub-workflow.svg?react'
```

Add entry to `nodeIconsMap`:
```typescript
[NodeTypes.SUB_WORKFLOW]: NodeSubWorkflowSvg,
```

---

## Data flow

```
Canvas drag → Sidebar (gated by useSubWorkflowEnabled) → createState(SUB_WORKFLOW)
           → SubWorkflowNode card rendered (BaseNode + NodeHeader + Handles)

Config panel click → ConfigPanel dispatches SubWorkflowTab
                  → WorkflowSelector (hits /v1/workflows/selectable)
                  → InputMappingEditor (key-value pairs for input_mapping)
                  → save() → onConfigChange({ state: { workflow_id, input_mapping } })
                  → serialize → YAML with workflow_id + input_mapping

Execution drawer → WorkflowStateIcon maps SUB_WORKFLOW → NodeSubWorkflowSvg
```

---

## What this story does NOT cover

- Backend implementation of `/v1/workflows/selectable` — spec assumes endpoint exists.
- Input mapping validation against the sub-workflow's declared inputs — future story.
- `NODE_TYPE_TO_CONFIG_ARRAY` entry for sub_workflow (deferred from Story 1, still low-impact while
  the feature is behind a flag).
- E2E or integration tests — unit coverage is sufficient at this stage.

---

## Unit test coverage required

| Component | Test | What to verify |
|---|---|---|
| `SubWorkflowNode` | renders with connected/disconnected state | BaseNode receives correct `isConnected` |
| `InputMappingEditor` | add/remove/edit rows, onChange called with correct Record | state sync |
| `SubWorkflowTab` | `isDirty` reflects field changes; `save()` calls `onConfigChange` with correct shape | forwardRef contract |
| `Sidebar` | SUB_WORKFLOW node hidden when flag off, visible when flag on | feature flag gate |

Tests live alongside source files in `__tests__/` directories following project convention.
