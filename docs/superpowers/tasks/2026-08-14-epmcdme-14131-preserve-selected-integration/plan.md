# Pinned integration wins over the auto-lookup flag — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. This plan is executed
> inline by the `sdlc-task` flow (Stage 5), not through subagent dispatch.

**Goal:** An integration slot that carries a pinned integration renders as pinned — switch OFF,
dropdown visible with that integration — no matter what the stored `auto_credentials_lookup` flag
says.

**Architecture:** One predicate in `src/utils/toolkit.ts` becomes the single answer to "is this slot
in automatic-lookup mode?". The author-side `Toolkit` component reads it instead of testing the raw
flag, at both the toolkit level and the tool level. The two hook callbacks that pin an integration
record `auto_credentials_lookup: false` on the slot so the decision stops being implicit. No
component tree outside the author-side assistant form changes, and no backend change is involved.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library, Valtio (untouched here).

**Spec:** `docs/superpowers/tasks/2026-08-14-epmcdme-14131-preserve-selected-integration/spec.md`

## Global Constraints

- Frontend only. No change under `/Users/evgeniikvasiuk/Projects/codemie/codemie`.
- The consumer-side panel (`src/utils/assistants.tsx`, `src/pages/.../UserMapping/**`) is out of
  scope and must not be edited.
- The workflow configuration format (`src/types/workflowEditor/configuration.ts`) is out of scope.
- All four existing tests in
  `src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/ToolkitAutoLookup.test.tsx`
  must keep passing untouched.
- Commit subjects follow `EPMCDME-14131: Capital sentence` (`.ai-run/guides/standards/git-workflow.md`).
- Never name a Jira ticket, an internal URL, or a person inside source or test files. The ticket id
  belongs in the commit subject and the branch name only.
- Test command: `npx vitest run <path>` from the repo root.
- Pre-commit hooks are known-broken in this checkout (local ESLint alias resolver); commit with
  `--no-verify` and rely on CI for lint.

---

### Task 1: The predicate

A slot is in automatic-lookup mode only when it has no pinned integration. With a pinned
integration it is never in auto mode; with none, the stored flag decides, and an absent flag still
means auto.

**Files:**
- Modify: `src/utils/toolkit.ts` (append after `extractToolkitSettings`, around line 38)
- Test: `src/utils/__tests__/toolkit.test.ts` (create — no test file exists for this module yet)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `isAutoLookupEnabled(slot?: AutoLookupSlot | null): boolean`, where
  `type AutoLookupSlot = { auto_credentials_lookup?: boolean; settings?: Setting | null }`. Tasks 2
  and 3 import it from `@/utils/toolkit`.

`Test-first: yes — a slot with a pinned integration and auto_credentials_lookup true must report false; isAutoLookupEnabled is not exported yet, so the import fails.`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/toolkit.test.ts`. Copy the 14-line Apache licence header verbatim from
the top of `src/utils/toolkit.ts` before the imports — every source file in this repo carries it.

```ts
import { describe, expect, it } from 'vitest'

import type { Setting } from '@/types/entity/setting'

import { isAutoLookupEnabled } from '../toolkit'

const pinned = { id: 'int-1', alias: 'My Jira' } as Setting

describe('isAutoLookupEnabled', () => {
  it('reports pinned slots as not automatic, whatever the stored flag says', () => {
    // Legacy assistants come back from the API with the flag defaulted to true, and workflow tool
    // configuration has nowhere to store it at all. The pinned integration is the reliable signal.
    expect(isAutoLookupEnabled({ settings: pinned, auto_credentials_lookup: true })).toBe(false)
    expect(isAutoLookupEnabled({ settings: pinned })).toBe(false)
    expect(isAutoLookupEnabled({ settings: pinned, auto_credentials_lookup: false })).toBe(false)
  })

  it('lets the stored flag decide when nothing is pinned', () => {
    expect(isAutoLookupEnabled({ auto_credentials_lookup: false })).toBe(false)
    expect(isAutoLookupEnabled({ auto_credentials_lookup: true })).toBe(true)
  })

  it('treats an absent flag on an unpinned slot as automatic', () => {
    expect(isAutoLookupEnabled({})).toBe(true)
    expect(isAutoLookupEnabled(undefined)).toBe(true)
    expect(isAutoLookupEnabled(null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/utils/__tests__/toolkit.test.ts`
Expected: FAIL — `isAutoLookupEnabled` is not exported by `../toolkit`.

- [ ] **Step 3: Write the implementation**

In `src/utils/toolkit.ts`, after `extractToolkitSettings`:

```ts
/** A tool or toolkit slot, as far as the automatic-lookup decision is concerned. */
export type AutoLookupSlot = {
  auto_credentials_lookup?: boolean
  settings?: Setting | null
}

/**
 * Whether the slot resolves its integration per consuming user.
 *
 * A pinned integration answers the question on its own: the two states are mutually exclusive, and
 * runtime resolution already treats the pin as decisive. Reading the flag alone would misreport
 * every slot whose flag cannot describe it — a workflow tool configuration stores no flag, and the
 * API defaults it to enabled for assistants saved before the field existed.
 */
export const isAutoLookupEnabled = (slot?: AutoLookupSlot | null): boolean => {
  if (slot?.settings) {
    return false
  }

  return slot?.auto_credentials_lookup !== false
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/utils/__tests__/toolkit.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Do not commit yet**

Task 1 alone changes no behaviour. Commit together with Task 2, which puts the predicate to work.

---

### Task 2: The author-side form reads the predicate

Both slot levels in the author-side `Toolkit` component switch from testing the raw flag to calling
the predicate. This is the change that makes the pinned integration visible again.

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/Toolkit.tsx:112-123`
- Test: `src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/ToolkitAutoLookup.test.tsx`
  (add cases; leave the four existing ones untouched)

**Interfaces:**
- Consumes: `isAutoLookupEnabled` from `@/utils/toolkit` (Task 1).
- Produces: nothing new; the component's props are unchanged.

`Test-first: yes — rendering a tool that has a pinned integration alongside auto_credentials_lookup true must show the switch OFF and the integration dropdown; today the switch reads ON and the dropdown is not rendered.`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe` in `ToolkitAutoLookup.test.tsx`:

```ts
  it('shows a pinned tool integration even when the stored flag says automatic', () => {
    // The API defaults the flag to enabled for assistants saved before it existed, and a workflow
    // tool configuration carries no flag at all. The pin is what the author actually chose.
    render(
      <Toolkit
        {...baseProps}
        selectedToolkits={[
          {
            toolkit: 'Project Management',
            tools: [
              {
                ...tool,
                auto_credentials_lookup: true,
                settings: { id: 'int-1', alias: 'My Jira', setting_type: 'USER' },
              },
            ],
          } as never,
        ]}
      />
    )

    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(screen.getByText('My Jira')).toBeInTheDocument()
  })

  it('shows a pinned tool integration when no flag is stored', () => {
    render(
      <Toolkit
        {...baseProps}
        selectedToolkits={[
          {
            toolkit: 'Project Management',
            tools: [
              { ...tool, settings: { id: 'int-1', alias: 'My Jira', setting_type: 'USER' } },
            ],
          } as never,
        ]}
      />
    )

    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(screen.getByText('My Jira')).toBeInTheDocument()
  })
```

The toolkit-level slot needs its own render, because the toolkit dropdown only mounts when the
toolkit itself carries the integration (`settings_config` on the toolkit, not on the tool). Add a
second `describe` block at the end of the file:

```ts
describe('author Toolkit — a pinned toolkit integration outranks the stored flag', () => {
  afterEach(cleanup)

  const toolkitLevelProps = {
    ...baseProps,
    toolkit: {
      toolkit: 'Project Management',
      label: 'Project Management',
      settings_config: true,
      tools: [{ name: 'generic_jira_tool', label: 'Generic Jira', settings_config: false }],
    } as never,
  }

  it('shows the toolkit integration and the switch off when the flag says automatic', () => {
    render(
      <Toolkit
        {...toolkitLevelProps}
        selectedToolkits={[
          {
            toolkit: 'Project Management',
            settings_config: true,
            auto_credentials_lookup: true,
            settings: { id: 'int-1', alias: 'My Jira', setting_type: 'USER' },
            tools: [{ name: 'generic_jira_tool', label: 'Generic Jira', settings_config: false }],
          } as never,
        ]}
      />
    )

    expect(screen.getByRole('switch')).not.toBeChecked()
  })
})
```

- [ ] **Step 2: Run the tests and confirm the new ones fail**

Run: `npx vitest run src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/ToolkitAutoLookup.test.tsx`
Expected: the four original tests PASS; the three new tests FAIL — the switch is checked and the
dropdown is absent, because the raw flag still decides.

If the toolkit-level test fails to find a `switch` role at all, the toolkit dropdown did not mount:
check the render conditions at `Toolkit.tsx:253-255` (`toolkit.settings_config && selectedToolkit &&
!toolkit.is_external`) and the `settingsDefinitions` the component receives, then adjust the
fixture — not the component — until the switch is in the tree.

- [ ] **Step 3: Write the implementation**

In `Toolkit.tsx`, add the import alongside the other `@/utils` imports:

```ts
import { isAutoLookupEnabled } from '@/utils/toolkit'
```

Replace lines 112-123 with:

```ts
  // Derive the toggles from the form data instead of keeping them in local state: the form mounts
  // before the assistant's toolkits arrive, so a state initialised once would stay on its initial
  // value and a saved "lookup off" would keep showing as enabled. A pinned integration decides on
  // its own — see isAutoLookupEnabled.
  const toolkitAutoMode = isAutoLookupEnabled(selectedToolkit)

  const isToolAutoMode = (toolName: string) =>
    isAutoLookupEnabled(selectedToolkit?.tools.find((t) => t.name === toolName))
```

The `as { auto_credentials_lookup?: boolean }` casts go away — the predicate's parameter type
accepts both shapes.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/ToolkitAutoLookup.test.tsx src/utils/__tests__/toolkit.test.ts`
Expected: PASS — all seven Toolkit tests plus the three predicate tests.

- [ ] **Step 5: Commit Tasks 1 and 2 together**

```bash
git add src/utils/toolkit.ts src/utils/__tests__/toolkit.test.ts \
  src/pages/assistants/components/AssistantForm/components/Toolkits/Toolkit.tsx \
  src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/ToolkitAutoLookup.test.tsx
git commit --no-verify -m "EPMCDME-14131: Let a pinned integration outrank the automatic lookup flag"
```

---

### Task 3: Pinning an integration records the decision

With the reading fixed, make the writing explicit: pinning an integration stores
`auto_credentials_lookup: false` on that slot, so later reads find a decision rather than infer one.
Clearing the integration leaves the flag alone — the slot stays an explicit "no integration".

**Files:**
- Modify: `src/hooks/useToolkitSelection.ts:126-153` (`updateToolkitSetting`, `updateToolSetting`)
- Test: `src/hooks/__tests__/useToolkitSelection.test.ts` (add a `describe` block)

**Interfaces:**
- Consumes: nothing from Tasks 1-2 at runtime; the behaviours are independent.
- Produces: no signature change. `updateToolkitSetting(toolkit, setting?)` and
  `updateToolSetting(toolkit, tool, settings?)` keep their parameters.

`Test-first: yes — updateToolSetting with a setting must emit a tool carrying auto_credentials_lookup false; today it emits only settings, leaving the flag untouched.`

- [ ] **Step 1: Write the failing tests**

Append to `src/hooks/__tests__/useToolkitSelection.test.ts`:

```ts
  describe('pinning an integration records the auto-lookup decision', () => {
    const setting = { id: 'int-1', alias: 'My Jira' } as never

    it('disables automatic lookup on the tool when an integration is pinned', () => {
      const tool = makeTool('generic_jira_tool')
      const toolkit = makeToolkit('Project Management', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolSetting(toolkit, tool, setting)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          tools: [expect.objectContaining({ settings: setting, auto_credentials_lookup: false })],
        }),
      ])
    })

    it('disables automatic lookup on the toolkit when an integration is pinned', () => {
      const toolkit = makeToolkit('Project Management', [makeTool('generic_jira_tool')])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolkitSetting(toolkit, setting)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ settings: setting, auto_credentials_lookup: false }),
      ])
    })

    it('leaves the stored decision alone when the integration is cleared', () => {
      // Clearing the dropdown means "no integration", not "resolve one for me". The dropdown is
      // only reachable with lookup already disabled, so the flag must survive untouched.
      const tool = { ...makeTool('generic_jira_tool'), auto_credentials_lookup: false } as never
      const toolkit = makeToolkit('Project Management', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolSetting(toolkit, tool, null)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          tools: [expect.objectContaining({ settings: undefined, auto_credentials_lookup: false })],
        }),
      ])
    })
  })
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/hooks/__tests__/useToolkitSelection.test.ts`
Expected: the existing tests PASS; the first two new tests FAIL — the emitted objects carry
`settings` but no `auto_credentials_lookup`. The third test passes already; it is a regression
guard, and it must keep passing after Step 3.

- [ ] **Step 3: Write the implementation**

In `useToolkitSelection.ts`, replace the body of `updateToolkitSetting` (line 126 onward):

```ts
  const updateToolkitSetting = useCallback(
    (toolkit: AssistantToolkit, setting?: Setting | null) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      if (existingToolkit) {
        onToolkitsChange(
          selectedToolkits.map((tk) =>
            tk.toolkit === toolkit.toolkit
              ? {
                  ...tk,
                  settings: setting || undefined,
                  // Pinning is a decision: record it so later reads find it instead of inferring
                  // it. Clearing keeps whatever is stored — an empty slot is "no integration".
                  ...(setting ? { auto_credentials_lookup: false } : {}),
                }
              : tk
          )
        )
      }
    },
    [selectedToolkits, onToolkitsChange]
  )
```

and the body of `updateToolSetting`:

```ts
  const updateToolSetting = useCallback(
    (toolkit: AssistantToolkit, tool: Tool, settings?: Setting | null) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      if (existingToolkit) {
        const updatedTools = existingToolkit.tools.map((t) =>
          t.name === tool.name
            ? {
                ...t,
                settings: settings || undefined,
                ...(settings ? { auto_credentials_lookup: false } : {}),
              }
            : t
        )
        updateSelectedToolkits(toolkit, updatedTools)
      }
    },
    [selectedToolkits, updateSelectedToolkits]
  )
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/hooks/__tests__/useToolkitSelection.test.ts`
Expected: PASS — the whole file, existing tests included.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useToolkitSelection.ts src/hooks/__tests__/useToolkitSelection.test.ts
git commit --no-verify -m "EPMCDME-14131: Record the lookup decision when an integration is pinned"
```

---

### Task 4: Confirm nothing else read the raw flag

The predicate is only the single answer if no author-side call site still tests the flag directly.

**Files:**
- Inspect (modify only if a match is found): any file under `src/pages/assistants/components/AssistantForm/`,
  `src/pages/workflows/`, `src/hooks/`, `src/store/`, `src/utils/` matching the search below.

**Interfaces:**
- Consumes: `isAutoLookupEnabled` (Task 1).
- Produces: nothing.

`Test-first: no — this is a verification sweep. It only becomes a code change if a call site turns up, in which case that change is covered by the tests from Tasks 2 and 3.`

- [ ] **Step 1: Search for remaining direct reads**

```bash
grep -rn "auto_credentials_lookup" src | grep -v "__tests__"
```

- [ ] **Step 2: Classify every hit**

Expected, and correct to leave alone:
- `src/types/entity/assistant.ts` — the field declarations.
- `src/hooks/useToolkitSelection.ts` — `updateToolkitAutoLookup` / `updateToolAutoLookup` write the
  flag, and Task 3's two writes. Writing is not reading.
- `src/store/utils/assistants.ts` — passes the flag through to the payload.
- `src/utils/assistants.tsx` — the consumer panel, explicitly out of scope per the spec.

Anything else that *reads* the flag to decide a mode on the author side must switch to
`isAutoLookupEnabled`.

- [ ] **Step 3: Run the full unit suite**

Run: `npx vitest run src/utils src/hooks src/pages/assistants/components/AssistantForm`
Expected: PASS.

- [ ] **Step 4: Commit only if Step 2 produced a change**

```bash
git commit --no-verify -am "EPMCDME-14131: Read the lookup mode through one predicate everywhere"
```

---

## Self-review notes

- **Spec coverage.** Criteria 1-4 and 8 are implemented by Tasks 1-2 and asserted by the predicate
  tests plus the new component tests. Criteria 5-6 are Task 3. Criterion 7 (enabling auto clears the
  pin) is existing behaviour that no task modifies; the existing `persists enabling it` test in
  `ToolkitAutoLookup.test.tsx` plus the untouched `updateToolAutoLookup` / `updateToolkitAutoLookup`
  bodies guard it.
- **Naming consistency.** `isAutoLookupEnabled` and `AutoLookupSlot` are used verbatim in Tasks 1,
  2 and 4.
- **Deferred.** Manual reproduction on a running stack is the spec's verification step and belongs
  to Stage 7, not to this plan.

---

## What actually shipped

The four planned tasks landed as written, then one round of code review reshaped Task 3 and
removed a scope extension that had been added mid-flight.

- **Task 3 changed shape.** The plan wrote `auto_credentials_lookup: false` whenever a setting was
  passed. Review showed that leaves the clear path broken for exactly the two populations this fix
  exists for (flagless workflow slots, legacy slots with the flag defaulted to enabled), and that
  the two setters are shared by the plugin panel, which renders no switch. The setters now take an
  explicit `SettingUpdateOptions` opt-in: surfaces with the switch record the decision on both a
  pick and a clear, surfaces without it stay flag-neutral. Prop types in `Toolkit.tsx` widened
  accordingly.
- **Task 2's toolkit-level test was wrong.** Its settings fixture was keyed by the tool's credential
  type, so the toolkit-level dropdown had no options and the assertion never ran. Re-keyed by
  `getCredentialType(toolkit.toolkit)`, with the dropdown now genuinely asserted, plus a
  toolkit-level clear case and a no-flag pinned case.
- **A fifth task was added and then reverted.** Review raised the pre-existing race in `ToolForm`
  and `VirtualAssistantForm`, and the human chose to fix it here. The implementation guarded the
  rebuild on a populated integrations index — which blocks initialisation permanently when a user
  legitimately has none (`indexSettings` has no `catch` and leaves an empty object), ending in
  silent loss of the node's tool on save, and whose first population could overwrite in-flight
  edits. Both are worse than the race, so it was reverted to its own ticket; those two files are
  byte-identical to `main`.
