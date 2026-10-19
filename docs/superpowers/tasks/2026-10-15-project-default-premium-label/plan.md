# Project Default Model Premium Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a "Premium" label on premium models inside the "Project default model" and "CLI default model" dropdowns in project settings, and a quiet note under either field when its currently selected model is premium.

**Architecture:** `isPremium` already flows unmodified from `appInfoStore` through `ProjectModelsSection.tsx`, but `DefaultModelsSelector.tsx`'s `modelOptions` memo drops it before building dropdown options — that is the entire bug. Fix it by (1) letting `isPremium` pass through to the options array, (2) adding an optional `itemTemplate` render prop to the shared `Select` component so dropdown rows can show a "Premium" meta-line, and (3) rendering a text note + link under either field when its selected model is premium, mirroring the already-shipped `LLMSelector.tsx` pattern.

**Tech Stack:** React 18, TypeScript 5, PrimeReact `Dropdown` (via the shared `Select` wrapper), Tailwind, Vitest + React Testing Library, react-router `Link`.

**Spec:** None — `sdlc-light` run, no `spec.md`. Source of truth is Jira EPMCDME-15973 and `docs/superpowers/tasks/2026-10-15-project-default-premium-label/technical-analysis.md`.

## Clarification assumptions

Resolved with the user during the Stage 2 clarity check (both "Recommended" options chosen):

- **Dropdown row labeling:** extend the shared `Select` component (`src/components/form/Select/Select.tsx`) with a new optional per-row render prop, `itemTemplate`, rather than migrating `DefaultModelsSelector` to `MultiSelect`. The prop is optional and additive — every existing `Select` consumer that doesn't pass it keeps the current `OptionTemplate` behavior unchanged.
- **Selected-value highlight:** use the "text note + link" pattern from `LLMSelector.tsx` — a quiet "Premium model" note with a `TooltipButton` and a "View models and rates" link under the field — not the `PremiumModelBadge` pill pattern. No ring/border highlight is added to the trigger (this is explicitly disallowed by existing precedent in `LLMSelector.premiumLayout.test.tsx`).

## Global Constraints

- AC7: the set of models in each dropdown and the default-model selection/onChange logic must not change — every change here is additive (new optional prop, new passthrough field, new conditionally-rendered note).
- No backend, API, store, or `src/types/entity/configuration.ts` changes — `ModelOption.isPremium` already exists and already reaches `DefaultModelsSelector` via its `models` prop.
- Reuse existing primitives rather than inventing new ones: `PREMIUM_MODEL_TOOLTIP` and `TooltipButton` from the existing premium-note pattern, `HELP_MODELS_ROUTE` from `@/pages/help/ModelsCatalog`, `cn()` for conditional classes.
- Tests use `data-testid` hooks, not class-name assertions, matching the rest of the premium-indicator test suite (`llm-option-meta`, `llm-selector-premium-note`).
- Any component this plan renders inside a `Link` must be wrapped in `MemoryRouter` in its test, per the existing `LLMSelector.premiumLayout.test.tsx` convention.

## Review Focus

- A model with `isPremium: false` or `isPremium: undefined` must render with no "Premium" text anywhere in its row and no highlight note when selected (AC3, AC6) — easy to get backwards with a falsy-check bug.
- The "Project default model" and "CLI default model" fields are independent: selecting a premium model as one must not show a note under the other (AC4/AC5 are per-field, not global).
- Existing `Select` consumers elsewhere in the app (it is a shared primitive) must keep rendering their rows exactly as before when they don't pass `itemTemplate` — covered by the existing `Select.test.tsx` suite continuing to pass unmodified, plus a new explicit fallback test.
- A model whose `label` is long must not break the new row layout (no overflow/clipping regression) — reuse the existing `truncate` Tailwind class on the label span.
- Switching the selected value from a premium to a non-premium model (or back) must toggle the note on/off reactively, not just on first render — `localDefaultModel`/`localCodeDefaultModel` already drive `onChangeValue`, so the premium lookup must be derived from the same state, not computed once.

---

### Task 1: Add an optional `itemTemplate` render prop to the shared `Select` component

**Files:**
- Modify: `src/types/filters.ts` (add `isPremium?: boolean` to `FilterOption`)
- Modify: `src/components/form/Select/Select.tsx`
- Test: `src/components/form/Select/__tests__/Select.test.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks (this is the foundation task).
- Produces: `SelectProps.itemTemplate?: (option: FilterOption) => ReactNode` — later tasks (Task 3) pass a function here to render the "Premium" meta-line. `FilterOption.isPremium?: boolean` — later tasks populate this field on the options array they build.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/form/Select/__tests__/Select.test.tsx` (new `describe` block, after the existing `error association` block, still inside the top-level `describe('Select', ...)`):

```tsx
import { fireEvent } from '@testing-library/react'
```

(add this import alongside the existing `render, screen` import from `@testing-library/react`)

```tsx
describe('custom item rendering', () => {
  it('uses itemTemplate to render each option row when provided', () => {
    const { container } = render(
      <Select
        id="project"
        name="project"
        value={null}
        options={options}
        onChange={noop}
        itemTemplate={(option) => <span data-testid="custom-row">{option.label}-custom</span>}
      />
    )

    fireEvent.click(container.querySelector('.p-dropdown')!)

    const rows = screen.getAllByTestId('custom-row')
    expect(rows.map((row) => row.textContent)).toEqual(['Option A-custom', 'Option B-custom'])
  })

  it('falls back to the default truncating row when itemTemplate is not provided', () => {
    const { container } = render(
      <Select id="project" name="project" value={null} options={options} onChange={noop} />
    )

    fireEvent.click(container.querySelector('.p-dropdown')!)

    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.queryByTestId('custom-row')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/components/form/Select/__tests__/Select.test.tsx`
Expected: the two new tests FAIL — `itemTemplate` is not a recognized prop (TypeScript) and/or the custom row never renders because `Select` ignores the prop.

- [ ] **Step 3: Add `isPremium` to `FilterOption`**

In `src/types/filters.ts`, extend the existing interface:

```tsx
export interface FilterOption {
  label: string
  value: string | number | boolean | null
  id?: string
  badge?: string
  isPremium?: boolean
}
```

- [ ] **Step 4: Add the `itemTemplate` prop to `Select`**

In `src/components/form/Select/Select.tsx`:

1. Add to the `SelectProps` interface (alongside the other optional props):

```tsx
  itemTemplate?: (option: FilterOption) => ReactNode
```

2. In the component's destructured props list, add `itemTemplate` next to `valueTemplate`.
3. Rename the existing internal template function from `OptionTemplate` to `DefaultOptionTemplate` (same body, no logic change), then add immediately below it:

```tsx
    const ResolvedOptionTemplate = itemTemplate ?? DefaultOptionTemplate
```

4. In the `<Dropdown ... />` JSX, change `itemTemplate={OptionTemplate}` to `itemTemplate={ResolvedOptionTemplate}`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --project unit src/components/form/Select/__tests__/Select.test.tsx`
Expected: PASS — all tests in the file, including the two new ones and the four pre-existing `error association` tests (unmodified, must stay green).

- [ ] **Step 6: Commit**

```bash
git add src/types/filters.ts src/components/form/Select/Select.tsx src/components/form/Select/__tests__/Select.test.tsx
git commit -m "EPMCDME-15973: Add optional itemTemplate render prop to Select"
```

---

### Task 2: Pass `isPremium` through `DefaultModelsSelector`'s option list and label premium rows

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx`
- Test: `src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx` (new file)

**Interfaces:**
- Consumes: `Select`'s `itemTemplate?: (option: FilterOption) => ReactNode` prop and `FilterOption.isPremium?: boolean` (Task 1).
- Produces: a local `DefaultModelOptionRow` component inside `DefaultModelsSelector.tsx`, rendering `data-testid="default-model-option-meta"` on the "Premium" meta-line, for Task 3 to leave untouched (Task 3 only adds the selected-value note, not the row).

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'

import DefaultModelsSelector from '../DefaultModelsSelector'

const models: ModelOption[] = [
  { label: 'GPT-4o', value: 'gpt-4o', isDefault: true, isPremium: false },
  { label: 'Bedrock Claude Opus 4.5', value: 'bedrock-claude-opus-4-5', isDefault: false, isPremium: true },
]

const renderSelector = () =>
  render(
    <DefaultModelsSelector
      models={models}
      defaultModel="gpt-4o"
      onDefaultChange={vi.fn()}
      codeDefaultModel="gpt-4o"
      onCodeDefaultChange={vi.fn()}
    />
  )

describe('DefaultModelsSelector — premium row label', () => {
  it('shows a Premium meta-line only on the premium option row, in both dropdowns', () => {
    const { container } = renderSelector()
    const dropdowns = container.querySelectorAll('.p-dropdown')

    dropdowns.forEach((dropdown) => {
      fireEvent.click(dropdown)

      const metas = screen.getAllByTestId('default-model-option-meta')
      expect(metas).toHaveLength(1)
      expect(metas[0]).toHaveTextContent('Premium')

      // Close the panel before moving to the next dropdown.
      fireEvent.click(dropdown)
    })
  })

  it('does not render a Premium label for a non-premium option row', () => {
    const { container } = renderSelector()
    fireEvent.click(container.querySelector('.p-dropdown')!)

    const gptRow = screen.getByText('GPT-4o').closest('[data-testid="default-model-option-row"]')
    expect(gptRow?.querySelector('[data-testid="default-model-option-meta"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx`
Expected: FAIL — `default-model-option-meta` / `default-model-option-row` testids don't exist yet; `modelOptions` currently strips `isPremium` so there is nothing to key the label on.

- [ ] **Step 3: Implement the row component and premium passthrough**

In `src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx`, add imports and a local row component above the `DefaultModelsSelector` component:

```tsx
import { FC, useEffect, useMemo, useState } from 'react'

import Select from '@/components/form/Select'
import { FilterOption } from '@/types/filters'
import { ModelOption } from '@/types/entity/configuration'

const DefaultModelOptionRow: FC<{ label: string; isPremium: boolean }> = ({
  label,
  isPremium,
}) => (
  <span data-testid="default-model-option-row" className="flex w-full min-w-0 flex-col text-left">
    <span className="min-w-0 truncate">{label}</span>
    {isPremium && (
      <span data-testid="default-model-option-meta" className="truncate text-xs text-text-tertiary">
        <span className="text-aborted-primary">Premium</span>
      </span>
    )}
  </span>
)

const renderDefaultModelOption = (option: FilterOption) => (
  <DefaultModelOptionRow label={option.label} isPremium={option.isPremium ?? false} />
)
```

Then change the `modelOptions` memo to keep `isPremium`:

```tsx
  const modelOptions = useMemo(
    () =>
      models.map((model) => ({
        label: model.label,
        value: model.value,
        isPremium: model.isPremium,
      })),
    [models]
  )
```

And pass `itemTemplate` to both `<Select>` instances (`project-default-model` and `cli-default-model`):

```tsx
        <Select
          id="project-default-model"
          value={localDefaultModel}
          onChangeValue={(value) => {
            if (value) {
              setLocalDefaultModel(value)
              onDefaultChange(value)
            }
          }}
          options={modelOptions}
          itemTemplate={renderDefaultModelOption}
          placeholder="Select a model"
          rootClassName="w-full"
        />
```

```tsx
        <Select
          id="cli-default-model"
          value={localCodeDefaultModel}
          onChangeValue={(value) => {
            if (value) {
              setLocalCodeDefaultModel(value)
              onCodeDefaultChange(value)
            }
          }}
          options={modelOptions}
          itemTemplate={renderDefaultModelOption}
          placeholder="Select a model"
          rootClassName="w-full"
        />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx
git commit -m "EPMCDME-15973: Label premium models in default-model dropdown rows"
```

---

### Task 3: Highlight the selected default model when it is premium

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx`
- Modify: `src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx`

**Interfaces:**
- Consumes: `PREMIUM_MODEL_TOOLTIP` from `@/components/PremiumModelBadge`, `TooltipButton` from `@/components/TooltipButton`, `HELP_MODELS_ROUTE` from `@/pages/help/ModelsCatalog`, `Link` from `react-router` — all already used for this exact pattern in `LLMSelector.tsx`.
- Produces: a per-field premium note, independently keyed to `localDefaultModel` (testid `project-default-model-premium-note`) and `localCodeDefaultModel` (testid `cli-default-model-premium-note`). Nothing downstream of this task.

- [ ] **Step 1: Write the failing tests**

Add to `src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx` (new imports at top, new `describe` block at the end):

```tsx
import { MemoryRouter } from 'react-router'
```

```tsx
const renderWithRouter = (ui: Parameters<typeof render>[0]) => render(<MemoryRouter>{ui}</MemoryRouter>)
```

```tsx
describe('DefaultModelsSelector — selected-value premium highlight', () => {
  it('shows a Premium note under the Project default model field when it is premium, and not under CLI default model', () => {
    renderWithRouter(
      <DefaultModelsSelector
        models={models}
        defaultModel="bedrock-claude-opus-4-5"
        onDefaultChange={vi.fn()}
        codeDefaultModel="gpt-4o"
        onCodeDefaultChange={vi.fn()}
      />
    )

    expect(screen.getByTestId('project-default-model-premium-note')).toHaveTextContent(
      'Premium model'
    )
    expect(screen.queryByTestId('cli-default-model-premium-note')).not.toBeInTheDocument()
  })

  it('shows a Premium note under the CLI default model field when it is premium, and not under Project default model', () => {
    renderWithRouter(
      <DefaultModelsSelector
        models={models}
        defaultModel="gpt-4o"
        onDefaultChange={vi.fn()}
        codeDefaultModel="bedrock-claude-opus-4-5"
        onCodeDefaultChange={vi.fn()}
      />
    )

    expect(screen.getByTestId('cli-default-model-premium-note')).toHaveTextContent('Premium model')
    expect(screen.queryByTestId('project-default-model-premium-note')).not.toBeInTheDocument()
  })

  it('shows no premium note under either field when both selected models are non-premium', () => {
    renderWithRouter(
      <DefaultModelsSelector
        models={models}
        defaultModel="gpt-4o"
        onDefaultChange={vi.fn()}
        codeDefaultModel="gpt-4o"
        onCodeDefaultChange={vi.fn()}
      />
    )

    expect(screen.queryByTestId('project-default-model-premium-note')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cli-default-model-premium-note')).not.toBeInTheDocument()
  })
})
```

Note: the two tests already added in Task 2 use the plain `render` (no router). Since this task's component now renders a `Link` unconditionally reachable from the tree only when a premium note is shown, and Task 2's fixtures select `gpt-4o` (non-premium) as both defaults, those tests render no `Link` and keep working without a router wrapper. Only this task's new tests, which select the premium model as a default, need `MemoryRouter`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx`
Expected: the three new tests FAIL — no premium note exists yet.

- [ ] **Step 3: Implement the premium note**

In `src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx`, add imports:

```tsx
import { Link } from 'react-router'

import { PREMIUM_MODEL_TOOLTIP } from '@/components/PremiumModelBadge'
import TooltipButton from '@/components/TooltipButton'
import { HELP_MODELS_ROUTE } from '@/pages/help/ModelsCatalog'
```

Add a small local helper above the component (after `renderDefaultModelOption`):

```tsx
const findIsPremium = (models: ModelOption[], value: string): boolean =>
  models.find((model) => model.value === value)?.isPremium ?? false

const PremiumSelectionNote: FC<{ testId: string }> = ({ testId }) => (
  <div className="mt-1 flex items-center self-start text-xs text-text-quaternary">
    <span data-testid={testId}>Premium model</span>
    <TooltipButton className="ml-1" content={PREMIUM_MODEL_TOOLTIP} iconClassName="h-4" />
    <span className="ml-1">·</span>
    <Link
      to={HELP_MODELS_ROUTE}
      className="ml-1 text-aborted-primary hover:text-aborted-primary/80 underline transition-colors"
    >
      View models and rates
    </Link>
  </div>
)
```

Inside the `DefaultModelsSelector` component body, after the `modelOptions` memo, add:

```tsx
  const isDefaultModelPremium = useMemo(
    () => findIsPremium(models, localDefaultModel),
    [models, localDefaultModel]
  )
  const isCodeDefaultModelPremium = useMemo(
    () => findIsPremium(models, localCodeDefaultModel),
    [models, localCodeDefaultModel]
  )
```

Then render the note right after each field's error paragraph. For the "Project default model" field:

```tsx
        {defaultModelError && <p className="mt-1 text-xs text-text-error">{defaultModelError}</p>}
        {isDefaultModelPremium && <PremiumSelectionNote testId="project-default-model-premium-note" />}
```

And for "CLI default model":

```tsx
        {codeDefaultModelError && (
          <p className="mt-1 text-xs text-text-error">{codeDefaultModelError}</p>
        )}
        {isCodeDefaultModelPremium && (
          <PremiumSelectionNote testId="cli-default-model-premium-note" />
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx`
Expected: PASS — all tests in the file (Task 2's and Task 3's).

- [ ] **Step 5: Run the full affected test suite to check for regressions**

Run: `npx vitest run --project unit src/components/form/Select src/pages/settings/administration/projectsManagement`
Expected: PASS — includes `Select.test.tsx`, `DefaultModelsSelector.test.tsx`, `ProjectModelsSection.test.tsx`, `ModelConfigurationTable.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx src/pages/settings/administration/projectsManagement/components/__tests__/DefaultModelsSelector.test.tsx
git commit -m "EPMCDME-15973: Highlight the selected default model when it is premium"
```

---

## Post-implementation checklist (for Stage 5/6 of sdlc-light, not part of TDD tasks)

- Run full `npm run lint`, type-check, and the broader test suite per `.ai-run/guides/quality-gates.md` before code review.
- Confirm AC1–AC7 against the running app in the Model configuration section of project settings (two premium and two non-premium models, both fields) if a UI pass is requested.
