# EPMCDME-15905: Show routing models on the project Models tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, per sdlc-light Stage 4) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project details Models tab checklist show the routing models ("Claude Router Standard v1", "Claude Router Premium v1", "GPT Router Standard v1"), consistent with the project assistant chat's model dropdown, without affecting the default-model selector dropdowns in the same tab.

**Architecture:** `ProjectModelsSection.tsx` already builds a `platformCatalog` that includes routers (merged in via `routerToModelOption`), then discards them with `getConfigurableModels` before the data reaches `ModelConfigurationTable` (the checklist) and `DefaultModelsSelector`. The fix splits that single discard into two purpose-built lists: a new `getChecklistModels` (models + routers, deduplicated by `.value`) feeds the checklist, while the existing `getConfigurableModels` (unchanged, routers excluded) keeps feeding the default-model picker. Router rows become checkable in the checklist exactly like regular models — `settingsToSelection`/`selectionToSettings`/`isModelAvailable` already operate generically on `ModelOption[]`/`.value` keys, so no changes are needed there. `ModelConfigurationTable.tsx` is already prop-driven and router-agnostic, so it needs no changes.

**Tech Stack:** React 18, TypeScript 5, Vitest + React Testing Library (`unit` project), Valtio (`appInfoStore`, read via `useSnapshot`/direct access).

**Spec:** None (sdlc-light flow — plan is grounded directly in `docs/superpowers/tasks/2026-10-13-project-no-routing-models/technical-analysis.md` and the ticket's acceptance criteria). Scope decisions confirmed with the user:
- Fix the model checklist (`ModelConfigurationTable`) only. `DefaultModelsSelector.tsx` dropdowns stay router-free (out of scope).
- Router rows in the checklist are independently checkable, exactly like regular models (not a read-only/governance-text row).

## Global Constraints

- Preserve the `auto_routing_enabled` governance field and existing `ProjectModelSettings` shape — this fix is about checklist *visibility*, not a new settings field.
- No new store, API call, or component layer — reuse `appInfoStore.llmRouters` / `routerToModelOption`, already-exposed in `ProjectModelsSection.tsx`.
- Follow existing code conventions: `??` over `||`, `useSnapshot` for store reads (unaffected here — `catalog` state is already a plain `useState`, not a store read).
- Don't hardcode real backend router names ("Claude Router Standard v1", etc.) in tests — use the existing generic fixture convention (`'Router'`, `'Smart Router'`, etc.).

## Review Focus

- A router and a regular model sharing the same `.value` must not render as two checklist rows — `getChecklistModels` must dedupe (AC3). Covered in Task 1.
- The default-model selector/dropdown must still exclude routers after the change (scope decision) — covered by an assertion in Task 2 that `DefaultModelsSelector` never receives a router-flagged option.
- The "`X` of `Y` models available" badge must count the full checklist (including routers) consistently — a stale count here would silently contradict the visible rows. Covered in Task 2.
- Saving the checklist (`Apply changes`) must persist a toggled-off router the same way a toggled-off regular model is persisted (allow-list membership), proving routers are genuinely checkable, not just rendered. Covered in Task 2.
- Toggling a router off must not corrupt the default-model validity check (`defaultModelError`), since default-model eligibility is intentionally still routed through the router-free list. Already covered by existing tests in Task 2 (unchanged assertions double as regression coverage once lists are split).

---

### Task 1: Add `getChecklistModels` (deduplicated models+routers list)

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts`
- Test: `src/pages/settings/administration/projectsManagement/components/__tests__/projectModelConfiguration.test.ts`

**Interfaces:**
- Produces: `getChecklistModels(models: readonly ModelOption[]): ModelOption[]` — returns every entry (models and routers alike) in input order, keeping only the first occurrence of each `.value`. Consumed by Task 2.
- Consumes: nothing new (`ModelOption` type already imported in this file).

Test-first: yes — "includes routers in the checklist, deduplicated by value" and "keeps the first entry when a model and router share the same value" must fail before `getChecklistModels` exists.

- [ ] **Step 1: Write the failing tests**

Add to `src/pages/settings/administration/projectsManagement/components/__tests__/projectModelConfiguration.test.ts`, inside the existing `describe('projectModelConfiguration', ...)` block, and add `getChecklistModels` to the import list from `../projectModelConfiguration`:

```ts
import {
  describeRouterAvailability,
  getChecklistModels,
  getConfigurableModels,
  getNewModelsPolicy,
  getRouterModels,
  isModelAvailable,
  selectionToSettings,
  settingsToSelection,
} from '../projectModelConfiguration'
```

```ts
  it('includes routers in the checklist alongside regular models', () => {
    const models = [...MODELS, model('router', { isRouter: true })]

    expect(getChecklistModels(models).map((m) => m.value)).toEqual([
      'a',
      'b',
      'premium',
      'router',
    ])
  })

  it('keeps only the first entry when a model and router share the same value', () => {
    const models = [model('shared'), model('shared', { isRouter: true })]

    expect(getChecklistModels(models)).toEqual([model('shared')])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/projectModelConfiguration.test.ts`
Expected: FAIL — `getChecklistModels` is not exported / is not a function.

- [ ] **Step 3: Implement `getChecklistModels`**

In `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts`, update the comment above `getConfigurableModels` (it no longer describes the checklist) and add the new function directly below it:

```ts
/** Candidates eligible to become the project's default model; routers can't be a default. */
export const getConfigurableModels = (models: readonly ModelOption[]) =>
  models.filter((model) => !model.isRouter)

export const getRouterModels = (models: readonly ModelOption[]) =>
  models.filter((model) => model.isRouter)

/** Every entry shown in the model checklist — models and routers together, listed once each. */
export const getChecklistModels = (models: readonly ModelOption[]): ModelOption[] => {
  const seen = new Set<string>()
  return models.filter((model) => {
    if (seen.has(model.value)) return false
    seen.add(model.value)
    return true
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/projectModelConfiguration.test.ts`
Expected: PASS (all tests in the file, including the two new ones). Also rename the pre-existing test title from `'separates routers from the configurable checklist'` to `'separates routers from the default-model candidates'` (its assertions are unchanged — `getConfigurableModels`/`getRouterModels` behavior stays the same — only the title was describing the now-reassigned "checklist" role).

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts src/pages/settings/administration/projectsManagement/components/__tests__/projectModelConfiguration.test.ts
git commit -m "EPMCDME-15905: add getChecklistModels to merge models and routers for the checklist"
```

---

### Task 2: Feed the checklist (not the default-model picker) with routers

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx`
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx`

**Interfaces:**
- Consumes: `getChecklistModels` from Task 1 (`./components/projectModelConfiguration`); existing `getConfigurableModels`, `isModelAvailable`, `selectionToSettings`, `settingsToSelection` (unchanged signatures); existing `ModelConfigurationTable` (`models: ModelOption[]` prop, unchanged) and `DefaultModelsSelector` (`models: ModelOption[]` prop, unchanged).
- Produces: no new exports — this is the top-level section component.

Test-first: yes — "shows all models and routers available" (replacing the old "concrete models" count), "persists a toggled router in the saved allow list", and "keeps the default-model picker router-free" must fail (or assert the old, buggy behavior) before the component change.

- [ ] **Step 1: Write/update the failing tests**

In `src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx`:

1. Add `within` to the `@testing-library/react` import:

```ts
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
```

2. Add a lightweight mock for `DefaultModelsSelector` right after the existing `ModelConfigurationTable` mock, so the model list it receives (and whether the error text renders) is directly observable without exercising the real `<Select>` widget:

```ts
vi.mock('../components/DefaultModelsSelector', () => ({
  default: ({ models, defaultModelError }: any) => (
    <div>
      <ul data-testid="default-model-options">
        {models.map((model: ModelOption) => (
          <li key={model.value}>{model.value}</li>
        ))}
      </ul>
      {defaultModelError && <p>{defaultModelError}</p>}
    </div>
  ),
}))
```

3. Replace the first test and update the "saves a disabled model..." test's expectation, then add three new tests. The mocked `ModelConfigurationTable` already renders one button per model it's given (`{value}:{on|off}`), so a rendered `'router:on'` button is direct proof the checklist received the router.

Replace:

```ts
  it('counts the concrete models available to the project', async () => {
    await renderSection()

    expect(screen.getByText('3 of 3 models available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled()
  })
```

with:

```ts
  it('counts all models and routers available to the project', async () => {
    await renderSection()

    expect(screen.getByText('4 of 4 models available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled()
  })

  it('shows the router in the checklist exactly once, enabled by default', async () => {
    await renderSection()

    expect(screen.getAllByRole('button', { name: 'router:on' })).toHaveLength(1)
  })

  it('persists a toggled-off router in the saved allow list, same as a regular model', async () => {
    await renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'router:on' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() => expect(mockSettingsStore.saveSettings).toHaveBeenCalled())
    const [, saved] = mockSettingsStore.saveSettings.mock.calls[0]
    expect(saved).toMatchObject({ mode: 'allow_list', models: ['model-a', 'model-b', 'premium'] })
  })

  it('keeps the default-model picker router-free', async () => {
    await renderSection()

    const defaultModelOptions = within(screen.getByTestId('default-model-options')).getAllByRole(
      'listitem'
    )
    expect(defaultModelOptions.map((el) => el.textContent)).toEqual([
      'model-a',
      'model-b',
      'premium',
    ])
  })
```

Also update the existing "saves a disabled model as an explicit allow list and keeps member overrides" test's assertion, since the router is now part of the checklist and defaults to enabled, so it is included in the saved allow list alongside the other enabled models:

```ts
    expect(saved).toMatchObject({
      mode: 'allow_list',
      models: ['model-a', 'premium', 'router'],
      default_model: null,
    })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx`
Expected: FAIL — `'4 of 4 models available'` not found (still shows `'3 of 3...'`), no `router:on` button rendered, saved allow list missing `'router'`.

- [ ] **Step 3: Split the model lists in `ProjectModelsSection.tsx`**

Update the import to add `getChecklistModels`:

```ts
import {
  getChecklistModels,
  getConfigurableModels,
  isModelAvailable,
  ProjectModelSetting,
  selectionToSettings,
  settingsToSelection,
} from './components/projectModelConfiguration'
```

Replace the single `models` memo and its dependent `globalDefaultModel` memo:

```ts
  const defaultModelCandidates = useMemo(() => getConfigurableModels(catalog), [catalog])
  const checklistModels = useMemo(() => getChecklistModels(catalog), [catalog])
  const globalDefaultModel = useMemo(
    () =>
      defaultModelCandidates.find((model) => model.isDefault)?.value ??
      defaultModelCandidates[0]?.value ??
      '',
    [defaultModelCandidates]
  )
```

In the data-loading `useEffect`, build both lists and use the checklist one for the initial draft:

```ts
      .then(([availableModels, settings]) => {
        if (cancelled) return
        // getLLMModels lists concrete models only; routers live beside them in the store.
        const platformCatalog = [
          ...availableModels,
          ...appInfoStore.llmRouters.map(routerToModelOption),
        ]
        const configurable = getConfigurableModels(platformCatalog)
        const checklist = getChecklistModels(platformCatalog)
        const globalDefault =
          configurable.find((model) => model.isDefault)?.value ?? configurable[0]?.value ?? ''
        const nextDraft = toDraft(settings, checklist, globalDefault)
        setCatalog(platformCatalog)
        setSavedSettings(settings)
        setDraft(nextDraft)
        setInitialDraft(nextDraft)
      })
```

Update `defaultsDraft` and `availableModels` (the latter stays router-free, feeding `DefaultModelsSelector`), and add the checklist-wide available count for the badge:

```ts
  const hasChanges = !!draft && !!initialDraft && !isSameDraft(draft, initialDraft)
  const defaultsDraft = useMemo(
    () => toDraft(DEFAULT_PROJECT_MODEL_SETTINGS, checklistModels, globalDefaultModel),
    [globalDefaultModel, checklistModels]
  )
  const isAtDefaults = !!draft && isSameDraft(draft, defaultsDraft)
  const availableModels = draft
    ? defaultModelCandidates.filter((model) => isModelAvailable(model, draft.selection, false))
    : []
  const checklistAvailableCount = draft
    ? checklistModels.filter((model) => isModelAvailable(model, draft.selection, false)).length
    : 0
  const defaultIsValid = availableModels.some((model) => model.value === draft?.defaultModel)
  const defaultModelError =
    !defaultIsValid && draft?.defaultModel ? 'Selected model is not available' : undefined
```

Update the badge JSX to use the new checklist-wide counts:

```tsx
              <span className="text-xs text-text-quaternary">
                {checklistAvailableCount} of {checklistModels.length} models available
              </span>
```

Update `saveChanges` to rebuild the draft from `checklistModels` (not the old `models`):

```ts
      const saved = await projectModelSettingsStore.saveSettings(projectName, nextSettings)
      const savedDraft = toDraft(saved, checklistModels, globalDefaultModel)
```

Update the `ModelConfigurationTable` usage to pass the checklist (routers included):

```tsx
      <ModelConfigurationTable
        models={checklistModels}
        getSelectionState={(model) =>
          isModelAvailable(model, draft.selection, false) ? 'checked' : 'unchecked'
        }
        getDisabledReason={() => undefined}
        onSelectionChange={setModelEnabled}
      />
```

(`DefaultModelsSelector` keeps receiving `models={availableModels}`, unchanged — it is now sourced from `defaultModelCandidates`, which still excludes routers.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx`
Expected: PASS — all tests in the file, including the four new/updated assertions.

- [ ] **Step 5: Run the full affected test files together**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement`
Expected: PASS — no regressions in sibling tests under this directory (e.g. `ModelConfigurationTable`, `DefaultModelsSelector` tests, if any, are untouched and still pass).

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx
git commit -m "EPMCDME-15905: show routing models in the project Models tab checklist"
```

---

## Post-implementation checks (Stage 5/6, not a plan task)

- `npm run lint` / `npm run type-check` per `.ai-run/guides/quality-gates.md` — not run as a plan step; covered by `qa-gates` at sdlc-light Stage 6.
- No change to `DefaultModelsSelector.tsx`, `ModelConfigurationTable.tsx`, `src/store/appInfo.ts`, or `src/utils/routerToModelOption.ts` — confirmed by this plan's file list; any diff touching those files during implementation is out of scope and should be reverted, not kept.
