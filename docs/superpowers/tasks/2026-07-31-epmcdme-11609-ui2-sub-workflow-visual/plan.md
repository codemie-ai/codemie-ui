# Sub-workflow Node Visual Component and Config Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sub-workflow node user-visible in the workflow editor: SVG icon, draggable sidebar card, canvas node, config panel tab with workflow selector and input-mapping editor.

**Architecture:** Build bottom-up — static assets first (SVG icon), then type/registration changes (nodeTemplates, nodes/index), then runtime gating (Sidebar), then data layer (store + WorkflowSelector), then UI components (InputMappingEditor, SubWorkflowTab), then integration (ConfigPanel). Each task ends with a passing unit test.

**Tech Stack:** React 18, Vite (SVG `?react` imports), ReactFlow (`@xyflow/react`), react-hook-form + yup, Valtio (store), Vitest + @testing-library/react, TypeScript.

## Global Constraints

- SVG icons: 32×32, `fill="none"` on root, no `stroke` attributes, fill-based paths only — match `node-tool.svg` exactly.
- All node components: named exports (not default), `CommonNodeProps` from `nodes/common`.
- Config panel tabs: `forwardRef<TabRef, TabProps>`, `useImperativeHandle` with `isDirty()` and `save(): Promise<boolean>`.
- `registerFields` call must be at **module level** (outside component) in tab files.
- WorkflowSelector changes: only add the `getOptions` prop — do not change any existing behavior.
- Feature flag hook `useSubWorkflowEnabled()` must be called **inside** the `Sidebar` component body — never at module level.
- Commit message format: `EPMCDME-11609: Capital sentence` (required for CI gate).
- Tests run with: `npm run test:unit -- --reporter=verbose <path>`

---

## File Map

| File | Action | Task |
|---|---|---|
| `src/assets/icons/node-sub-workflow.svg` | Create | T1 |
| `src/pages/workflows/details/WorkflowStateIcon.tsx` | Modify | T1 |
| `src/pages/workflows/details/__tests__/WorkflowStateIcon.test.tsx` | Create | T1 |
| `src/types/workflowEditor/base.ts` | Modify (SUB_WORKFLOW category + icon) | T2 |
| `src/pages/workflows/editor/nodes/SubWorkflowNode.tsx` | Create | T2 |
| `src/pages/workflows/editor/nodes/index.tsx` | Modify | T2 |
| `src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx` | Create | T2 |
| `src/pages/workflows/editor/Sidebar.tsx` | Modify | T3 |
| `src/pages/workflows/editor/__tests__/Sidebar.test.tsx` | Create | T3 |
| `src/store/workflows.ts` | Modify (add getSelectableWorkflows) | T4 |
| `src/pages/workflows/components/WorkflowSelector.tsx` | Modify (add getOptions prop) | T4 |
| `src/pages/workflows/components/__tests__/WorkflowSelector.test.tsx` | Create | T4 |
| `src/pages/workflows/editor/configPanels/components/InputMappingEditor.tsx` | Create | T5 |
| `src/pages/workflows/editor/configPanels/components/__tests__/InputMappingEditor.test.tsx` | Create | T5 |
| `src/pages/workflows/editor/configPanels/subWorkflowFormSchema.ts` | Create | T6 |
| `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx` | Create | T6 |
| `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx` | Create | T6 |
| `src/pages/workflows/editor/ConfigPanel.tsx` | Modify | T6 |

---

### Task 1: SVG icon and WorkflowStateIcon wiring

**Test-first: yes** — write a test that `WorkflowStateIcon` returns a non-null element for `NodeTypes.SUB_WORKFLOW`, then create the SVG and wire it.

**Files:**
- Create: `src/assets/icons/node-sub-workflow.svg`
- Modify: `src/pages/workflows/details/WorkflowStateIcon.tsx`
- Create: `src/pages/workflows/details/__tests__/WorkflowStateIcon.test.tsx`

**Interfaces:**
- Produces: `NodeSubWorkflowSvg` importable as `import NodeSubWorkflowSvg from '@/assets/icons/node-sub-workflow.svg?react'` — used in T2 (base.ts icon) and T1 (WorkflowStateIcon)

- [ ] **Step 1: Write the failing test**

Create `src/pages/workflows/details/__tests__/WorkflowStateIcon.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor'

import WorkflowStateIcon from '../WorkflowStateIcon'

describe('WorkflowStateIcon', () => {
  it('renders a non-null element for NodeTypes.SUB_WORKFLOW', () => {
    const { container } = render(
      <WorkflowStateIcon type={NodeTypes.SUB_WORKFLOW} className="w-6 h-6" />
    )
    // Should render the placeholder span (before SVG exists) or the SVG itself
    expect(container.firstChild).not.toBeNull()
  })

  it('renders placeholder span when type has no icon entry', () => {
    const { container } = render(
      <WorkflowStateIcon type={'unknown_type' as any} className="my-class" />
    )
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    expect(span).toHaveClass('my-class')
  })
})
```

- [ ] **Step 2: Run test to verify it passes for placeholder (SVG not yet created)**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/details/__tests__/WorkflowStateIcon.test.tsx
```

Expected: first test passes (span placeholder), second test passes.

- [ ] **Step 3: Create the SVG icon**

Create `src/assets/icons/node-sub-workflow.svg`:

```xml
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8 0.5H24C28.1421 0.5 31.5 3.85786 31.5 8V24C31.5 28.1421 28.1421 31.5 24 31.5H8C3.85786 31.5 0.5 28.1421 0.5 24V8C0.5 3.85786 3.85786 0.5 8 0.5Z" fill="#8B5CF6"/>
<path d="M9 13L14 16L9 19V13Z" fill="white"/>
<path d="M14 13L19 16L14 19V13Z" fill="white"/>
<path d="M19 13H23V14.5H19V13Z" fill="white"/>
<path d="M19 17.5H23V19H19V17.5Z" fill="white"/>
<path d="M9 10H23V11.5H9V10Z" fill="white"/>
<path d="M9 20.5H23V22H9V20.5Z" fill="white"/>
</svg>
```

- [ ] **Step 4: Wire the icon into WorkflowStateIcon**

In `src/pages/workflows/details/WorkflowStateIcon.tsx`, add after line 26 (after `NodeTransformSvg` import):

```typescript
import NodeSubWorkflowSvg from '@/assets/icons/node-sub-workflow.svg?react'
```

In `nodeIconsMap`, add after `[NodeTypes.TRANSFORM]: NodeTransformSvg,`:

```typescript
[NodeTypes.SUB_WORKFLOW]: NodeSubWorkflowSvg,
```

- [ ] **Step 5: Run test to verify icon renders (not placeholder span)**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/details/__tests__/WorkflowStateIcon.test.tsx
```

Expected: both tests PASS. The first test now renders the actual SVG (not the span placeholder).

- [ ] **Step 6: Commit**

```bash
git add src/assets/icons/node-sub-workflow.svg \
        src/pages/workflows/details/WorkflowStateIcon.tsx \
        src/pages/workflows/details/__tests__/WorkflowStateIcon.test.tsx
git commit -m "EPMCDME-11609: Add sub-workflow SVG icon and wire it into WorkflowStateIcon"
```

---

### Task 2: Node template promotion, SubWorkflowNode card, and nodes/index registration

**Test-first: yes** — write test for SubWorkflowNode rendering before implementing the component.

**Files:**
- Modify: `src/types/workflowEditor/base.ts` (line ~142–145: change HIDDEN→ACTION, add icon)
- Create: `src/pages/workflows/editor/nodes/SubWorkflowNode.tsx`
- Modify: `src/pages/workflows/editor/nodes/index.tsx`
- Create: `src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx`

**Interfaces:**
- Consumes: `NodeSubWorkflowSvg` from T1, `NodeTypes.SUB_WORKFLOW` from existing `base.ts`
- Produces: `SubWorkflowNode` (named export) — consumed by nodes/index.tsx and T3 (indirectly)

- [ ] **Step 1: Write the failing test**

Create `src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { StateConfiguration } from '@/types/workflowEditor/configuration'

import { CommonNodeProps } from '../common'
import { SubWorkflowNode } from '../SubWorkflowNode'

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return { ...actual, useNodeConnections: () => [] }
})

const mockFindState = vi.fn()

const createMockProps = (overrides?: Partial<CommonNodeProps>): CommonNodeProps =>
  ({
    id: 'sub1',
    type: 'sub_workflow',
    selected: false,
    data: {
      findState: mockFindState,
      getConfig: vi.fn(),
      updateConfig: vi.fn(),
      removeState: vi.fn(),
      highlighted: false,
    },
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  } as CommonNodeProps)

const renderSubWorkflowNode = (props: Partial<CommonNodeProps> = {}) =>
  render(
    <ReactFlowProvider>
      <SubWorkflowNode {...createMockProps(props)} />
    </ReactFlowProvider>
  )

describe('SubWorkflowNode', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders with node id as title', () => {
    mockFindState.mockReturnValue({ id: 'sub1', _meta: { type: 'sub_workflow', is_connected: true } } as StateConfiguration)
    renderSubWorkflowNode()
    expect(screen.getByText('Sub1')).toBeInTheDocument()
  })

  it('shows connected indicator when is_connected is true', () => {
    mockFindState.mockReturnValue({ id: 'sub1', _meta: { type: 'sub_workflow', is_connected: true } } as StateConfiguration)
    const { container } = renderSubWorkflowNode()
    expect(container.querySelector('.bg-success-primary')).not.toBeNull()
  })

  it('shows disconnected indicator when is_connected is false', () => {
    mockFindState.mockReturnValue({ id: 'sub1', _meta: { type: 'sub_workflow', is_connected: false } } as StateConfiguration)
    const { container } = renderSubWorkflowNode()
    expect(container.querySelector('.bg-failed-secondary')).not.toBeNull()
  })

  it('defaults to disconnected when state not found', () => {
    mockFindState.mockReturnValue(undefined)
    const { container } = renderSubWorkflowNode()
    expect(container.querySelector('.bg-failed-secondary')).not.toBeNull()
  })

  it('calls findState with the node id', () => {
    mockFindState.mockReturnValue(undefined)
    renderSubWorkflowNode({ id: 'my-sub-workflow' })
    expect(mockFindState).toHaveBeenCalledWith('my-sub-workflow')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx
```

Expected: FAIL with "Cannot find module '../SubWorkflowNode'"

- [ ] **Step 3: Create SubWorkflowNode.tsx**

Create `src/pages/workflows/editor/nodes/SubWorkflowNode.tsx`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Position } from '@xyflow/react'

import { NodeTypes } from '@/types/workflowEditor/base'

import BaseNode from './BaseNode'
import Handle from './Handle'
import NodeHeader from './NodeHeader'
import { CommonNodeProps } from './common'

export const SubWorkflowNode = ({ data, selected, id }: CommonNodeProps) => {
  const state = data.findState(id)
  const isConnected = state?._meta?.is_connected ?? false

  return (
    <BaseNode
      selected={selected}
      isConnected={isConnected}
      hasError={data.hasError}
      status={data.status}
      success={data.success}
      failures={data.failures}
      active={data.active}
    >
      <Handle type="target" position={Position.Left} status={data.status} />
      <NodeHeader type={NodeTypes.SUB_WORKFLOW} title={id} />
      <Handle type="source" position={Position.Right} status={data.status} />
    </BaseNode>
  )
}
```

- [ ] **Step 4: Register SubWorkflowNode in nodes/index.tsx**

In `src/pages/workflows/editor/nodes/index.tsx`, add the import (alongside other node imports):

```typescript
import { SubWorkflowNode } from './SubWorkflowNode'
```

Add to `nodeTypeComponents`:

```typescript
[NodeTypes.SUB_WORKFLOW]: SubWorkflowNode,
```

- [ ] **Step 5: Promote SUB_WORKFLOW template from HIDDEN to ACTION in base.ts**

In `src/types/workflowEditor/base.ts`:

1. Add import near other node SVG imports at the top of the file:
```typescript
import NodeSubWorkflowSvg from '@/assets/icons/node-sub-workflow.svg?react'
```

2. Find the `nodeTemplates` entry for `NodeTypes.SUB_WORKFLOW` (currently has `category: NodeTemplateCategory.HIDDEN`) and change it:
```typescript
{
  type: NodeTypes.SUB_WORKFLOW,
  label: 'Sub-Workflow',
  icon: NodeSubWorkflowSvg,
  category: NodeTemplateCategory.ACTION,
},
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/workflowEditor/base.ts \
        src/pages/workflows/editor/nodes/SubWorkflowNode.tsx \
        src/pages/workflows/editor/nodes/index.tsx \
        src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx
git commit -m "EPMCDME-11609: Add SubWorkflowNode card and promote template to ACTION category"
```

---

### Task 3: Sidebar feature-flag gating

**Test-first: yes** — write Sidebar test before adding the hook.

**Files:**
- Modify: `src/pages/workflows/editor/Sidebar.tsx`
- Create: `src/pages/workflows/editor/__tests__/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useSubWorkflowEnabled` from `@/hooks/useFeatureFlags`, `NodeTypes` from `@/types/workflowEditor/base`
- Produces: filtered `visibleActionNodes` (runtime; no exported API)

- [ ] **Step 1: Write the failing test**

Create `src/pages/workflows/editor/__tests__/Sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor/base'

vi.mock('@/hooks/useFeatureFlags', () => ({
  useSubWorkflowEnabled: vi.fn(),
}))

vi.mock('@/hooks/useReactFlowDnD', () => ({
  useDnD: () => ({ onDragStart: vi.fn(), isDragging: false }),
}))

import { useSubWorkflowEnabled } from '@/hooks/useFeatureFlags'
import Sidebar from '../Sidebar'

const mockCreateState = vi.fn()

const renderSidebar = () =>
  render(<Sidebar createState={mockCreateState} disabled={false} />)

describe('Sidebar — SUB_WORKFLOW feature flag gating', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('hides the Sub-Workflow node when the flag is off', () => {
    vi.mocked(useSubWorkflowEnabled).mockReturnValue([false, true])
    renderSidebar()
    expect(screen.queryByText('Sub-Workflow')).toBeNull()
  })

  it('shows the Sub-Workflow node when the flag is on', () => {
    vi.mocked(useSubWorkflowEnabled).mockReturnValue([true, true])
    renderSidebar()
    expect(screen.getByText('Sub-Workflow')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/__tests__/Sidebar.test.tsx
```

Expected: FAIL — "Sub-Workflow" may appear when flag is off (filtering not yet in place).

- [ ] **Step 3: Add feature-flag filtering inside Sidebar component**

In `src/pages/workflows/editor/Sidebar.tsx`:

1. Add imports at the top (after existing imports):
```typescript
import { useSubWorkflowEnabled } from '@/hooks/useFeatureFlags'
import { NodeTypes } from '@/types/workflowEditor/base'
```

2. Inside the `Sidebar` component body, after the `onDragStart`/`isDragging` destructure, add:
```typescript
const [isSubWorkflowEnabled] = useSubWorkflowEnabled()
const visibleActionNodes = actionNodes.filter(
  (t) => t.type !== NodeTypes.SUB_WORKFLOW || isSubWorkflowEnabled
)
```

3. In the JSX, replace `{actionNodes.map(...)}` with `{visibleActionNodes.map(...)}`:
```tsx
{visibleActionNodes.map((template) => (
  <SidebarNode
    key={`${template.type}-${template.label}`}
    template={template}
    onDragStart={handleDragStart}
  />
))}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/__tests__/Sidebar.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/editor/Sidebar.tsx \
        src/pages/workflows/editor/__tests__/Sidebar.test.tsx
git commit -m "EPMCDME-11609: Gate sub-workflow sidebar node behind feature flag"
```

---

### Task 4: Store method and WorkflowSelector extension

**Test-first: yes** — write test for `getOptions` prop before extending WorkflowSelector.

**Files:**
- Modify: `src/store/workflows.ts`
- Modify: `src/pages/workflows/components/WorkflowSelector.tsx`
- Create: `src/pages/workflows/components/__tests__/WorkflowSelector.test.tsx`

**Interfaces:**
- Produces:
  - `workflowsStore.getSelectableWorkflows(params?: { search?: string; project?: string }): Promise<Workflow[]>` — called by SubWorkflowTab (T6)
  - `WorkflowSelectorProps.getOptions?: (params: { search?: string; project?: string }) => Promise<Workflow[]>` — used in T6

- [ ] **Step 1: Write the failing test**

Create `src/pages/workflows/components/__tests__/WorkflowSelector.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getWorkflowOptions: vi.fn().mockResolvedValue([]),
  },
}))

import WorkflowSelector from '../WorkflowSelector'

describe('WorkflowSelector — getOptions prop', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls the provided getOptions instead of store.getWorkflowOptions on mount', async () => {
    const customGetOptions = vi.fn().mockResolvedValue([
      { id: 'wf-1', name: 'Selectable Workflow', icon_url: '' },
    ])

    render(
      <WorkflowSelector
        value={[]}
        onChange={vi.fn()}
        getOptions={customGetOptions}
      />
    )

    await waitFor(() => {
      expect(customGetOptions).toHaveBeenCalledWith({ search: '', project: undefined })
    })
  })

  it('falls back to workflowsStore.getWorkflowOptions when getOptions is not provided', async () => {
    const { workflowsStore } = await import('@/store/workflows')

    render(<WorkflowSelector value={[]} onChange={vi.fn()} />)

    await waitFor(() => {
      expect(workflowsStore.getWorkflowOptions).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/components/__tests__/WorkflowSelector.test.tsx
```

Expected: FAIL — `customGetOptions` is not called (prop doesn't exist yet).

- [ ] **Step 3: Add getSelectableWorkflows to the store**

In `src/store/workflows.ts`:

1. Add to the `WorkflowsStore` interface (after `getWorkflowOptions`):
```typescript
getSelectableWorkflows: (params?: { search?: string; project?: string }) => Promise<Workflow[]>
```

2. Add the implementation to `workflowsStore` (after `getWorkflowOptions` method):
```typescript
async getSelectableWorkflows({ search, project } = {}) {
  const filters = cleanObject({ search, project })
  const url = `v1/workflows/selectable?filters=${encodeURIComponent(JSON.stringify(filters))}`
  return api.get(url).then((res) => res.json()).then((res) => res.data ?? res)
},
```

- [ ] **Step 4: Extend WorkflowSelector with getOptions prop**

In `src/pages/workflows/components/WorkflowSelector.tsx`:

1. Add `getOptions` to `WorkflowSelectorProps` interface:
```typescript
getOptions?: (params: { search?: string; project?: string }) => Promise<Workflow[]>
```

2. Destructure it in the component function signature:
```typescript
{ ..., getOptions, error }
```

3. Replace `fetchWorkflowOptions` with the fallback-aware version:
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

4. Add `Workflow` to the imports from `@/types/entity/workflow` (needed for the `fetcher` type):

The existing import `import { workflowsStore } from '@/store/workflows'` stays unchanged.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/components/__tests__/WorkflowSelector.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/workflows.ts \
        src/pages/workflows/components/WorkflowSelector.tsx \
        src/pages/workflows/components/__tests__/WorkflowSelector.test.tsx
git commit -m "EPMCDME-11609: Add getSelectableWorkflows store method and extend WorkflowSelector with getOptions prop"
```

---

### Task 5: InputMappingEditor component

**Test-first: yes** — write test for add/remove/edit behavior before implementing the component.

**Files:**
- Create: `src/pages/workflows/editor/configPanels/components/InputMappingEditor.tsx`
- Create: `src/pages/workflows/editor/configPanels/components/__tests__/InputMappingEditor.test.tsx`

**Interfaces:**
- Produces: `InputMappingEditor` (default export) with props `{ value: Record<string, string>; onChange: (v: Record<string, string>) => void; disabled?: boolean }` — consumed by SubWorkflowTab (T6)

- [ ] **Step 1: Write the failing test**

Create `src/pages/workflows/editor/configPanels/components/__tests__/InputMappingEditor.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import InputMappingEditor from '../InputMappingEditor'

describe('InputMappingEditor', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => { vi.clearAllMocks() })

  it('renders rows for each entry in the initial value', () => {
    render(
      <InputMappingEditor
        value={{ key1: 'val1', key2: 'val2' }}
        onChange={mockOnChange}
      />
    )
    const keyInputs = screen.getAllByPlaceholderText('Key')
    expect(keyInputs).toHaveLength(2)
    expect(keyInputs[0]).toHaveValue('key1')
    expect(keyInputs[1]).toHaveValue('key2')
  })

  it('renders an empty state with no rows when value is empty', () => {
    render(<InputMappingEditor value={{}} onChange={mockOnChange} />)
    expect(screen.queryByPlaceholderText('Key')).toBeNull()
  })

  it('adds a new empty row when Add mapping is clicked', () => {
    render(<InputMappingEditor value={{}} onChange={mockOnChange} />)
    fireEvent.click(screen.getByText('Add mapping'))
    expect(screen.getByPlaceholderText('Key')).toBeInTheDocument()
  })

  it('calls onChange with correct Record when a key is edited', () => {
    render(
      <InputMappingEditor value={{ old_key: 'old_val' }} onChange={mockOnChange} />
    )
    fireEvent.change(screen.getByPlaceholderText('Key'), { target: { value: 'new_key' } })
    expect(mockOnChange).toHaveBeenCalledWith({ new_key: 'old_val' })
  })

  it('calls onChange with correct Record when a value is edited', () => {
    render(
      <InputMappingEditor value={{ k: 'old' }} onChange={mockOnChange} />
    )
    fireEvent.change(screen.getByPlaceholderText('Value'), { target: { value: 'new_val' } })
    expect(mockOnChange).toHaveBeenCalledWith({ k: 'new_val' })
  })

  it('removes a row and calls onChange without that entry', () => {
    render(
      <InputMappingEditor value={{ k1: 'v1', k2: 'v2' }} onChange={mockOnChange} />
    )
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0])
    expect(mockOnChange).toHaveBeenCalledWith({ k2: 'v2' })
  })

  it('disables inputs and buttons when disabled prop is true', () => {
    render(
      <InputMappingEditor value={{ k: 'v' }} onChange={mockOnChange} disabled={true} />
    )
    expect(screen.getByPlaceholderText('Key')).toBeDisabled()
    expect(screen.getByPlaceholderText('Value')).toBeDisabled()
    expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled()
    expect(screen.getByText('Add mapping')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/configPanels/components/__tests__/InputMappingEditor.test.tsx
```

Expected: FAIL with "Cannot find module '../InputMappingEditor'"

- [ ] **Step 3: Create InputMappingEditor.tsx**

Create `src/pages/workflows/editor/configPanels/components/InputMappingEditor.tsx`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { useState } from 'react'

interface InputMappingEditorProps {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  disabled?: boolean
}

interface MappingRow {
  key: string
  value: string
}

const toRows = (record: Record<string, string>): MappingRow[] =>
  Object.entries(record).map(([key, value]) => ({ key, value }))

const toRecord = (rows: MappingRow[]): Record<string, string> =>
  Object.fromEntries(rows.map((r) => [r.key, r.value]))

const InputMappingEditor = ({ value, onChange, disabled = false }: InputMappingEditorProps) => {
  const [rows, setRows] = useState<MappingRow[]>(() => toRows(value))

  const updateRows = (updated: MappingRow[]) => {
    setRows(updated)
    onChange(toRecord(updated))
  }

  const addRow = () => updateRows([...rows, { key: '', value: '' }])

  const removeRow = (index: number) => updateRows(rows.filter((_, i) => i !== index))

  const updateKey = (index: number, newKey: string) => {
    const updated = rows.map((r, i) => (i === index ? { ...r, key: newKey } : r))
    updateRows(updated)
  }

  const updateValue = (index: number, newValue: string) => {
    const updated = rows.map((r, i) => (i === index ? { ...r, value: newValue } : r))
    updateRows(updated)
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            className="flex-1 border border-border-structural rounded px-2 py-1 text-sm bg-surface-base-chat text-text-primary"
            placeholder="Key"
            value={row.key}
            disabled={disabled}
            onChange={(e) => updateKey(index, e.target.value)}
          />
          <input
            className="flex-1 border border-border-structural rounded px-2 py-1 text-sm bg-surface-base-chat text-text-primary"
            placeholder="Value"
            value={row.value}
            disabled={disabled}
            onChange={(e) => updateValue(index, e.target.value)}
          />
          <button
            type="button"
            aria-label="Remove"
            disabled={disabled}
            className="text-text-quaternary hover:text-text-primary disabled:opacity-40 text-sm"
            onClick={() => removeRow(index)}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        className="text-sm text-brand-primary disabled:opacity-40 text-left"
        onClick={addRow}
      >
        Add mapping
      </button>
    </div>
  )
}

export default InputMappingEditor
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/configPanels/components/__tests__/InputMappingEditor.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/editor/configPanels/components/InputMappingEditor.tsx \
        src/pages/workflows/editor/configPanels/components/__tests__/InputMappingEditor.test.tsx
git commit -m "EPMCDME-11609: Add InputMappingEditor key-value editor component"
```

---

### Task 6: SubWorkflowTab config panel and ConfigPanel registration

**Test-first: yes** — write test for `isDirty()` and `save()` contract before implementing SubWorkflowTab.

**Files:**
- Create: `src/pages/workflows/editor/configPanels/subWorkflowFormSchema.ts`
- Create: `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx`
- Create: `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx`
- Modify: `src/pages/workflows/editor/ConfigPanel.tsx`

**Interfaces:**
- Consumes: `InputMappingEditor` from T5, `workflowsStore.getSelectableWorkflows` from T4, `WorkflowSelector` (with `getOptions`) from T4, `SubWorkflowStateConfiguration` from Story 1 types, `buildCommonStateConfig` from `./utils/formUtils`, `CommonStateFields`, `ConfigAccordion`, `TabFooter`, `ValidationError`, `registerFields`
- Produces: `SubWorkflowTab` (default export) and `SubWorkflowTabRef` interface with `{ isDirty: () => boolean; save: () => Promise<boolean> }` — consumed by ConfigPanel.tsx

- [ ] **Step 1: Create subWorkflowFormSchema.ts**

Create `src/pages/workflows/editor/configPanels/subWorkflowFormSchema.ts`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

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

- [ ] **Step 2: Write the failing test**

Create `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx`:

```tsx
import { render, act } from '@testing-library/react'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getSelectableWorkflows: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../components/InputMappingEditor', () => ({
  default: ({ value, onChange }: any) => (
    <div data-testid="input-mapping-editor" />
  ),
}))

vi.mock('../components/CommonStateFields', () => ({
  default: vi.fn().mockImplementation(({ ref: _ref }: any, ref: any) => {
    if (ref) {
      ref.current = {
        validate: vi.fn().mockResolvedValue(true),
        getValues: vi.fn().mockReturnValue({ id: 'sub1' }),
        isDirty: vi.fn().mockReturnValue(false),
        reset: vi.fn(),
      }
    }
    return <div data-testid="common-state-fields" />
  }),
}))

// Mock WorkflowSelector to avoid complex fetch logic
vi.mock('@/pages/workflows/components/WorkflowSelector', () => ({
  default: ({ value, onChange }: any) => (
    <div data-testid="workflow-selector" />
  ),
}))

import SubWorkflowTab, { SubWorkflowTabRef } from '../SubWorkflowTab'
import { NodeTypes } from '@/types/workflowEditor/base'
import { SubWorkflowStateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'

const makeConfig = (workflow_id = '', input_mapping = {}): WorkflowConfiguration => ({
  states: [
    {
      id: 'sub1',
      workflow_id,
      input_mapping,
      _meta: { type: NodeTypes.SUB_WORKFLOW, is_connected: true },
    } as SubWorkflowStateConfiguration,
  ],
})

describe('SubWorkflowTab', () => {
  const mockOnConfigChange = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => { vi.clearAllMocks() })

  it('renders without crashing', () => {
    const ref = createRef<SubWorkflowTabRef>()
    const { getByTestId } = render(
      <SubWorkflowTab
        ref={ref}
        project="test-project"
        stateId="sub1"
        config={makeConfig('wf-123', { k: 'v' })}
        onConfigChange={mockOnConfigChange}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />
    )
    expect(getByTestId('workflow-selector')).toBeInTheDocument()
    expect(getByTestId('input-mapping-editor')).toBeInTheDocument()
  })

  it('exposes isDirty() via ref, returns false when form is pristine', async () => {
    const ref = createRef<SubWorkflowTabRef>()
    render(
      <SubWorkflowTab
        ref={ref}
        project="test-project"
        stateId="sub1"
        config={makeConfig()}
        onConfigChange={mockOnConfigChange}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />
    )
    await act(async () => {})
    expect(ref.current?.isDirty()).toBe(false)
  })

  it('save() calls onConfigChange with state including workflow_id and input_mapping', async () => {
    const ref = createRef<SubWorkflowTabRef>()
    render(
      <SubWorkflowTab
        ref={ref}
        project="test-project"
        stateId="sub1"
        config={makeConfig('wf-abc', { user_query: '{{ context.input }}' })}
        onConfigChange={mockOnConfigChange}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />
    )
    await act(async () => {
      await ref.current?.save()
    })
    expect(mockOnConfigChange).toHaveBeenCalled()
    const call = mockOnConfigChange.mock.calls[0][0]
    expect(call.state.id).toBe('sub1')
    expect(call.state.data).toMatchObject({
      workflow_id: expect.any(String),
      input_mapping: expect.any(Object),
    })
    // No actors key — sub_workflow state carries config directly
    expect(call.actors).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx
```

Expected: FAIL with "Cannot find module '../SubWorkflowTab'"

- [ ] **Step 4: Create SubWorkflowTab.tsx**

Create `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { yupResolver } from '@hookform/resolvers/yup'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'

import WorkflowSelector, {
  WorkflowSelectorOption,
} from '@/pages/workflows/components/WorkflowSelector'
import { workflowsStore } from '@/store/workflows'
import { NodeTypes } from '@/types/workflowEditor/base'
import {
  SubWorkflowStateConfiguration,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { ConfigurationUpdate } from '@/utils/workflowEditor'

import CommonStateFields, { CommonStateFieldsRef } from './CommonStateFields'
import { subWorkflowFormSchema, SubWorkflowFormValues } from './subWorkflowFormSchema'
import { buildCommonStateConfig } from './utils/formUtils'
import ConfigAccordion from './components/ConfigAccordion'
import InputMappingEditor from './components/InputMappingEditor'
import TabFooter from './components/TabFooter'
import ValidationError from './components/ValidationError'
import { registerFields } from '../utils/visualEditorFieldRegistry'

registerFields(['workflow_id', 'input_mapping'], NodeTypes.SUB_WORKFLOW, 'resource_validation')

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

const SubWorkflowTab = forwardRef<SubWorkflowTabRef, SubWorkflowTabProps>(
  (
    {
      stateId,
      project,
      config,
      onConfigChange,
      onClose,
      onDelete,
      onDuplicate,
      validationError,
      onClearStateError,
    },
    ref
  ) => {
    const state = config.states?.find((s) => s.id === stateId) as SubWorkflowStateConfiguration

    const {
      control,
      trigger,
      getValues,
      reset,
      formState: { isDirty: isFormDirty },
    } = useForm<SubWorkflowFormValues>({
      resolver: yupResolver(subWorkflowFormSchema as any),
      mode: 'onChange',
      defaultValues: {
        workflow_id: state?.workflow_id ?? null,
        input_mapping: state?.input_mapping ?? {},
      },
    })

    const commonStateFieldsRef = useRef<CommonStateFieldsRef>(null)

    const saveData = async (): Promise<boolean> => {
      if (validationError && onClearStateError) {
        onClearStateError(stateId)
      }

      if (!commonStateFieldsRef.current) return false
      const isCommonFieldsValid = await commonStateFieldsRef.current.validate()
      if (!isCommonFieldsValid) return false

      const isFormValid = await trigger()
      if (!isFormValid) return false

      const commonValues = commonStateFieldsRef.current.getValues()
      const formValues = getValues()

      const updatedStateConfig: SubWorkflowStateConfiguration = {
        ...buildCommonStateConfig(commonValues, state),
        workflow_id: formValues.workflow_id ?? '',
        input_mapping: formValues.input_mapping ?? {},
      }

      commonStateFieldsRef.current?.reset()
      reset(formValues)

      onConfigChange({
        state: { id: stateId, data: updatedStateConfig },
      })

      return true
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => {
          const commonDirty = commonStateFieldsRef.current?.isDirty() ?? false
          return commonDirty || isFormDirty
        },
        save: saveData,
      }),
      [isFormDirty, state, stateId, config, onConfigChange]
    )

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        onClose?.(true)
      }
    }

    if (!state) return null

    return (
      <>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <ValidationError message={validationError} />

          <ConfigAccordion title="Sub-Workflow Configuration" defaultExpanded={true}>
            <div className="flex flex-col gap-4">
              <Controller
                name="workflow_id"
                control={control}
                render={({ field, fieldState }) => {
                  const selectorValue: WorkflowSelectorOption[] = field.value
                    ? [{ id: field.value, name: '' }]
                    : []
                  return (
                    <WorkflowSelector
                      label="Sub-Workflow"
                      placeholder="Select a workflow"
                      singleValue={true}
                      value={selectorValue}
                      onChange={(opts) => field.onChange(opts[0]?.id ?? null)}
                      project={project}
                      getOptions={workflowsStore.getSelectableWorkflows}
                      error={fieldState.error?.message}
                    />
                  )
                }}
              />

              <Controller
                name="input_mapping"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-text-quaternary">Input Mapping</div>
                    <InputMappingEditor
                      value={field.value ?? {}}
                      onChange={field.onChange}
                    />
                  </div>
                )}
              />
            </div>
          </ConfigAccordion>

          <CommonStateFields ref={commonStateFieldsRef} state={state} />
        </form>

        <TabFooter
          onCancel={() => onClose(true)}
          onSave={handleSave}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      </>
    )
  }
)

SubWorkflowTab.displayName = 'SubWorkflowTab'

export default SubWorkflowTab
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Register SubWorkflowTab in ConfigPanel.tsx**

In `src/pages/workflows/editor/ConfigPanel.tsx`:

1. Add import (alongside ToolTab, AssistantTab, etc.):
```typescript
import SubWorkflowTab, { SubWorkflowTabRef } from './configPanels/SubWorkflowTab'
```

2. Add entry to `nodeConfigPanels` (inside the `const nodeConfigPanels = { ... }` block):
```typescript
[NodeTypes.SUB_WORKFLOW]: SubWorkflowTab,
```

3. Add `NodeTypes.SUB_WORKFLOW` to the `max-w-96 w-96` CSS condition array (the line that includes `NodeTypes.ASSISTANT, NodeTypes.CUSTOM, NodeTypes.TOOL, NodeTypes.TRANSFORM`):
```typescript
[NodeTypes.ASSISTANT, NodeTypes.CUSTOM, NodeTypes.TOOL, NodeTypes.TRANSFORM, NodeTypes.SUB_WORKFLOW].includes(
  selectedNode.type as any
)
```

- [ ] **Step 7: Run full unit test suite**

```bash
npm run test:unit -- --reporter=verbose
```

Expected: all tests pass (existing 3976 + the new tests from this story).

- [ ] **Step 8: Commit**

```bash
git add src/pages/workflows/editor/configPanels/subWorkflowFormSchema.ts \
        src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx \
        src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx \
        src/pages/workflows/editor/ConfigPanel.tsx
git commit -m "EPMCDME-11609: Add SubWorkflowTab config panel and register in ConfigPanel"
```
