# Model Management Admin UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/settings/administration/models` — an enterprise-admin page listing all platform models with their admin-set status, plus per-row Enable / Disable / Mark-as-deprecated actions.

**Architecture:** New Valtio store (`adminModelsStore`) reads `GET /v1/llm_models?include_all=true` (catalog endpoint, now carries `status`), writes via `PUT /v1/admin/llm/{base_name}/status`. A new page component (`ModelsManagementPage`) follows the `ProvidersManagementPage` pattern exactly: `SettingsLayout` + `Table` + row-actions dropdown (`ModelActions`) with confirmations for destructive status changes. Navigation tab added to `getEnterpriseAdminItems()` in `tabs.tsx`.

**Tech Stack:** React 18, TypeScript 5, Valtio, PrimeReact Table, `NavigationMore` + `ConfirmationModal` (existing components), Vitest + React Testing Library.

**Working tree note:** Pre-existing dirty files `Dockerfile.dev`, `vite.config.ts`, `src/hooks/useFeatureFlags.ts` must **never** be staged. Use path-scoped `git add` in every commit step.

---

## File map

| File | Action |
|---|---|
| `src/types/entity/adminModel.ts` | Create — `ModelPlatformStatus` union + `AdminModel` interface |
| `src/utils/ariaIds.ts` | Modify — add `modelLabelId` |
| `src/store/adminModels.ts` | Create — Valtio store |
| `src/store/__tests__/adminModels.test.ts` | Create — store unit tests |
| `src/pages/settings/administration/components/ModelStatusBadge.tsx` | Create — coloured dot + label |
| `src/pages/settings/administration/__tests__/ModelStatusBadge.test.tsx` | Create — badge unit tests |
| `src/pages/settings/administration/components/ModelActions.tsx` | Create — row-actions dropdown |
| `src/pages/settings/administration/__tests__/ModelActions.test.tsx` | Create — actions unit tests |
| `src/pages/settings/administration/ModelsManagementPage.tsx` | Create — page component |
| `src/pages/settings/administration/__tests__/ModelsManagementPage.test.tsx` | Create — page unit tests |
| `src/constants/index.ts` | Modify — add `MODELS_MANAGEMENT` to `SettingsTab` enum |
| `src/pages/settings/tabs.tsx` | Modify — add nav entry to `getEnterpriseAdminItems()` |
| `src/router.tsx` | Modify — add route import + entry |

---

## Task 1: Types and aria ID helper

**Files:**
- Create: `src/types/entity/adminModel.ts`
- Modify: `src/utils/ariaIds.ts`

No test needed for pure type/utility files.

- [ ] **Step 1: Create `src/types/entity/adminModel.ts`**

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

export type ModelPlatformStatus = 'enabled' | 'disabled' | 'deprecated'

export interface AdminModel {
  base_name: string
  label: string
  provider?: string
  isPremium?: boolean
  enabled: boolean
  status: ModelPlatformStatus
  cost?: { input: number; output: number }
  multimodal?: boolean
  supportsTools?: boolean
  supportsImageGeneration?: boolean
  defaultForCategories?: string[]
}
```

- [ ] **Step 2: Add `modelLabelId` to `src/utils/ariaIds.ts`**

Append one line at the end of the existing exports:

```typescript
export const modelLabelId = (baseName: string) => `model-label-${baseName}`
```

- [ ] **Step 3: Commit**

```bash
git add src/types/entity/adminModel.ts src/utils/ariaIds.ts
git commit -m "EPMCDME-15078: add AdminModel type and modelLabelId aria helper"
```

---

## Task 2: Valtio store

**Files:**
- Create: `src/store/adminModels.ts`
- Test: `src/store/__tests__/adminModels.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/adminModels.test.ts`:

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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { AdminModel } from '@/types/entity/adminModel'

const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}))

const mockModels: AdminModel[] = [
  { base_name: 'gpt-4', label: 'GPT-4', provider: 'azure_openai', enabled: true, status: 'enabled' },
  { base_name: 'claude-3', label: 'Claude 3', provider: 'anthropic', enabled: false, status: 'disabled' },
]

describe('adminModelsStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { adminModelsStore } = await import('@/store/adminModels')
    adminModelsStore.models = []
    adminModelsStore.loading = false
  })

  it('initializes with empty models array', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(adminModelsStore.models).toEqual([])
  })

  it('initializes loading as false', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(adminModelsStore.loading).toBe(false)
  })

  it('has indexModels method', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(typeof adminModelsStore.indexModels).toBe('function')
  })

  it('has setModelStatus method', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(typeof adminModelsStore.setModelStatus).toBe('function')
  })

  describe('indexModels', () => {
    it('calls GET /v1/llm_models?include_all=true', async () => {
      mockGet.mockResolvedValueOnce({ json: () => Promise.resolve([]) })
      const { adminModelsStore } = await import('@/store/adminModels')

      await adminModelsStore.indexModels()

      expect(mockGet).toHaveBeenCalledWith('v1/llm_models?include_all=true')
    })

    it('populates models from the response and returns them', async () => {
      mockGet.mockResolvedValueOnce({ json: () => Promise.resolve(mockModels) })
      const { adminModelsStore } = await import('@/store/adminModels')

      const result = await adminModelsStore.indexModels()

      expect(result).toEqual(mockModels)
      expect(adminModelsStore.models).toEqual(mockModels)
    })

    it('sets loading to false after fetch completes', async () => {
      mockGet.mockResolvedValueOnce({ json: () => Promise.resolve([]) })
      const { adminModelsStore } = await import('@/store/adminModels')

      await adminModelsStore.indexModels()

      expect(adminModelsStore.loading).toBe(false)
    })
  })

  describe('setModelStatus', () => {
    it('calls PUT /v1/admin/llm/{baseName}/status with the status body', async () => {
      mockPut.mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      await adminModelsStore.setModelStatus('gpt-4', 'disabled')

      expect(mockPut).toHaveBeenCalledWith('v1/admin/llm/gpt-4/status', { status: 'disabled' })
    })

    it('patches the model status in place without re-fetching', async () => {
      mockPut.mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      await adminModelsStore.setModelStatus('gpt-4', 'deprecated')

      expect(adminModelsStore.models[0].status).toBe('deprecated')
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('re-throws on API error', async () => {
      mockPut.mockRejectedValueOnce(new Error('Forbidden'))
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      await expect(adminModelsStore.setModelStatus('gpt-4', 'disabled')).rejects.toThrow('Forbidden')
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run --project unit src/store/__tests__/adminModels.test.ts
```

Expected: FAIL — `Cannot find module '@/store/adminModels'`

- [ ] **Step 3: Create `src/store/adminModels.ts`**

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

import { proxy } from 'valtio'

import { AdminModel, ModelPlatformStatus } from '@/types/entity/adminModel'
import api from '@/utils/api'

interface AdminModelsStore {
  models: AdminModel[]
  loading: boolean
  indexModels: () => Promise<AdminModel[]>
  setModelStatus: (baseName: string, status: ModelPlatformStatus) => Promise<void>
}

export const adminModelsStore = proxy<AdminModelsStore>({
  models: [],
  loading: false,

  async indexModels() {
    this.loading = true
    try {
      const response = await api.get('v1/llm_models?include_all=true')
      const data = await response.json()
      this.models = data
      return data
    } finally {
      this.loading = false
    }
  },

  async setModelStatus(baseName, status) {
    await api.put(`v1/admin/llm/${baseName}/status`, { status })
    const index = this.models.findIndex((m) => m.base_name === baseName)
    if (index !== -1) {
      this.models[index].status = status
    }
  },
})
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run --project unit src/store/__tests__/adminModels.test.ts
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/store/adminModels.ts src/store/__tests__/adminModels.test.ts
git commit -m "EPMCDME-15078: add adminModelsStore with indexModels and setModelStatus"
```

---

## Task 3: ModelStatusBadge component

**Files:**
- Create: `src/pages/settings/administration/components/ModelStatusBadge.tsx`
- Test: `src/pages/settings/administration/__tests__/ModelStatusBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/__tests__/ModelStatusBadge.test.tsx`:

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

import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'

import ModelStatusBadge from '../components/ModelStatusBadge'

afterEach(cleanup)

describe('ModelStatusBadge', () => {
  it('displays "Enabled" for the enabled state', () => {
    render(<ModelStatusBadge status="enabled" />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('displays "Deprecated" for the deprecated state', () => {
    render(<ModelStatusBadge status="deprecated" />)
    expect(screen.getByText('Deprecated')).toBeInTheDocument()
  })

  it('displays "Disabled" for the disabled state', () => {
    render(<ModelStatusBadge status="disabled" />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run --project unit src/pages/settings/administration/__tests__/ModelStatusBadge.test.tsx
```

Expected: FAIL — `Cannot find module '../components/ModelStatusBadge'`

- [ ] **Step 3: Create `src/pages/settings/administration/components/ModelStatusBadge.tsx`**

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

import { ModelPlatformStatus } from '@/types/entity/adminModel'

const STATUS_CONFIG: Record<ModelPlatformStatus, { label: string; dotClass: string }> = {
  enabled: { label: 'Enabled', dotClass: 'bg-success-primary' },
  deprecated: { label: 'Deprecated', dotClass: 'bg-warning-primary' },
  disabled: { label: 'Disabled', dotClass: 'bg-surface-base-quaternary' },
}

const ModelStatusBadge = ({ status }: { status: ModelPlatformStatus }) => {
  const { label, dotClass } = STATUS_CONFIG[status]
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} aria-hidden="true" />
      <span className="text-sm text-text-primary">{label}</span>
    </span>
  )
}

export default ModelStatusBadge
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run --project unit src/pages/settings/administration/__tests__/ModelStatusBadge.test.tsx
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/components/ModelStatusBadge.tsx \
        src/pages/settings/administration/__tests__/ModelStatusBadge.test.tsx
git commit -m "EPMCDME-15078: add ModelStatusBadge component"
```

---

## Task 4: ModelActions component

**Files:**
- Create: `src/pages/settings/administration/components/ModelActions.tsx`
- Test: `src/pages/settings/administration/__tests__/ModelActions.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/__tests__/ModelActions.test.tsx`:

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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'

import { AdminModel } from '@/types/entity/adminModel'
import { modelLabelId } from '@/utils/ariaIds'

import ModelActions from '../components/ModelActions'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({
  default: () => <span data-testid="nav-more-icon" />,
}))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/new/delete.svg?react', () => ({ default: () => null }))

afterEach(cleanup)

const makeModel = (status: AdminModel['status']): AdminModel => ({
  base_name: 'gpt-4',
  label: 'GPT-4',
  enabled: true,
  status,
})

// Renders the label span (needed for aria-labelledby) alongside the actions component.
const renderActions = (model: AdminModel, onStatusChange = vi.fn()) =>
  render(
    <div>
      <span id={modelLabelId(model.base_name)}>{model.label}</span>
      <ModelActions model={model} onStatusChange={onStatusChange} />
    </div>
  )

// The trigger button accessible name is the model label (via aria-labelledby).
const openMenu = (label: string) =>
  fireEvent.click(screen.getByRole('button', { name: label }))

describe('ModelActions — menu items are contextual', () => {
  it('shows Disable and Mark as deprecated (not Enable) for an enabled model', () => {
    renderActions(makeModel('enabled'))
    openMenu('GPT-4')
    expect(screen.getByRole('menuitem', { name: 'Disable' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Mark as deprecated' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Enable' })).not.toBeInTheDocument()
  })

  it('shows Enable and Mark as deprecated (not Disable) for a disabled model', () => {
    renderActions(makeModel('disabled'))
    openMenu('GPT-4')
    expect(screen.getByRole('menuitem', { name: 'Enable' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Mark as deprecated' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Disable' })).not.toBeInTheDocument()
  })

  it('shows Enable and Disable (not Mark as deprecated) for a deprecated model', () => {
    renderActions(makeModel('deprecated'))
    openMenu('GPT-4')
    expect(screen.getByRole('menuitem', { name: 'Enable' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Disable' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Mark as deprecated' })).not.toBeInTheDocument()
  })
})

describe('ModelActions — Enable (no confirmation)', () => {
  it('calls onStatusChange immediately with "enabled"', () => {
    const onStatusChange = vi.fn()
    renderActions(makeModel('disabled'), onStatusChange)
    openMenu('GPT-4')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Enable' }))
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ base_name: 'gpt-4' }),
      'enabled'
    )
  })
})

describe('ModelActions — Disable (requires confirmation)', () => {
  it('opens a confirmation modal with the model label in the header', () => {
    renderActions(makeModel('enabled'))
    openMenu('GPT-4')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disable' }))
    expect(screen.getByText('Disable GPT-4?')).toBeInTheDocument()
  })

  it('does not call onStatusChange before the modal is confirmed', () => {
    const onStatusChange = vi.fn()
    renderActions(makeModel('enabled'), onStatusChange)
    openMenu('GPT-4')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disable' }))
    expect(onStatusChange).not.toHaveBeenCalled()
  })

  it('calls onStatusChange with "disabled" when modal is confirmed', () => {
    const onStatusChange = vi.fn()
    renderActions(makeModel('enabled'), onStatusChange)
    openMenu('GPT-4')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ base_name: 'gpt-4' }),
      'disabled'
    )
  })
})

describe('ModelActions — Mark as deprecated (requires confirmation)', () => {
  it('opens a confirmation modal with the model label in the header', () => {
    renderActions(makeModel('enabled'))
    openMenu('GPT-4')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mark as deprecated' }))
    expect(screen.getByText('Mark GPT-4 as deprecated?')).toBeInTheDocument()
  })

  it('calls onStatusChange with "deprecated" when modal is confirmed', () => {
    const onStatusChange = vi.fn()
    renderActions(makeModel('enabled'), onStatusChange)
    openMenu('GPT-4')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mark as deprecated' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mark as deprecated' }))
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ base_name: 'gpt-4' }),
      'deprecated'
    )
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run --project unit src/pages/settings/administration/__tests__/ModelActions.test.tsx
```

Expected: FAIL — `Cannot find module '../components/ModelActions'`

- [ ] **Step 3: Create `src/pages/settings/administration/components/ModelActions.tsx`**

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

import { useState, useCallback } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { AdminModel, ModelPlatformStatus } from '@/types/entity/adminModel'
import { modelLabelId } from '@/utils/ariaIds'

interface ModelActionsProps {
  model: AdminModel
  onStatusChange: (model: AdminModel, status: ModelPlatformStatus) => void
}

const ModelActions = ({ model, onStatusChange }: ModelActionsProps) => {
  const [disableModalVisible, setDisableModalVisible] = useState(false)
  const [deprecateModalVisible, setDeprecateModalVisible] = useState(false)

  const confirmDisable = useCallback(() => {
    setDisableModalVisible(false)
    onStatusChange(model, 'disabled')
  }, [model, onStatusChange])

  const confirmDeprecate = useCallback(() => {
    setDeprecateModalVisible(false)
    onStatusChange(model, 'deprecated')
  }, [model, onStatusChange])

  const menuItems = [
    ...(model.status !== 'enabled'
      ? [{ title: 'Enable', onClick: () => onStatusChange(model, 'enabled') }]
      : []),
    ...(model.status !== 'disabled'
      ? [{ title: 'Disable', onClick: () => setDisableModalVisible(true) }]
      : []),
    ...(model.status !== 'deprecated'
      ? [{ title: 'Mark as deprecated', onClick: () => setDeprecateModalVisible(true) }]
      : []),
  ]

  return (
    <div className="flex justify-end">
      <NavigationMore
        hideOnClickInside
        renderInRoot
        items={menuItems}
        contextId={modelLabelId(model.base_name)}
      />

      <ConfirmationModal
        visible={disableModalVisible}
        onCancel={() => setDisableModalVisible(false)}
        header={`Disable ${model.label}?`}
        message="This model will be hidden from all catalogs. Existing work referencing it continues unaffected."
        confirmText="Disable"
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<DeleteSvg className="w-4 mr-px" />}
        onConfirm={confirmDisable}
      />

      <ConfirmationModal
        visible={deprecateModalVisible}
        onCancel={() => setDeprecateModalVisible(false)}
        header={`Mark ${model.label} as deprecated?`}
        message="This model will remain visible in catalogs but cannot be selected for new work."
        confirmText="Mark as deprecated"
        confirmButtonType={ButtonType.DELETE}
        onConfirm={confirmDeprecate}
      />
    </div>
  )
}

export default ModelActions
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run --project unit src/pages/settings/administration/__tests__/ModelActions.test.tsx
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/components/ModelActions.tsx \
        src/pages/settings/administration/__tests__/ModelActions.test.tsx
git commit -m "EPMCDME-15078: add ModelActions row-actions component"
```

---

## Task 5: ModelsManagementPage

**Files:**
- Create: `src/pages/settings/administration/ModelsManagementPage.tsx`
- Test: `src/pages/settings/administration/__tests__/ModelsManagementPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/__tests__/ModelsManagementPage.test.tsx`:

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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { adminModelsStore } from '@/store/adminModels'
import toaster from '@/utils/toaster'

import ModelsManagementPage from '../ModelsManagementPage'

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}))

// Mock icon imports used by NavigationMore and ConfirmationModal inside ModelActions.
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/new/delete.svg?react', () => ({ default: () => null }))

afterEach(cleanup)

const mockModels = [
  { base_name: 'gpt-4', label: 'GPT-4', provider: 'azure_openai', enabled: true, status: 'enabled' },
  { base_name: 'claude-3', label: 'Claude 3', provider: 'anthropic', enabled: false, status: 'disabled' },
  { base_name: 'gemini', label: 'Gemini Pro', provider: 'google_vertexai', enabled: true, status: 'deprecated' },
]

beforeEach(() => {
  vi.clearAllMocks()
  adminModelsStore.models = []
  adminModelsStore.loading = false
  adminModelsStore.indexModels = vi.fn().mockResolvedValue([])
  adminModelsStore.setModelStatus = vi.fn().mockResolvedValue(undefined)
})

describe('ModelsManagementPage', () => {
  it('calls indexModels on mount', () => {
    render(<ModelsManagementPage />)
    expect(adminModelsStore.indexModels).toHaveBeenCalledOnce()
  })

  it('renders a table row for each model', async () => {
    adminModelsStore.models = mockModels as any
    render(<ModelsManagementPage />)
    expect(await screen.findByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('Claude 3')).toBeInTheDocument()
    expect(screen.getByText('Gemini Pro')).toBeInTheDocument()
  })

  it('maps provider key to human label using PROVIDER_LABELS', async () => {
    adminModelsStore.models = [mockModels[0]] as any
    render(<ModelsManagementPage />)
    expect(await screen.findByText('Azure OpenAI')).toBeInTheDocument()
  })

  it('shows the base_name as a subtitle below the label', async () => {
    adminModelsStore.models = [mockModels[0]] as any
    render(<ModelsManagementPage />)
    expect(await screen.findByText('gpt-4')).toBeInTheDocument()
  })

  it('shows "Enabled" status badge for an enabled model', async () => {
    adminModelsStore.models = [mockModels[0]] as any
    render(<ModelsManagementPage />)
    expect(await screen.findByText('Enabled')).toBeInTheDocument()
  })

  it('shows "Disabled" status badge for a disabled model', async () => {
    adminModelsStore.models = [mockModels[1]] as any
    render(<ModelsManagementPage />)
    expect(await screen.findByText('Disabled')).toBeInTheDocument()
  })

  it('shows "Deprecated" status badge for a deprecated model', async () => {
    adminModelsStore.models = [mockModels[2]] as any
    render(<ModelsManagementPage />)
    expect(await screen.findByText('Deprecated')).toBeInTheDocument()
  })

  it('shows "Provider offline" chip when provider enabled=false', async () => {
    adminModelsStore.models = [mockModels[1]] as any  // claude-3: enabled=false
    render(<ModelsManagementPage />)
    expect(await screen.findByText('Provider offline')).toBeInTheDocument()
  })

  it('does not show "Provider offline" chip when provider enabled=true', async () => {
    adminModelsStore.models = [mockModels[0]] as any
    render(<ModelsManagementPage />)
    await screen.findByText('GPT-4')
    expect(screen.queryByText('Provider offline')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run --project unit src/pages/settings/administration/__tests__/ModelsManagementPage.test.tsx
```

Expected: FAIL — `Cannot find module '../ModelsManagementPage'`

- [ ] **Step 3: Create `src/pages/settings/administration/ModelsManagementPage.tsx`**

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

import { useEffect, useMemo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import Table from '@/components/Table'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { adminModelsStore } from '@/store/adminModels'
import { AdminModel, ModelPlatformStatus } from '@/types/entity/adminModel'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { modelLabelId } from '@/utils/ariaIds'
import toaster from '@/utils/toaster'

import ModelActions from './components/ModelActions'
import ModelStatusBadge from './components/ModelStatusBadge'

const PROVIDER_LABELS: Record<string, string> = {
  azure_openai: 'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  google_vertexai: 'Google Vertex AI',
  anthropic: 'Anthropic',
  'vertex_ai-anthropic_models': 'Vertex AI Anthropic',
}

const capabilityChipClass =
  'text-xs border border-border-secondary rounded-full px-2 py-0.5 text-text-quaternary'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'model', label: 'Model', type: DefinitionTypes.Custom, headClassNames: 'w-[45%]' },
  { key: 'provider', label: 'Provider', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
  { key: 'status', label: 'Status', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[15%]' },
]

const renderModelCell = (item: AdminModel) => (
  <div className="flex flex-col gap-0.5">
    <span className="flex items-center gap-2">
      <span id={modelLabelId(item.base_name)} className="text-text-primary font-medium">
        {item.label}
      </span>
      {!item.enabled && <span className={capabilityChipClass}>Provider offline</span>}
    </span>
    <span className="text-xs text-text-quaternary font-geist-mono">{item.base_name}</span>
  </div>
)

const renderProviderCell = (item: AdminModel) => (
  <span className="text-text-tertiary">
    {(item.provider && (PROVIDER_LABELS[item.provider] ?? item.provider)) || '—'}
  </span>
)

const renderStatusCell = (item: AdminModel) => <ModelStatusBadge status={item.status} />

const ModelsManagementPage = () => {
  const { models, loading } = useSnapshot(adminModelsStore) as typeof adminModelsStore

  useEffect(() => {
    adminModelsStore.indexModels().catch((error) => {
      console.error('Failed to load models:', error)
    })
  }, [])

  const handleStatusChange = useCallback(async (model: AdminModel, status: ModelPlatformStatus) => {
    try {
      await adminModelsStore.setModelStatus(model.base_name, status)
    } catch {
      toaster.error(`Failed to update status for ${model.label}`)
    }
  }, [])

  const renderActionsCell = useCallback(
    (item: AdminModel) => <ModelActions model={item} onStatusChange={handleStatusChange} />,
    [handleStatusChange]
  )

  const customRenderColumns = useMemo(
    () => ({
      model: renderModelCell,
      provider: renderProviderCell,
      status: renderStatusCell,
      actions: renderActionsCell,
    }),
    [renderActionsCell]
  )

  const renderContent = () => (
    <div className="flex flex-col h-full pt-6">
      <Table
        items={models}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
        loading={loading}
      />
    </div>
  )

  return <SettingsLayout contentTitle="Model management" content={renderContent()} />
}

export default ModelsManagementPage
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run --project unit src/pages/settings/administration/__tests__/ModelsManagementPage.test.tsx
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/ModelsManagementPage.tsx \
        src/pages/settings/administration/__tests__/ModelsManagementPage.test.tsx
git commit -m "EPMCDME-15078: add ModelsManagementPage"
```

---

## Task 6: Navigation and routing

**Files:**
- Modify: `src/constants/index.ts`
- Modify: `src/pages/settings/tabs.tsx`
- Modify: `src/router.tsx`

- [ ] **Step 1: Add `MODELS_MANAGEMENT` to `SettingsTab` enum in `src/constants/index.ts`**

Locate the `SettingsTab` enum (currently ends with `AWS_AGENTCORE_RUNTIMES = 'aws_agentcore_runtimes'`). Add one entry:

```typescript
  MODELS_MANAGEMENT = 'models_management',
```

The full enum will now include:

```typescript
export enum SettingsTab {
  PROFILE = 'profile',
  ADMINISTRATION = 'administration',
  ACTIVITY_EVENTS = 'activity_events',
  BUDGETS_MANAGEMENT = 'budgets_management',
  COST_CENTERS_MANAGEMENT = 'cost_centers_management',
  PROJECTS_MANAGEMENT = 'projects_management',
  CUSTOMER_CONFIGURATION = 'customer_configuration',
  USERS_MANAGEMENT = 'users_management',
  CATEGORIES_MANAGEMENT = 'categories_management',
  MCP_MANAGEMENT = 'mcp_management',
  PROVIDERS_MANAGEMENT = 'providers_management',
  MODELS_MANAGEMENT = 'models_management',
  AI_ADOPTION_CONFIG = 'ai_adoption_config',
  ANALYTICS = 'analytics',
  AWS_ASSISTANTS = 'aws_assistants',
  AWS_WORKFLOWS = 'aws_workflows',
  AWS_DATA_SOURCES = 'aws_data_sources',
  AWS_GUARDRAILS = 'aws_guardrails',
  AWS_AGENTCORE_RUNTIMES = 'aws_agentcore_runtimes',
}
```

- [ ] **Step 2: Add nav entry to `getEnterpriseAdminItems()` in `src/pages/settings/tabs.tsx`**

Inside `getEnterpriseAdminItems()`, add the new entry to the returned array. The tabs are sorted alphabetically in `buildAdministrationChildren` so order in this array doesn't matter. Add it after the `PROVIDERS_MANAGEMENT` entry:

```typescript
const getEnterpriseAdminItems = (
  isMcpFeatureEnabled: boolean,
  budgetsManagementTab: LayoutTab[]
): LayoutTab[] => [
  {
    id: SettingsTab.AI_ADOPTION_CONFIG,
    name: 'AI/Run Adoption Framework',
    title: 'AI/Run Adoption Framework',
    url: '/settings/administration/ai-adoption-config',
  },
  ...budgetsManagementTab,
  {
    id: SettingsTab.CATEGORIES_MANAGEMENT,
    name: 'Categories management',
    title: 'Categories management',
    url: '/settings/administration/categories',
  },
  ...(isMcpFeatureEnabled
    ? [
        {
          id: SettingsTab.MCP_MANAGEMENT,
          name: 'MCPs management',
          title: 'MCPs catalog management',
          url: '/settings/administration/mcps',
        },
      ]
    : []),
  {
    id: SettingsTab.MODELS_MANAGEMENT,
    name: 'Model management',
    title: 'Model management',
    url: '/settings/administration/models',
  },
  {
    id: SettingsTab.PROVIDERS_MANAGEMENT,
    name: 'Providers management',
    title: 'Providers management',
    url: '/settings/administration/providers',
  },
]
```

- [ ] **Step 3: Add import and route to `src/router.tsx`**

Add the import near the other administration page imports (around line 80):

```typescript
import ModelsManagementPage from '@/pages/settings/administration/ModelsManagementPage'
```

Add the route entry alongside the other flat admin routes (after the categories route, around line 537):

```typescript
  {
    path: '/settings/administration/models',
    Component: ModelsManagementPage,
  },
```

- [ ] **Step 4: Run the tabs tests to verify the nav change is correct**

```bash
npx vitest run --project unit src/pages/settings/__tests__/
```

Expected: All existing tabs tests continue to pass. (The new tab is in `getEnterpriseAdminItems` and is invisible to tests that pass `isEnterprise=false`.)

- [ ] **Step 5: Run the full unit suite to check for regressions**

```bash
npm run test:unit
```

Expected: All tests pass. Note the `Test Files` line in the output — a suite that fails to load is invisible and would show a lower-than-expected file count. Confirm the count matches `git ls-files 'src/**/__tests__/**/*.test.tsx' 'src/**/__tests__/**/*.test.ts' | wc -l`.

- [ ] **Step 6: Commit**

```bash
git add src/constants/index.ts src/pages/settings/tabs.tsx src/router.tsx
git commit -m "EPMCDME-15078: wire ModelsManagementPage into navigation and router"
```

---

## Self-review

**Spec coverage:**
- §3 type layer — Task 1 ✓
- §4 store (`indexModels`, `setModelStatus`, `include_all=true`) — Task 2 ✓
- §5 page (SettingsLayout, Table, 4 columns, `indexModels` on mount, `handleStatusChange`) — Task 5 ✓
- §6 `ModelStatusBadge` (3 states, dot + label) — Task 3 ✓
- §7 `ModelActions` (contextual menu, confirmations for Disable/Deprecated, immediate Enable) — Task 4 ✓
- §8 `SettingsTab.MODELS_MANAGEMENT`, `getEnterpriseAdminItems`, route — Task 6 ✓
- §9 store unit tests, page unit tests — Tasks 2, 3, 4, 5 ✓
- §10 pre-existing dirty files excluded from all commits — noted in every commit step ✓

**Placeholder scan:** No TBDs. All code is complete. ✓

**Type consistency:**
- `AdminModel` defined in Task 1, used identically in Tasks 2–5 ✓
- `ModelPlatformStatus` union `'enabled' | 'disabled' | 'deprecated'` used consistently ✓
- `modelLabelId` added in Task 1, imported in Tasks 4 and 5 ✓
- `adminModelsStore.setModelStatus(baseName, status)` signature matches across Tasks 2 and 5 ✓
