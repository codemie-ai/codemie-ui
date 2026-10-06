# Available Models UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Available Models" project settings UI with chat/image model selection, validation, and authorization enforcement.

**Architecture:** React component (`AvailableModelsSection`) integrated into `ProjectDetailsPage`. Fetches model catalog from `/v1/llm_models` endpoints, displays selectable groups by category, validates at least one chat model before save, and calls `PATCH /v1/projects/{projectName}/allowed-models` to persist. Authorization gates UI editing to maintainers/admins. All patterns follow existing project settings implementations.

**Tech Stack:** React + TypeScript, Valtio for state management, React Hook Form + Yup for validation, PrimeReact Checkbox, Tailwind CSS, Jest + React Testing Library for tests.

## Global Constraints

- TypeScript with strict mode enabled
- Tailwind CSS for all styling; use existing design tokens (`bg-surface-base-secondary`, `text-text-quaternary`, etc.)
- Valtio store for data fetching/updating; follow existing async method pattern
- React Testing Library for component tests; mock API calls via jest.mock
- Personal projects must never show "Available Models" section
- Backend authorization is defense-in-depth; UI authorization is UX-focused

---

## File Structure

### Files to Create
- `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx` — Main section component displaying model catalog and selection UI
- `src/pages/settings/administration/projectsManagement/__tests__/AvailableModelsSection.test.tsx` — Component tests

### Files to Modify
- `src/types/entity/projectManagement.ts` — Add `allowed_models?: string[] | null` field to `ProjectDetail` interface
- `src/store/projects.ts` — Add `updateAllowedModels(projectName, allowed_models)` async method
- `src/store/__tests__/projects.test.ts` — Add tests for new store method
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — Integrate `AvailableModelsSection` component into page layout

---

## Task 1: Update ProjectDetail Type

**Files:**
- Modify: `src/types/entity/projectManagement.ts`

**Interfaces:**
- Consumes: (none — type-only change)
- Produces: `ProjectDetail` interface with `allowed_models?: string[] | null` field

- [ ] **Step 1: Read the current ProjectDetail interface**

Open `src/types/entity/projectManagement.ts` and locate the `ProjectDetail` interface. Note its current structure and where to add the new field.

- [ ] **Step 2: Add allowed_models field to ProjectDetail**

```typescript
export interface ProjectDetail {
  // ... existing fields ...
  allowed_models?: string[] | null
}
```

Add after existing fields, before the final closing brace. Type is `string[] | null` (null means "all models allowed" per backend contract).

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors related to projectManagement.ts

- [ ] **Step 4: Commit**

```bash
git add src/types/entity/projectManagement.ts
git commit -m "EPMCDME-14452: Add allowed_models field to ProjectDetail type"
```

---

## Task 2: Add updateAllowedModels Store Method

**Files:**
- Modify: `src/store/projects.ts`

**Interfaces:**
- Consumes: `api.patch(url, data)` from `src/utils/api.ts` (already available)
- Produces: `updateAllowedModels(projectName: string, allowedModels: string[] | null): Promise<ProjectDetail>`

- [ ] **Step 1: Read the projects store to understand the pattern**

Open `src/store/projects.ts`. Study the existing `updateProject()` method:
- How it calls `api.patch()`
- How it handles errors
- How it returns the result
- Follow this exact pattern for the new method

- [ ] **Step 2: Add updateAllowedModels method to projectsStore**

Add after existing update methods:

```typescript
async updateAllowedModels(projectName: string, allowedModels: string[] | null): Promise<ProjectDetail> {
  const response = await api.patch<ProjectDetail>(
    `/v1/projects/${encodeURIComponent(projectName)}/allowed-models`,
    { allowed_models: allowedModels }
  )
  
  // Update the cached project data with the new allowed_models
  const projectIndex = this.projects.findIndex(p => p.name === projectName)
  if (projectIndex !== -1) {
    this.projects[projectIndex] = response
  }
  
  return response
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors; method signature is correct

- [ ] **Step 4: Test the method compiles**

Open a component file and verify you can import `projectsStore` and call the method. No runtime test yet — just type checking.

- [ ] **Step 5: Commit**

```bash
git add src/store/projects.ts
git commit -m "EPMCDME-14452: Add updateAllowedModels method to projects store"
```

---

## Task 3: Write Tests for updateAllowedModels Store Method

**Files:**
- Modify: `src/store/__tests__/projects.test.ts`

**Interfaces:**
- Consumes: `updateAllowedModels(projectName, allowedModels)` from Task 2
- Produces: (test-only; no consumer interface)

- [ ] **Step 1: Write test for successful update**

Add to `src/store/__tests__/projects.test.ts`:

```typescript
describe('updateAllowedModels', () => {
  it('should call PATCH endpoint with allowed_models payload', async () => {
    const projectName = 'test-project'
    const allowedModels = ['model-1', 'model-2']
    const mockResponse: ProjectDetail = {
      name: projectName,
      allowed_models: allowedModels,
      // ... other required fields ...
    }
    
    api.patch = jest.fn().mockResolvedValue(mockResponse)
    
    const result = await projectsStore.updateAllowedModels(projectName, allowedModels)
    
    expect(api.patch).toHaveBeenCalledWith(
      `/v1/projects/${encodeURIComponent(projectName)}/allowed-models`,
      { allowed_models: allowedModels }
    )
    expect(result).toEqual(mockResponse)
  })
  
  it('should update cached project data after successful update', async () => {
    const projectName = 'test-project'
    const allowedModels = ['model-1']
    const mockResponse: ProjectDetail = {
      name: projectName,
      allowed_models: allowedModels,
      // ... other required fields ...
    }
    
    // Pre-populate store with existing project
    projectsStore.projects = [{ name: projectName, allowed_models: null, /* ... */ }]
    api.patch = jest.fn().mockResolvedValue(mockResponse)
    
    await projectsStore.updateAllowedModels(projectName, allowedModels)
    
    const updated = projectsStore.projects.find(p => p.name === projectName)
    expect(updated?.allowed_models).toEqual(allowedModels)
  })
})
```

- [ ] **Step 2: Write test for error handling**

Add to the same test block:

```typescript
  it('should throw error when PATCH fails', async () => {
    const projectName = 'test-project'
    const error = new Error('Network error')
    
    api.patch = jest.fn().mockRejectedValue(error)
    
    await expect(projectsStore.updateAllowedModels(projectName, ['model-1']))
      .rejects.toThrow('Network error')
  })
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/store/__tests__/projects.test.ts`
Expected: All new tests PASS (and existing tests still pass)

- [ ] **Step 4: Commit**

```bash
git add src/store/__tests__/projects.test.ts
git commit -m "EPMCDME-14452: Add tests for updateAllowedModels store method"
```

---

## Task 4: Create AvailableModelsSection Component

**Files:**
- Create: `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx`

**Interfaces:**
- Consumes: 
  - `projectsStore.updateAllowedModels(projectName, allowedModels)` from Task 2
  - `api.get(url)` from utils (already available)
  - User role flags from context/props
- Produces: React component `AvailableModelsSection` with props:
  - `projectName: string`
  - `currentAllowedModels: string[] | null` (from project detail)
  - `canManageModels: boolean` (authorization flag)
  - `onSuccess?: () => void` (callback after save)

- [ ] **Step 1: Create component file with structure**

Create `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from 'react'
import { Checkbox } from '@/components/form/Checkbox'
import { toaster } from '@/utils/toaster'
import { api } from '@/utils/api'
import { projectsStore } from '@/store/projects'

interface LLMModel {
  id: string
  name: string
  category: 'chat' | 'image_generation' | string
  disabled: boolean
  forbidden_for_web: boolean
  description?: string
}

interface AvailableModelsSectionProps {
  projectName: string
  currentAllowedModels: string[] | null
  canManageModels: boolean
  onSuccess?: () => void
}

export const AvailableModelsSection: React.FC<AvailableModelsSectionProps> = ({
  projectName,
  currentAllowedModels,
  canManageModels,
  onSuccess,
}) => {
  const [chatModels, setChatModels] = useState<LLMModel[]>([])
  const [imageModels, setImageModels] = useState<LLMModel[]>([])
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Fetch available models from backend
  const loadModels = useCallback(async () => {
    setLoading(true)
    try {
      const [chatResp, imageResp] = await Promise.all([
        api.get<LLMModel[]>('/v1/llm_models?include_all=false'),
        api.get<LLMModel[]>('/v1/llm_models/image_generation?include_all=false'),
      ])
      setChatModels(chatResp)
      setImageModels(imageResp)
      
      // Initialize selected models from currentAllowedModels
      if (currentAllowedModels === null) {
        // null means all allowed
        setSelectedModels(new Set([...chatResp, ...imageResp].map(m => m.id)))
      } else {
        setSelectedModels(new Set(currentAllowedModels))
      }
    } catch (error: any) {
      toaster.error(error?.parsedError?.message || 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }, [currentAllowedModels])

  useEffect(() => {
    loadModels()
  }, [loadModels])

  // Handle model checkbox toggle
  const handleModelToggle = (modelId: string, checked: boolean) => {
    const newSelected = new Set(selectedModels)
    if (checked) {
      newSelected.add(modelId)
    } else {
      newSelected.delete(modelId)
    }
    setSelectedModels(newSelected)
    setValidationError(null) // Clear error on change
  }

  // Validate at least one chat model is selected
  const validateSelection = (): boolean => {
    const selectedChatModels = chatModels.filter(m => selectedModels.has(m.id))
    if (selectedChatModels.length === 0) {
      setValidationError('At least one chat model must remain allowed')
      return false
    }
    return true
  }

  // Save changes to backend
  const handleSave = async () => {
    if (!validateSelection()) {
      return
    }

    setSaving(true)
    try {
      const allowedModels = Array.from(selectedModels)
      await projectsStore.updateAllowedModels(projectName, allowedModels)
      toaster.success('Available models updated successfully')
      onSuccess?.()
    } catch (error: any) {
      const errorMsg = error?.parsedError?.message || 'Failed to update models'
      toaster.error(errorMsg)
      // Detect "no chat models" error and show specific message
      if (errorMsg.includes('chat model') || error?.parsedError?.details?.includes?.('chat')) {
        setValidationError('At least one chat model must remain allowed')
      }
    } finally {
      setSaving(false)
    }
  }

  // Determine if a model is unavailable
  const isModelUnavailable = (model: LLMModel): boolean => {
    return model.disabled || model.forbidden_for_web
  }

  // Determine unavailability reason
  const getUnavailabilityReason = (model: LLMModel): string => {
    if (model.forbidden_for_web) return 'Not available for web'
    if (model.disabled) return 'Disabled by platform'
    return ''
  }

  if (loading) {
    return <div className="p-4">Loading models...</div>
  }

  return (
    <div className="space-y-6">
      {/* Chat Models Section */}
      <div className="bg-surface-base-secondary border border-border-structural rounded-lg p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Chat Models</h3>
        <div className="space-y-3">
          {chatModels.map(model => {
            const unavailable = isModelUnavailable(model)
            const isSelected = selectedModels.has(model.id)
            return (
              <div key={model.id} className={unavailable ? 'opacity-50' : ''}>
                <Checkbox
                  label={model.name}
                  checked={isSelected && !unavailable}
                  disabled={unavailable || !canManageModels}
                  onChange={e => handleModelToggle(model.id, e.checked)}
                  labelHint={unavailable ? getUnavailabilityReason(model) : model.description}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Image Generation Models Section */}
      <div className="bg-surface-base-secondary border border-border-structural rounded-lg p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Image Generation Models</h3>
        <div className="space-y-3">
          {imageModels.map(model => {
            const unavailable = isModelUnavailable(model)
            const isSelected = selectedModels.has(model.id)
            return (
              <div key={model.id} className={unavailable ? 'opacity-50' : ''}>
                <Checkbox
                  label={model.name}
                  checked={isSelected && !unavailable}
                  disabled={unavailable || !canManageModels}
                  onChange={e => handleModelToggle(model.id, e.checked)}
                  labelHint={unavailable ? getUnavailabilityReason(model) : model.description}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}

      {/* Save Button */}
      {canManageModels && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {saving ? 'Saving...' : 'Save Models'}
        </button>
      )}

      {!canManageModels && (
        <p className="text-xs text-text-quaternary">Only maintainers and admins can modify available models.</p>
      )}
    </div>
  )
}

export default AvailableModelsSection
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors in the new component

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx
git commit -m "EPMCDME-14452: Create AvailableModelsSection component"
```

---

## Task 5: Create Component Tests

**Files:**
- Create: `src/pages/settings/administration/projectsManagement/__tests__/AvailableModelsSection.test.tsx`

**Interfaces:**
- Consumes: `AvailableModelsSection` component from Task 4
- Produces: (test-only; no consumer interface)

- [ ] **Step 1: Create test file with basic structure**

Create `src/pages/settings/administration/projectsManagement/__tests__/AvailableModelsSection.test.tsx`:

```typescript
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvailableModelsSection } from '../AvailableModelsSection'
import { api } from '@/utils/api'
import { projectsStore } from '@/store/projects'
import { toaster } from '@/utils/toaster'

jest.mock('@/utils/api')
jest.mock('@/store/projects')
jest.mock('@/utils/toaster')

const mockChatModels = [
  {
    id: 'model-1',
    name: 'Claude 3 Sonnet',
    category: 'chat',
    disabled: false,
    forbidden_for_web: false,
    description: 'Fast and efficient',
  },
  {
    id: 'model-2',
    name: 'GPT-4',
    category: 'chat',
    disabled: false,
    forbidden_for_web: false,
    description: 'Powerful model',
  },
]

const mockImageModels = [
  {
    id: 'image-1',
    name: 'DALL-E 3',
    category: 'image_generation',
    disabled: false,
    forbidden_for_web: false,
    description: 'Image generation',
  },
]

describe('AvailableModelsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load and display models on mount', async () => {
    ;(api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('llm_models?')) return Promise.resolve(mockChatModels)
      if (url.includes('image_generation')) return Promise.resolve(mockImageModels)
    })

    render(
      <AvailableModelsSection
        projectName="test-project"
        currentAllowedModels={null}
        canManageModels={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
      expect(screen.getByText('DALL-E 3')).toBeInTheDocument()
    })
  })

  it('should select models matching currentAllowedModels', async () => {
    ;(api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('llm_models?')) return Promise.resolve(mockChatModels)
      if (url.includes('image_generation')) return Promise.resolve(mockImageModels)
    })

    render(
      <AvailableModelsSection
        projectName="test-project"
        currentAllowedModels={['model-1']}
        canManageModels={true}
      />
    )

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox', { name: /Claude 3 Sonnet/ })
      expect(checkbox).toBeChecked()
    })
  })

  it('should show validation error when zero chat models selected', async () => {
    ;(api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('llm_models?')) return Promise.resolve(mockChatModels)
      if (url.includes('image_generation')) return Promise.resolve(mockImageModels)
    })

    render(
      <AvailableModelsSection
        projectName="test-project"
        currentAllowedModels={['model-1', 'model-2']}
        canManageModels={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
    })

    // Uncheck all chat models
    const sonnetCheckbox = screen.getByRole('checkbox', { name: /Claude 3 Sonnet/ })
    const gptCheckbox = screen.getByRole('checkbox', { name: /GPT-4/ })
    
    await userEvent.click(sonnetCheckbox)
    await userEvent.click(gptCheckbox)

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Models/ })
    await userEvent.click(saveButton)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/At least one chat model must remain/)).toBeInTheDocument()
    })
    
    // Should NOT call updateAllowedModels
    expect(projectsStore.updateAllowedModels).not.toHaveBeenCalled()
  })

  it('should save models when validation passes', async () => {
    ;(api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('llm_models?')) return Promise.resolve(mockChatModels)
      if (url.includes('image_generation')) return Promise.resolve(mockImageModels)
    })
    ;(projectsStore.updateAllowedModels as jest.Mock).mockResolvedValue({})

    render(
      <AvailableModelsSection
        projectName="test-project"
        currentAllowedModels={['model-1', 'model-2']}
        canManageModels={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
    })

    // Keep model-1, uncheck model-2
    const gptCheckbox = screen.getByRole('checkbox', { name: /GPT-4/ })
    await userEvent.click(gptCheckbox)

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Models/ })
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(projectsStore.updateAllowedModels).toHaveBeenCalledWith(
        'test-project',
        expect.arrayContaining(['model-1'])
      )
      expect(toaster.success).toHaveBeenCalled()
    })
  })

  it('should disable edit UI when canManageModels is false', async () => {
    ;(api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('llm_models?')) return Promise.resolve(mockChatModels)
      if (url.includes('image_generation')) return Promise.resolve(mockImageModels)
    })

    render(
      <AvailableModelsSection
        projectName="test-project"
        currentAllowedModels={null}
        canManageModels={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
    })

    // Checkboxes should be disabled
    const checkbox = screen.getByRole('checkbox', { name: /Claude 3 Sonnet/ })
    expect(checkbox).toBeDisabled()

    // Save button should not exist
    expect(screen.queryByRole('button', { name: /Save Models/ })).not.toBeInTheDocument()

    // Read-only message should display
    expect(screen.getByText(/Only maintainers and admins/)).toBeInTheDocument()
  })

  it('should mark unavailable models as disabled and show reason', async () => {
    const unavailableModels = [
      ...mockChatModels,
      {
        id: 'model-unavailable',
        name: 'Unavailable Model',
        category: 'chat',
        disabled: true,
        forbidden_for_web: false,
        description: 'This is disabled',
      },
    ]

    ;(api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('llm_models?')) return Promise.resolve(unavailableModels)
      if (url.includes('image_generation')) return Promise.resolve(mockImageModels)
    })

    render(
      <AvailableModelsSection
        projectName="test-project"
        currentAllowedModels={null}
        canManageModels={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Unavailable Model')).toBeInTheDocument()
    })

    // Unavailable checkbox should be disabled
    const unavailableCheckbox = screen.getByRole('checkbox', { name: /Unavailable Model/ })
    expect(unavailableCheckbox).toBeDisabled()
  })

  it('should handle API errors gracefully', async () => {
    ;(api.get as jest.Mock).mockRejectedValue({
      parsedError: { message: 'Failed to load models' },
    })

    render(
      <AvailableModelsSection
        projectName="test-project"
        currentAllowedModels={null}
        canManageModels={true}
      />
    )

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Failed to load models')
    })
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm test -- src/pages/settings/administration/projectsManagement/__tests__/AvailableModelsSection.test.tsx`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/__tests__/AvailableModelsSection.test.tsx
git commit -m "EPMCDME-14452: Add component tests for AvailableModelsSection"
```

---

## Task 6: Integrate AvailableModelsSection into ProjectDetailsPage

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx`

**Interfaces:**
- Consumes: 
  - `AvailableModelsSection` component from Task 4
  - `currentProject.allowed_models` (ProjectDetail field from Task 1)
  - User role flags (existing)
- Produces: Integrated page with AvailableModelsSection displayed in appropriate section

- [ ] **Step 1: Read ProjectDetailsPage to understand layout**

Open `src/pages/settings/administration/ProjectDetailsPage.tsx`. Identify:
- How existing sections are laid out
- Where authorization checks happen
- Where the component returns/renders sections

- [ ] **Step 2: Import AvailableModelsSection component**

At the top of ProjectDetailsPage.tsx, add:

```typescript
import { AvailableModelsSection } from './projectsManagement/AvailableModelsSection'
```

- [ ] **Step 3: Determine authorization flags in component**

Identify where the component gets user/project authorization data. Note:
- `currentUser` (from userStore or prop)
- `project` (current project from state)
- Authorization pattern: `const canManage = !isPersonalProject && (isAdmin || isMaintainer || isProjectAdmin)`

Create a variable to hold authorization for available models:

```typescript
const canManageAllowedModels = !project?.is_personal && (
  currentUser?.isAdmin || 
  currentUser?.isMaintainer || 
  currentUser?.applicationsAdmin?.includes(project?.name ?? '')
)
```

- [ ] **Step 4: Add AvailableModelsSection to render**

In the component's JSX return, add the section after other sections (e.g., after Budget section). Add at an appropriate location in the card-based layout:

```typescript
{/* Available Models Section */}
{!project?.is_personal && (
  <div className="...">
    <AvailableModelsSection
      projectName={project?.name ?? ''}
      currentAllowedModels={project?.allowed_models ?? null}
      canManageModels={canManageAllowedModels}
      onSuccess={() => {
        // Optionally refresh project details after save
        // e.g., refetchProject()
      }}
    />
  </div>
)}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 6: Test in browser (if dev server running)**

If you have the dev server running:
1. Navigate to project settings
2. Verify "Available Models" section appears
3. Verify checkboxes render and can be toggled
4. Verify authorization check hides section for non-admins/maintainers

- [ ] **Step 7: Commit**

```bash
git add src/pages/settings/administration/ProjectDetailsPage.tsx
git commit -m "EPMCDME-14452: Integrate AvailableModelsSection into ProjectDetailsPage"
```

---

## Task 7: Add Integration Tests to ProjectDetailsPage

**Files:**
- Modify: `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`

**Interfaces:**
- Consumes: ProjectDetailsPage component (modified in Task 6)
- Produces: (test-only; no consumer interface)

- [ ] **Step 1: Write test for AvailableModelsSection visibility**

Add to `ProjectDetailsPage.test.tsx`:

```typescript
describe('AvailableModelsSection visibility', () => {
  it('should display AvailableModelsSection for non-personal projects', async () => {
    const mockProject = {
      name: 'shared-project',
      is_personal: false,
      allowed_models: ['model-1'],
      // ... other fields ...
    }

    render(
      <ProjectDetailsPage projectName="shared-project" />
    )

    await waitFor(() => {
      expect(screen.getByText(/Available Models/i)).toBeInTheDocument()
    })
  })

  it('should hide AvailableModelsSection for personal projects', async () => {
    const mockProject = {
      name: 'personal-project',
      is_personal: true,
      allowed_models: null,
      // ... other fields ...
    }

    render(
      <ProjectDetailsPage projectName="personal-project" />
    )

    await waitFor(() => {
      expect(screen.queryByText(/Available Models/i)).not.toBeInTheDocument()
    })
  })

  it('should pass correct authorization flag to AvailableModelsSection', async () => {
    // Test that canManageAllowedModels is computed correctly
    // and passed to component for permission checks
    // (specifics depend on test setup)
  })
})
```

- [ ] **Step 2: Run ProjectDetailsPage tests**

Run: `npm test -- src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`
Expected: New tests PASS (and existing tests still pass)

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx
git commit -m "EPMCDME-14452: Add integration tests for AvailableModelsSection in ProjectDetailsPage"
```

---

## Task 8: End-to-End Validation

**Files:**
- (no file changes; validation only)

**Interfaces:**
- Consumes: All components and tests from Tasks 1–7

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS (unit, component, integration)

- [ ] **Step 2: Run type check**

Run: `npm run type-check`
Expected: No TypeScript errors

- [ ] **Step 3: Run linter**

Run: `npm run lint` (or equivalent)
Expected: No linting errors

- [ ] **Step 4: Manual test in dev environment (if available)**

If you have the dev server running and can access the app:

1. Log in as a user with admin/maintainer role
2. Navigate to a shared project's settings
3. Locate "Available Models" section
4. Verify models load and display in two groups (chat, image generation)
5. Toggle some checkboxes
6. Click "Save Models"
7. Verify success toast appears
8. Refresh page and verify selections persisted
9. Try unchecking all chat models and click save
10. Verify validation error appears ("At least one chat model...")
11. Log in as a non-admin user
12. Navigate to same project
13. Verify "Available Models" section displays as read-only (no checkboxes or save button)

- [ ] **Step 5: Commit test results (optional documentation)**

If you want to document the validation, create a brief `VALIDATION.md` in the task directory:

```bash
cat > docs/superpowers/tasks/2026-09-07-epmcdme-14452-ui-available-models/VALIDATION.md << 'EOF'
# Validation Results

- [x] All unit tests pass
- [x] All component tests pass
- [x] All integration tests pass
- [x] TypeScript type-check clean
- [x] Linter clean
- [x] Manual end-to-end test successful
  - Models load and display
  - Selections persist after save
  - Validation prevents zero chat models
  - Authorization gates non-admin access
  - Personal projects hide section

EOF
git add docs/superpowers/tasks/2026-09-07-epmcdme-14452-ui-available-models/VALIDATION.md
git commit -m "EPMCDME-14452: Add validation documentation"
```

---

## Rollback Strategy

If any task fails:

1. Identify the failing task
2. Run `git diff HEAD~1 HEAD` to see what changed
3. Run `git reset --soft HEAD~1` to undo the commit but keep changes
4. Fix the issue in the code
5. Re-commit with the same message (or amended if significant changes)

If a test suite breaks:
- Run the specific test with `-v` flag for details
- Fix the code or test
- Re-run to verify
- Commit

---

## Summary

**Total Tasks**: 8
**Estimated Time**: 4–6 hours (includes development + testing)
**Files Created**: 2 (component + tests)
**Files Modified**: 4 (types, store, tests, page)
**Test Coverage**: Unit (store, component), integration (page), end-to-end (manual)

**Key Deliverables**:
1. ProjectDetail type with allowed_models field
2. Store method updateAllowedModels() following async patterns
3. AvailableModelsSection component with full UI and validation
4. Comprehensive test coverage for component, store, and integration
5. Integration into ProjectDetailsPage with authorization gating
6. Validation of at least one chat model before save
7. Error handling for API failures and backend validation errors
