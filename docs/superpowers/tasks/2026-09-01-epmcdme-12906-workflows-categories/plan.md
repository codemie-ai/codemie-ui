# EPMCDME-12906 — Workflow Categories: Form Field + Sidebar Filter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Categories multi-select field to the workflow create/edit form and un-gate the Categories filter in My Workflows / All Workflows sidebars.

**Architecture:** Reuse `MarketplaceCategories` (already handles loading, max-3 enforcement, tooltip options) and `assistantsStore.assistantCategories` — both already wired in the marketplace scope. The filter guard and data-loading call for `my`/`all` scopes are the only sidebar changes. The form requires schema, state, and render additions across two code paths (text-editor and visual editor).

**Tech Stack:** React 18, TypeScript 5, react-hook-form + Yup, Valtio, Vitest + RTL.

**Spec:** `docs/superpowers/tasks/2026-09-01-epmcdme-12906-workflows-categories/spec.md`

## Global Constraints

- `categories` field is optional (0–3 items); submitting zero selections must send `[]` not `undefined`.
- `MarketplaceCategories` is the only categories UI component — no new component.
- `assistantsStore` is the sole data source — no new store.
- `favorites` scope stays gated — do not touch it.
- No server-side changes — API contract is assumed complete.

Commit per task using the repository's existing convention (`EPMCDME-12906: <message>`).

---

### Task 1: Extend type and schema with `categories`

**Files:**
- Modify: `src/types/entity/workflow.ts:32-47`
- Modify: `src/pages/workflows/components/workflowSchema.ts:24-58`

**Interfaces:**
- Produces: `Workflow.categories?: string[]`; `WorkflowFormValues.categories?: string[]`; `baseWorkflowSchema` accepts `categories` array 0–3 items, defaults to `[]`

**Test-first: yes — Yup `baseWorkflowSchema` validates/rejects categories values correctly**

- [ ] **Step 1: Write the failing test**

  In `src/pages/workflows/components/__tests__/workflowSchema.test.ts` (new file):

  ```ts
  import { describe, it, expect } from 'vitest'
  import { baseWorkflowSchema } from '../workflowSchema'

  const base = { name: 'w' }

  describe('baseWorkflowSchema categories', () => {
    it('defaults categories to [] when omitted', async () => {
      const result = await baseWorkflowSchema.validate(base)
      expect(result.categories).toEqual([])
    })
    it('accepts 0 categories', async () => {
      await expect(baseWorkflowSchema.validate({ ...base, categories: [] })).resolves.toBeTruthy()
    })
    it('accepts up to 3 categories', async () => {
      await expect(
        baseWorkflowSchema.validate({ ...base, categories: ['a', 'b', 'c'] })
      ).resolves.toBeTruthy()
    })
    it('rejects more than 3 categories', async () => {
      await expect(
        baseWorkflowSchema.validate({ ...base, categories: ['a', 'b', 'c', 'd'] })
      ).rejects.toThrow()
    })
  })
  ```

- [ ] **Step 2: Run test — expect failure** (`npx vitest run --project unit src/pages/workflows/components/__tests__/workflowSchema.test.ts`)

- [ ] **Step 3: Add `categories?: string[]` to `Workflow` interface**

  `src/types/entity/workflow.ts:32-47` — add after `start_hint?: string | null`:
  ```ts
  categories?: string[]
  ```

- [ ] **Step 4: Extend `WorkflowFormValues` and `baseWorkflowSchema`**

  `src/pages/workflows/components/workflowSchema.ts:24-58`:
  - In `baseWorkflowSchema.shape({…})` add:
    ```ts
    categories: Yup.array()
      .of(Yup.string().required())
      .max(3, 'Maximum 3 categories')
      .optional()
      .default([]),
    ```
  - In `WorkflowFormValues` interface add:
    ```ts
    categories?: string[]
    ```

- [ ] **Step 5: Run test — expect pass**

- [ ] **Step 6: Commit** (`EPMCDME-12906: add categories to Workflow type and baseWorkflowSchema`)

---

### Task 2: Categories field in the text-editor form path

**Files:**
- Modify: `src/pages/workflows/components/WorkflowFormFields.tsx:86-96` (defaultValues), `274-289` (after icon_url block)
- Modify: `src/pages/workflows/components/WorkflowForm.tsx:96-104` (state), `123-135` (getCurrentValues non-visual branch), `140-153` (getCurrentValues visual-new branch)
- Modify: `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx`

**Interfaces:**
- Consumes: `WorkflowFormValues.categories` (Task 1); `MarketplaceCategories` from `@/pages/assistants/components/AssistantForm/components/MarketplaceCategories`
- Produces: `WorkflowFormFieldsRef.getValues()` includes `categories`; `WorkflowForm.workflowFields` includes `categories`

**Test-first: yes — `WorkflowFormFields` renders the categories field and `getValues()` returns `categories`**

- [ ] **Step 1: Write the failing test**

  Add to `WorkflowFormFields.test.tsx` (after existing mocks, add mock for `MarketplaceCategories`):

  ```ts
  vi.mock(
    '@/pages/assistants/components/AssistantForm/components/MarketplaceCategories',
    () => ({ default: () => <div data-testid="marketplace-categories" /> })
  )
  ```

  Add test:

  ```ts
  describe('WorkflowFormFields — categories field', () => {
    beforeEach(() => {
      mockHasUserIntegrationInYamlConfig.mockReturnValue(false)
    })

    it('renders MarketplaceCategories field', () => {
      renderWorkflowFormFields({ workflow: {} })
      expect(screen.getByTestId('marketplace-categories')).toBeInTheDocument()
    })

    it('getValues includes categories from workflow prop', async () => {
      const ref = createRef<WorkflowFormFieldsRef>()
      render(<WorkflowFormFields ref={ref} workflow={{ categories: ['cat-1'] }} />)
      await waitFor(() => {
        const values = ref.current?.getValues()
        expect(values?.categories).toEqual(['cat-1'])
      })
    })
  })
  ```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Update `WorkflowFormFields.tsx` defaultValues and render**

  `WorkflowFormFields.tsx:86-95` — in `useForm` `defaultValues`, add:
  ```ts
  categories: workflow?.categories ?? [],
  ```

  `WorkflowFormFields.tsx` after the `icon_url` Controller block (after line 288, inside the `!onlyConfiguration` fragment):
  ```tsx
  <div className="flex flex-col gap-2">
    <Controller
      name="categories"
      control={control}
      render={({ field }) => (
        <MarketplaceCategories
          value={field.value ?? []}
          onChange={field.onChange}
        />
      )}
    />
  </div>
  ```

  Add import at top of file:
  ```ts
  import MarketplaceCategories from '@/pages/assistants/components/AssistantForm/components/MarketplaceCategories'
  ```

- [ ] **Step 4: Update `WorkflowForm.tsx` state and getCurrentValues**

  `WorkflowForm.tsx:96-104` — `workflowFields` initial state, add:
  ```ts
  categories: workflow?.categories ?? [],
  ```

  `WorkflowForm.tsx:123-135` — non-visual `getCurrentValues` branch `workflowFields` reconstruction, add:
  ```ts
  categories: formValues?.categories ?? [],
  ```

  `WorkflowForm.tsx:140-153` — visual-editor new-workflow branch defaults, add:
  ```ts
  categories: [],
  ```

- [ ] **Step 5: Run test — expect pass**

- [ ] **Step 6: Commit** (`EPMCDME-12906: add categories field to workflow text-editor form path`)

---

### Task 3: Categories field in the visual editor path

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/GeneralConfigTab.tsx:62-70` (defaultValues), `203-217` (after icon_url block)

**Interfaces:**
- Consumes: `WorkflowFormValues.categories` (Task 1); `MarketplaceCategories`
- Produces: `GeneralConfigTab` `getValues()` returns `categories`; `ConfigPanel.getWorkflowFields()` includes `categories`

**Test-first: yes — `GeneralConfigTab` renders `MarketplaceCategories` and `getValues()` returns `categories`**

- [ ] **Step 1: Write the failing test**

  Create `src/pages/workflows/editor/configPanels/__tests__/GeneralConfigTab.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { createRef } from 'react'
  import { describe, it, expect, vi } from 'vitest'
  import GeneralConfigTab from '../GeneralConfigTab'

  vi.mock('valtio', () => ({ useSnapshot: vi.fn((s) => s) }))
  vi.mock('@/store/settings', () => ({
    settingsStore: { settings: {}, indexSettings: vi.fn() },
  }))
  vi.mock('@/utils/workflows', () => ({
    hasUserIntegrationInYamlConfig: () => false,
  }))
  vi.mock('@/components/ProjectSelector', () => ({
    default: (props: any) => <input data-testid="project-selector" {...props} />,
  }))
  vi.mock('@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel', () => ({
    default: () => <div data-testid="guardrail-panel" />,
  }))
  vi.mock(
    '@/pages/assistants/components/AssistantForm/components/MarketplaceCategories',
    () => ({ default: () => <div data-testid="marketplace-categories" /> })
  )
  vi.mock('./components/TabFooter', () => ({ default: () => null }))

  describe('GeneralConfigTab — categories', () => {
    it('renders MarketplaceCategories', () => {
      render(<GeneralConfigTab onClose={vi.fn()} />)
      expect(screen.getByTestId('marketplace-categories')).toBeInTheDocument()
    })

    it('getValues returns categories from defaultValues', async () => {
      const ref = createRef<any>()
      render(
        <GeneralConfigTab
          ref={ref}
          defaultValues={{ name: 'w', categories: ['cat-1'] }}
          onClose={vi.fn()}
        />
      )
      const values = ref.current?.getValues()
      expect(values?.categories).toEqual(['cat-1'])
    })
  })
  ```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Update `GeneralConfigTab.tsx` defaultValues and render**

  `GeneralConfigTab.tsx:62-70` — in `useForm` `defaultValues`, add:
  ```ts
  categories: defaultValues.categories ?? [],
  ```

  After the `icon_url` Controller block (after line ~217, before the `GuardrailAssignmentPanel`):
  ```tsx
  <div className="flex flex-col gap-2">
    <Controller
      name="categories"
      control={control}
      render={({ field }) => (
        <MarketplaceCategories
          value={field.value ?? []}
          onChange={field.onChange}
        />
      )}
    />
  </div>
  ```

  Add import:
  ```ts
  import MarketplaceCategories from '@/pages/assistants/components/AssistantForm/components/MarketplaceCategories'
  ```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit** (`EPMCDME-12906: add categories field to visual editor GeneralConfigTab`)

---

### Task 4: Un-gate categories filter for My/All Workflows sidebar

**Files:**
- Modify: `src/pages/workflows/components/WorkflowsFilters.tsx:127-141` (useEffect), `228-242` (filter predicate)
- Modify: `src/pages/workflows/components/__tests__/WorkflowsFilters.test.tsx`

**Interfaces:**
- Consumes: `assistantsStore.getAssistantCategories()`, `assistantsStore.assistantCategories`
- Produces: categories filter visible in `filterDefinitions` for `my` and `all` scopes; `getAssistantCategories()` called for those scopes

**Test-first: yes — categories filter definition appears for `my` and `all` scopes; absent for `favorites`**

- [ ] **Step 1: Write the failing tests**

  Add to `WorkflowsFilters.test.tsx`:

  ```ts
  import { assistantsStore } from '@/store'

  // Helper — captures filterDefinitions from the Filters mock
  let capturedFilterDefs: any[] = []
  // Update the existing Filters mock to also capture filterDefinitions:
  // vi.mock('@/components/Filters', () => ({
  //   default: ({ filterDefinitions }: { filterDefinitions: any[] }) => {
  //     capturedFilterDefs = filterDefinitions ?? []
  //     ...existing mock body...
  //   },
  // }))
  ```

  Update the `vi.mock('@/components/Filters', ...)` already present so its mock function also assigns `capturedFilterDefs = filterDefinitions ?? []` before returning null.

  ```ts
  describe('WorkflowsFilters — categories filter visibility', () => {
    beforeEach(() => {
      capturedFilterDefs = []
      vi.clearAllMocks()
    })

    it('shows categories filter for "my" scope', async () => {
      await act(async () => { render(<WorkflowsFilters scope="my" />) })
      expect(capturedFilterDefs.some((d: any) => d.name === 'categories')).toBe(true)
    })

    it('shows categories filter for "all" scope', async () => {
      await act(async () => { render(<WorkflowsFilters scope="all" />) })
      expect(capturedFilterDefs.some((d: any) => d.name === 'categories')).toBe(true)
    })

    it('hides categories filter for "favorites" scope', async () => {
      await act(async () => { render(<WorkflowsFilters scope="favorites" />) })
      expect(capturedFilterDefs.some((d: any) => d.name === 'categories')).toBe(false)
    })

    it('calls getAssistantCategories for "my" scope', async () => {
      await act(async () => { render(<WorkflowsFilters scope="my" />) })
      expect(assistantsStore.getAssistantCategories).toHaveBeenCalled()
    })

    it('calls getAssistantCategories for "all" scope', async () => {
      await act(async () => { render(<WorkflowsFilters scope="all" />) })
      expect(assistantsStore.getAssistantCategories).toHaveBeenCalled()
    })
  })
  ```

- [ ] **Step 2: Run tests — expect failure**

- [ ] **Step 3: Remove categories guard for `my`/`all` in the filter predicate**

  `WorkflowsFilters.tsx:235-237` — replace:
  ```ts
  if (definition.name === 'categories') {
    return false
  }
  ```
  with:
  ```ts
  if (definition.name === 'categories' && scope === WORKFLOW_LIST_SCOPE.FAVORITES) {
    return false
  }
  ```

- [ ] **Step 4: Add `getAssistantCategories()` call for `my`/`all` scopes**

  `WorkflowsFilters.tsx:127-141` — in the `else` branch (non-marketplace, non-templates), add before `loadProjectOptions`:
  ```ts
  if (scope === WORKFLOW_LIST_SCOPE.MY || scope === WORKFLOW_LIST_SCOPE.ALL) {
    assistantsStore.getAssistantCategories()
  }
  ```

- [ ] **Step 5: Run tests — expect pass**

- [ ] **Step 6: Commit** (`EPMCDME-12906: un-gate categories filter for my/all workflow scopes`)

---

## Self-Review

**Spec coverage:**
- AC1 (field below icon_url): ✓ Task 2 + Task 3 both add `MarketplaceCategories` after icon_url block.
- AC2 (optional, max 3): ✓ Task 1 Yup schema `.default([]).max(3)`; `MarketplaceCategories` enforces max-3 UI inline.
- AC3 (pre-populated on edit): ✓ `defaultValues: { categories: workflow?.categories ?? [] }` in Tasks 2 and 3.
- AC4 (categories in POST/PUT payload): ✓ Task 2 adds to `getFormValues()` both paths; Task 1 schema `.default([])` ensures empty array not `undefined`.
- AC5/6 (My/All sidebar filter): ✓ Task 4 un-gates and loads data for both scopes.
- AC7/8 (filter narrows/restores list): ✓ No store change needed; `workflowsStore.indexWorkflows` already serialises `workflowsFilters.categories` (per analysis §Workflow store — filters already wired).
- AC9 (visual editor persists categories): ✓ Task 3 adds field to `GeneralConfigTab`; `ConfigPanel.getWorkflowFields()` delegates to `GeneralConfigTab.getValues()` automatically.

**Negative constraints:**
- "Not adding categories filter to favorites scope" — Task 4 guard preserves the `favorites` gate. ✓
- "Not creating a new categories store" — all tasks use `assistantsStore`. ✓
- "Not displaying category chips on workflow cards" — no task renders categories outside form/filter. ✓
- "Not using `CategoriesField` wrapper (isAIGenerated is assistant-only)" — both Tasks 2/3 import `MarketplaceCategories` directly. ✓
- "No server-side changes" — no task touches the API layer or store serialisation. ✓

**Placeholder scan:** None found.

**Type consistency:** `categories?: string[]` defined once in Task 1; used by the same name in Tasks 2, 3, 4. `MarketplaceCategories` props `value`/`onChange` are the component's existing public interface.
