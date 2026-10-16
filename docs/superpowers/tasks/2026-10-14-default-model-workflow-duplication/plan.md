# Default Model Duplication Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the virtual-assistant workflow model dropdown from showing the default model twice, and make sure the synthetic "Default: X" row carries the same Premium/Router labeling as the regular row it replaces.

**Architecture:** `LLMSelector.tsx` builds a flat `options` array for a PrimeReact `MultiSelect`. It currently prepends a synthetic `{label: "Default: X", value}` row (dropping `isPremium`/`isRouter`) and then maps every model — including the default one again — into the same array. The fix filters the default model's value out of the mapped list and copies `isPremium`/`isRouter` onto the synthetic row, so the array has exactly one entry per model everywhere this component is used (workflow `VirtualAssistantForm`, the regular Assistant form, chat's `ChatConfigLlmSelector`).

**Tech Stack:** React 18, TypeScript 5, PrimeReact `MultiSelect`, Vitest + React Testing Library.

**Spec:** EPMCDME-15923 (Jira) — no separate spec.md; ticket text reproduced below. Technical research: `docs/superpowers/tasks/2026-10-14-default-model-workflow-duplication/technical-analysis.md`.

Ticket text:
> When a virtual assistant is configured in a workflow, the model dropdown lists the default model twice. The first entry is "Default: &lt;model name&gt;" and the second is the same model as a regular item. If the default model is a premium model, the "Default: &lt;model name&gt;" entry has no "Premium" label, while the regular entry does.
>
> AC1: default model displayed only once. AC2: default entry clearly marked as default. AC3: Premium label present on the default entry when the default model is premium. AC4: other models keep their labels and are displayed once each. AC5: search does not return duplicated entries.

## Follow-up: default row position (found during code review, Stage 5)

While reviewing the Task 1 fix, the user observed that "Default: X" stops appearing first in the dropdown once a different model is selected and the panel is reopened — because `MultiSelect.tsx`'s own `sortedOptions` (lines 298-308) sorts alphabetically and floats only the *currently selected* value to the top, so a non-default selection displaces the default row back into alphabetical order (under "D"). Confirmed with the user: the default row must always sort first, regardless of what is currently selected (AC2's "clearly marked as the default" is read to include "always visible first", not just labeled).

**Test-first: yes** — `LLMSelector.defaultDedup.test.tsx`, two new tests in describe block `'LLMSelector — default row always sorts first (EPMCDME-15923 follow-up)'`: default row is `rows[0]` when a non-default, alphabetically-earlier model is selected; default row is `rows[0]` with no selection.

Fix: `LLMSelector.tsx`'s `options` useMemo now builds the non-default rows itself (alphabetical sort + the currently-selected value floated to top, replicating `MultiSelect`'s own logic) and passes `preserveOptionOrder={showDefaultRow}` to `MultiSelect` so its generic sort never runs when a default row is pinned at the front. `preserveOptionOrder` is gated on `showDefaultRow` specifically so `allowEmpty` callers (e.g. `ChatConfigLlmSelector`, which has no default row) keep `MultiSelect`'s normal sorting unchanged.

## Global Constraints

- Fix is scoped to the Component layer only (`LLMSelector.tsx`) — no Store/Hook/Backend changes; `isPremium`/`isRouter`/`isDefault` already flow correctly into `models`.
- Preserve the existing design decision that Premium/Router render as a second line under the label, not an inline badge (comment at `LLMSelector.tsx:44-51`) — do not reintroduce a badge.
- `LLMSelector.tsx` is shared by three consumers (`VirtualAssistantForm.tsx`, the regular Assistant form, `ChatConfigLlmSelector.tsx`) — every consumer must keep working; do not special-case the workflow panel.
- `??` preferred over `||` for optional flags, matching the file's existing convention.

## Review Focus

- A default model that is **not** premium or router must still render exactly once with no meta line — a fix that only adds `isPremium`/`isRouter` without also deduplicating would pass a naive "Premium label present" check while still showing two rows.
- Searching the dropdown by the default model's name must return exactly one row, not two (AC5) — PrimeReact's built-in filter matches on `label`, so a stray duplicate anywhere in `options` would resurface here even after the "renders once" test passes.
- A model list where the default model happens to be `models[0]` (fallback path, `defaultLlmModel = defaultModel ?? fallbackModel ?? {}`) must still dedupe correctly — the fallback case uses the same `defaultLlmModel.value`, so filtering by that value must not accidentally rely on `isDefault` being true.
- The non-default models in the same list must keep their own `isPremium`/`isRouter` labels untouched (AC4) — a fix that blanket-copies the default model's flags onto every row, instead of only the synthetic row, would break this.
- The sibling consumers (`ChatConfigLlmSelector.tsx`'s own existing tests, the regular Assistant form's existing `LLMSelector` tests) must keep passing unmodified — the fix lives in shared code and a regression here would be silent until those suites run.

---

## File Structure

- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — fix the `options` `useMemo` (lines 180-206) to dedupe and propagate labels. No new file; the change is small enough that extracting a helper would add indirection without benefit (the whole fix is one `.filter()` call plus three extra object fields), so the plan keeps it inline rather than growing the file's export surface.
- Modify (tests): `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx` — add the default+premium combination this file's existing fixtures deliberately keep apart.
- Create (test): `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx` — dedup and search-dedup assertions (AC1, AC4, AC5), kept in a separate file so the dedup-specific fixtures (which need `isDefault` and `isPremium` on the *same* model, and the fallback-to-`models[0]` path) don't entangle with the premium-layout file's existing describe blocks.

---

### Task 1: Fix the duplicate default-model entry and missing Premium/Router label

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:180-206`
- Test: `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx`
- Test: `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`

**Interfaces:**
- Consumes: `defaultLlmModel: SelectableModel | {}` (existing, `LLMSelector.tsx:174-178`), `models: SelectableModel[]` (existing, `LLMSelector.tsx:161`), `SelectableModel { value, deploymentName?, label, isDefault, isPremium?, isRouter? }` (existing interface, `LLMSelector.tsx:81-88`).
- Produces: `options: Array<{label: string, value: string, isPremium?: boolean, isRouter?: boolean}>` — same shape as today, just deduped and fully labeled. No consumer of `options` outside this file changes shape, so nothing downstream needs updating.

Test-first: yes — four new/extended tests below, written before touching the `useMemo`.

- [ ] **Step 1: Write the failing dedup test file**

Create `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx`:

```tsx
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

import { fireEvent, render as rtlRender, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LLMSelector from '../LLMSelector'

const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmModels: [
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
      { label: 'Bedrock Claude Opus 4.5', value: 'bedrock-claude-opus-4-5', isDefault: true, isPremium: true },
    ],
    llmRouters: [],
    imageGenerationModels: [],
    getLLMModels: vi.fn(),
    getImageGenerationModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockAppInfoStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/hooks/useIsTruncated', () => ({ useIsTruncated: () => false }))

beforeEach(() => {
  mockAppInfoStore.llmModels = [
    { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
    { label: 'Bedrock Claude Opus 4.5', value: 'bedrock-claude-opus-4-5', isDefault: true, isPremium: true },
  ]
})

const openPanel = (props: Partial<Parameters<typeof LLMSelector>[0]> = {}) => {
  const { container } = render(
    <LLMSelector placeholder="Select model" value="bedrock-claude-opus-4-5" onChange={vi.fn()} {...props} />
  )
  fireEvent.click(container.querySelector('.p-multiselect')!)
  return container
}

// AC1 + AC3: the premium default model appears once, and that one row carries
// the Premium label — not split across a label-only "Default:" row and a
// separately-labeled plain row.
describe('LLMSelector — default model dedup (EPMCDME-15923)', () => {
  it('renders the premium default model exactly once, with the Premium label on it', () => {
    openPanel()

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent?.includes('Bedrock Claude Opus 4.5'))

    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('[data-testid="llm-option-meta"]')?.textContent).toBe('Premium')
  })

  it('marks that single row as the default', () => {
    openPanel()

    const row = screen
      .getAllByTestId('llm-option-row')
      .find((r) => r.textContent?.includes('Bedrock Claude Opus 4.5'))!

    expect(row.textContent).toContain('Default')
  })

  // AC4: the non-default model keeps rendering once with no meta line — a fix
  // that dedupes by always stripping isPremium/isRouter from every row, instead
  // of only reshaping the default row, would make this fail by accident.
  it('renders the non-default model exactly once with no Premium/Router label', () => {
    openPanel()

    const rows = screen.getAllByTestId('llm-option-row').filter((row) => row.textContent === 'GPT-4o')
    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('[data-testid="llm-option-meta"]')).toBeNull()
  })

  // AC5: PrimeReact's built-in filter (LLMSelector passes a no-op onFilter, which
  // only turns the search box on) matches against the option label. One row per
  // model means a name search can only ever find one match.
  it('returns exactly one match when searching the dropdown by the default model name', () => {
    openPanel()

    const search = screen.getByPlaceholderText('Search')
    fireEvent.change(search, { target: { value: 'Bedrock Claude Opus' } })

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent?.includes('Bedrock Claude Opus 4.5'))
    expect(rows).toHaveLength(1)
  })

  // Guards the fallback branch: when no model has isDefault: true, defaultLlmModel
  // falls back to models[0] (LLMSelector.tsx:174-178) — dedup must still key off
  // defaultLlmModel.value, not off isDefault, or the fallback row duplicates too.
  it('also dedupes when the default comes from the models[0] fallback (no isDefault: true in the list)', () => {
    mockAppInfoStore.llmModels = [
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
      { label: 'Bedrock Claude Opus 4.5', value: 'bedrock-claude-opus-4-5', isDefault: false, isPremium: true },
    ]

    openPanel({ value: 'gpt-4o' })

    const rows = screen.getAllByTestId('llm-option-row').filter((row) => row.textContent?.includes('GPT-4o'))
    expect(rows).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx`

Expected: FAIL — at least the "exactly once" assertions fail because `rows` currently has length 2, and the "Premium label on it" assertion fails because the default row's meta line is `null` today.

- [ ] **Step 3: Add the default+premium combination to the existing premium-layout test file**

In `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`, add a new `describe` block after the existing `'LLMSelector — premium meta line in option rows'` block (after line 177), using the file's existing `mockAppInfoStore`/`openPanel` fixtures but overriding the model list for just this block so the two existing fixtures (which deliberately never combine `isDefault: true` with `isPremium: true`) stay untouched:

```tsx
// EPMCDME-15923: the one existing fixture set never combines isDefault: true
// with isPremium: true, so this is the first test to pin that exact
// combination — the ticket's reported defect.
describe('LLMSelector — default model that is also premium (EPMCDME-15923)', () => {
  const DEFAULT_PREMIUM_LABEL = 'Bedrock Claude Opus 4.5'
  const DEFAULT_PREMIUM_VALUE = 'bedrock-claude-opus-4-5'

  beforeEach(() => {
    mockAppInfoStore.llmModels = [
      { label: DEFAULT_PREMIUM_LABEL, value: DEFAULT_PREMIUM_VALUE, isDefault: true, isPremium: true },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
    ]
  })

  it('shows the Premium meta line on the single default-model row', () => {
    openPanel()

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent?.includes(DEFAULT_PREMIUM_LABEL))

    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('[data-testid="llm-option-meta"]')?.textContent).toBe('Premium')
  })
})
```

This block's `beforeEach` reassigns `mockAppInfoStore.llmModels`; the outer file has no top-level `beforeEach` that resets it beyond `mockTruncation.isTruncated`, so add a matching reset of `mockAppInfoStore.llmModels` back to the file's original two-model fixture inside this new block's own scope (shown above) — later blocks in the file already set their own values per test via `renderSelector`/`openPanel` calls that don't depend on list order, so no cross-block reset is needed beyond this.

- [ ] **Step 4: Run both test files to verify they fail**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx`

Expected: FAIL on the new assertions (meta line `null` instead of `'Premium'`, duplicate row counts).

- [ ] **Step 5: Fix the `options` `useMemo` in `LLMSelector.tsx`**

Replace lines 180-206 of `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`:

```tsx
    const options = useMemo(
      () => [
        ...(allowEmpty ? [{ label: placeholder, value: '' }] : []),
        ...(!allowEmpty && defaultLlmModel?.value
          ? [
              {
                label: `${defaultOptionLabelPrefix}: ${defaultLlmModel?.label}`,
                value: defaultLlmModel?.value,
                isPremium: defaultLlmModel?.isPremium,
                isRouter: defaultLlmModel?.isRouter,
              },
            ]
          : []),
        ...models
          .filter((model) => allowEmpty || model.value !== defaultLlmModel?.value)
          .map(({ label, value, isPremium, isRouter }) => ({
            label,
            value,
            isPremium,
            isRouter,
          })),
      ],
      [
        allowEmpty,
        defaultLlmModel?.isPremium,
        defaultLlmModel?.isRouter,
        defaultLlmModel?.label,
        defaultLlmModel?.value,
        defaultOptionLabelPrefix,
        models,
        placeholder,
      ]
    )
```

The only behavior changes: the synthetic default row now carries `isPremium`/`isRouter` from `defaultLlmModel`, and the regular `models` list is filtered to drop the default model's `value` — but only when the synthetic row is actually being shown (`!allowEmpty`); when `allowEmpty` is true there is no synthetic row, so nothing should be filtered out of the regular list in that branch (preserves today's behavior for callers that pass `allowEmpty`, which is not the branch this ticket is about).

- [ ] **Step 6: Run both test files to verify they pass**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx`

Expected: PASS, all tests green.

- [ ] **Step 7: Run the full existing `LLMSelector` and sibling-consumer test suites to confirm no regression**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.projectModels.test.tsx`

Run: `npx vitest run --project unit src/pages/chat/components/ChatConfiguration`

Expected: PASS — these exercise `allowEmpty` combinations and the chat-side consumer of `LLMSelector`; the fix must not change their outcomes.

- [ ] **Step 8: Commit**

```bash
git add src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx
git commit -m "EPMCDME-15923: Dedupe default model entry and carry Premium/Router label onto it"
```
