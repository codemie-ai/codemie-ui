# EPMCDME-13280: Fix null skill name in assistant configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The assistant configuration Skills field always shows a selected skill's real name — never the literal text `null` — even when that skill falls outside the catalog's loaded, project/marketplace-scoped options.

**Architecture:** `SkillSelector` currently builds its PrimeReact `MultiSelect` options solely from `useSkillSelector`'s scoped catalog call; a selected id missing from that list has no matching option, and PrimeReact's `getLabelByValue` renders the resulting `null` as the literal string "null". `AssistantForm` already holds the full `assistant.skills[]` (with names) when it seeds `skill_ids`. The fix threads those names down as a new `knownSkills` prop and unions a name-bearing "hidden option" into `SkillSelector`'s options for any selected id absent from the loaded list — the same "hidden-option union" pattern already used by `AssistantSelector` (commit `1bf0010d7`), adapted so the Controller-bound `skill_ids` field stays a plain `string[]` and the save-path contract (`transformAssistantToCreateDTO`) is untouched.

**Tech Stack:** React 18, TypeScript, react-hook-form + Yup, PrimeReact `MultiSelect`, Vitest + React Testing Library (`integration` project).

**Requirements:** EPMCDME-13280 (Jira, inline — no spec.md). Technical analysis: `docs/superpowers/tasks/2026-10-01-epmcdme-13280/technical-analysis.md`.

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] Skills applied to an assistant always render their real names in the configuration Skills field; no `null` values appear — Task 1 + Task 2.
- [ ] The configuration Skills field is consistent with the SKILLS block on the assistant details panel — Task 2 (consistency test).
- [ ] Catalog discoverability follows project/visibility scope — **no code change (frontend or backend); needs a data check.** Backend review (`GET /v1/skills`, `repository/skill_repository.py:196-258`) shows the catalog lists only skills that are the user's own, in a project they belong to, or PUBLIC; nothing in the backend auto-attaches skills. A skill absent from the catalog is therefore expected when it is private or in another project. The configuration field never degrading to "null"/omitting the skill is fixed here (Task 1 + Task 2). Action outside this plan: someone checks the affected skill's project/visibility in the data and records the finding on the ticket.
- [ ] Root cause identified and fixed — documented above (Architecture) and in `technical-analysis.md`; fixed in Task 1.
- [ ] Regression covered for auto-attached skills — Task 1 + Task 2 tests.
- [ ] Fix verified on the reference assistant — Task 2's integration test reproduces the exact reported shape (a skill id outside the loaded catalog options) against an assistant fixture; this is the verification artifact, there is no separate manual-verification task (the calling flow runs its own verification stage).

## Global Constraints

- `skill_ids` stays `Yup.array().of(Yup.string())` (`AssistantForm.tsx:181-184`) — no schema widening, no change to the id-only shape submitted via `transformAssistantToCreateDTO`.
- No new backend/store API call (no id-scoped skills lookup endpoint) — names come only from `assistant.skills[]`, already in memory.
- No patch to PrimeReact's `MultiSelect` internals.

## Review Focus

- A selected id missing from **both** `knownSkills` and the loaded catalog options must fall back to the raw id string, never to `undefined`/`null` (mirrors the existing `AssistantMultiSelectField` fallback convention).
- An id present in **both** the loaded options and `knownSkills` must not produce a duplicate option entry (de-dupe by id, loaded options take precedence).
- `assistant.skills` being empty or undefined (default fixture case) must not throw and must render no hidden options.
- The configuration field and the details-panel SKILLS block must agree on the displayed name for the same assistant fixture, not just independently avoid "null".
- Catalog-discoverability is a backend-visibility risk this plan cannot close from the frontend — called out above, not treated as done.

---

### Task 1: Resolve names for selected skills missing from the loaded catalog in `SkillSelector`

**Files:**
- Modify: `src/components/SkillSelector.tsx`
- Create: `src/components/__tests__/SkillSelector.test.tsx`

**Interfaces:**
- Consumes: `useSkillSelector(project)` → `{ options: SelectOption[] /* {value,label,description} */, loading, refetch }` (unchanged).
- Produces: `SkillSelectorProps` gains `knownSkills?: { id: string; name: string; description?: string }[]` — the hidden-option name source for later tasks (Task 2) to supply.

Test-first: yes — a selected id absent from the mocked `useSkillSelector` options, present in `knownSkills`, must render its real name and never the string "null".

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import SkillSelector from '@/components/SkillSelector'

vi.mock('@/hooks/useSkillSelector', () => ({
  useSkillSelector: () => ({
    options: [{ value: 'sk-known', label: 'epam-pptx-template', description: '' }],
    loading: false,
    refetch: vi.fn(),
  }),
}))

describe('SkillSelector', () => {
  it('renders the real name for a selected id missing from loaded options', () => {
    render(
      <SkillSelector
        project="proj-1"
        value={['sk-known', 'sk-hidden']}
        onChange={vi.fn()}
        knownSkills={[{ id: 'sk-hidden', name: 'codemie-speech-presentation-content' }]}
      />
    )

    expect(screen.getByText(/codemie-speech-presentation-content/)).toBeInTheDocument()
    expect(screen.queryByText(/^null$/)).not.toBeInTheDocument()
  })

  it('falls back to the raw id when a selected id is unknown everywhere', () => {
    render(
      <SkillSelector project="proj-1" value={['sk-missing']} onChange={vi.fn()} knownSkills={[]} />
    )

    expect(screen.getByText(/sk-missing/)).toBeInTheDocument()
    expect(screen.queryByText(/^null$/)).not.toBeInTheDocument()
  })

  it('does not duplicate an option that is both loaded and in knownSkills', () => {
    render(
      <SkillSelector
        project="proj-1"
        value={['sk-known']}
        onChange={vi.fn()}
        knownSkills={[{ id: 'sk-known', name: 'stale-name-should-be-ignored' }]}
      />
    )

    expect(screen.getAllByText(/epam-pptx-template/)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/__tests__/SkillSelector.test.tsx`
Expected: FAIL — `knownSkills` is not a recognized prop / the hidden id still resolves to "null" or is absent.

- [ ] **Step 3: Implement the hidden-option union**

In `src/components/SkillSelector.tsx`, add `knownSkills` to `SkillSelectorProps` and build the `MultiSelect`'s `options` from a union instead of straight from the hook:

```tsx
export interface SkillSelectorProps {
  value?: (string | undefined)[]
  onChange?: (value: string[]) => void
  project: string
  error?: string
  knownSkills?: { id: string; name: string; description?: string }[]
}

// inside the component, alongside `cleanValue`:
const resolvedOptions = useMemo(() => {
  const loadedIds = new Set(options.map((opt) => opt.value))
  const hidden = cleanValue
    .filter((id) => !loadedIds.has(id))
    .map((id) => {
      const known = knownSkills?.find((skill) => skill.id === id)
      return { value: id, label: known?.name ?? id, description: known?.description }
    })
  return [...options, ...hidden]
}, [options, cleanValue, knownSkills])
```

Replace the `MultiSelect`'s `options={options.map((opt) => ({ label: opt.label, value: opt.value }))}` with `options={resolvedOptions.map((opt) => ({ label: opt.label, value: opt.value }))}`, and the `renderOption`'s `options={options}` with `options={resolvedOptions}` (so `SkillOption`'s description lookup also covers hidden options).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/__tests__/SkillSelector.test.tsx`
Expected: PASS, all three cases.

- [ ] **Step 5: Commit**

---

### Task 2: Wire `AssistantForm` to supply `knownSkills` and cover the reported regression end-to-end

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:833-837` (pass `knownSkills={assistant?.skills}` into `<SkillSelector {...field} project={project} knownSkills={assistant?.skills} error={fieldState.error?.message} />`)
- Modify: `src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx`

**Interfaces:**
- Consumes: `SkillSelectorProps.knownSkills` from Task 1; `assistant.skills: Skill[]` (`{id, name, description, ...}`, `src/types/entity/skill.ts`) already available in `AssistantFormContext`/props.
- Produces: nothing further downstream — this closes the fix.

Test-first: yes — an assistant fixture whose `skills[]` includes one id absent from the mocked `v1/skills` catalog response must render that skill's real name (not "null") in the configuration Skills field, matching the name already shown by the details-panel SKILLS block for the same fixture.

- [ ] **Step 1: Write the failing test**

Add to `EditAssistantPage.integration.test.tsx`, reusing its `createAssistantFixture` helper:

```tsx
it('renders a skill name correctly even when the skill is outside the loaded catalog scope', async () => {
  const assistant = createAssistantFixture({
    skills: [
      { id: 'sk-known', name: 'epam-pptx-template' },
      { id: 'sk-hidden', name: 'codemie-speech-presentation-content' },
    ],
  })

  mockAPI('GET', 'v1/config', [{ id: 'skills', settings: { enabled: true } }])
  mockAPI('GET', 'v1/assistants/id/asst-123', assistant)
  mockAPI('GET', 'v1/llm/models', [])
  // Catalog scope omits sk-hidden — reproduces the reported defect condition.
  mockAPI('GET', 'v1/skills', [{ id: 'sk-known', name: 'epam-pptx-template' }])

  renderPage('/assistants/asst-123/edit')

  await screen.findByText('epam-pptx-template')
  expect(screen.getByText(/codemie-speech-presentation-content/)).toBeInTheDocument()
  expect(screen.queryByText(/^null$/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project integration src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx`
Expected: FAIL — the Skills field renders `epam-pptx-template, null` (or omits the hidden skill), not `codemie-speech-presentation-content`.

- [ ] **Step 3: Wire the prop**

Apply the one-line change to `AssistantForm.tsx:833-837` described above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project integration src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx`
Expected: PASS. Also re-run Task 1's suite to confirm no regression: `npx vitest run --project unit src/components/__tests__/SkillSelector.test.tsx`.

- [ ] **Step 5: Commit**

---

## Negative-constraints check

- "`skill_ids` schema/shape must not change" — honored: Task 1/2 add a new, separate `knownSkills` prop; `skill_ids`'s Yup type and `transformAssistantToCreateDTO`'s id-only round-trip are untouched by either task.
- "No new backend/store id-lookup API call" — honored: both tasks resolve names only from `assistant.skills[]`, already in memory; no new `skillsStore` method or endpoint is added.
- "Do not patch PrimeReact" — honored: the fix only ever changes what `options` array is handed to the existing `MultiSelect` wrapper.
- "Do not claim the catalog-discoverability criterion is resolved by a frontend-only task" — honored: the Acceptance criteria section marks that criterion as partially out of reach and no task claims to fix catalog search/indexing.
