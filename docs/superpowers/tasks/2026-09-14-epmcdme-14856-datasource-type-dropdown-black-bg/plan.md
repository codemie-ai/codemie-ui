# Datasource Type Dropdown Black-Background Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Datasource Type Autocomplete's selected item from rendering a black/unstyled background after the user focuses the Description textarea and reopens the dropdown (EPMCDME-14856).

**Architecture:** Single shared component fix. Diagnose the exact mechanism at runtime (systematic-debugging), then close the gap in `src/components/form/Autocomplete/ptPreset.ts`'s `item` pass-through callback — the one place item background state is defined for every Autocomplete consumer in the app — falling back to `Autocomplete.tsx`'s event handlers only if the `pt.item` callback's `{ selected, disabled }` context genuinely cannot see the responsible state.

**Tech Stack:** React 18, TypeScript, PrimeReact `AutoComplete` (pass-through/`pt` styling), Tailwind semantic tokens, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-14-epmcdme-14856-datasource-type-dropdown-black-bg/spec.md`

## Global Constraints

- No redesign of the `Autocomplete` component's public API/props.
- No changes to `DataSourceForm`'s other fields or layout.
- No changes to the Select/Dropdown-family components (`ToolCallPolicyDropdown`, `IntegrationSelectDropdown`, `Select.tsx`) — a separate PrimeReact component family, not reported as affected.
- No changes to the global PrimeReact preset (`src/constants/theme.ts`, `LaraReact`) unless diagnosis proves the shared `ptPreset.ts` cannot fix it alone — if that happens, stop and flag it as a scope escalation instead of editing it.
- No light-theme-specific investigation/styling pass (dark-theme-confirmed bug; the token system is theme-paired, so the fix should hold for both, but no separate light-theme audit is in scope).
- No fix to the unrelated hardcoded `bg-purple-600` "NEW" badge color in `DataSourceTypeSelector.tsx`'s `itemTemplate` — out of scope.
- Every visible Autocomplete item background state (default, hover, selected, and after the blur/reopen cycle) must resolve to an existing semantic Tailwind token — no raw/hex color, no PrimeReact default bleeding through.

---

## File Structure

- `src/components/form/Autocomplete/ptPreset.ts` — owns the `item` pt callback (lines 52-58); primary fix location.
- `src/components/form/Autocomplete/Autocomplete.tsx` — owns focus/blur/show/hide/keydown event wiring (lines 146-189); secondary fix location, only if diagnosis requires it.
- `src/pages/dataSources/components/__tests__/DataSourceTypeSelector.test.tsx` — new, the regression test (no existing test file covers this component).

---

### Task 1: Diagnose and fix the black-background regression on reopen

**Files:**
- Create: `src/pages/dataSources/components/__tests__/DataSourceTypeSelector.test.tsx`
- Modify: `src/components/form/Autocomplete/ptPreset.ts:52-58` (the `item` pt callback)
- Modify (only if Step 3's diagnosis shows the `pt.item` context can't see the responsible state): `src/components/form/Autocomplete/Autocomplete.tsx:160-189` (`handleFocus`, `handleKeyDown`, `onShow`/`onHide`)

**Interfaces:**
- Consumes: `DataSourceTypeSelector`'s existing `Props` (`clearErrors`, `hidden?`, `indexType`, `onIndexTypeChange`, `indexMetadata`, `onIndexMetadataChange`) from `src/pages/dataSources/components/DataSourceTypeSelector.tsx:28-35`. Test helpers from `src/test-utils/component-interactions/autocomplete.ts`: `getAutocomplete`, `openAutocompleteDropdown`, `findAutocompleteOption`. `INDEX_TYPES` from `src/constants/dataSources.ts` (`GIT: 'git'`, labeled "Git" via `humanize`).
- Produces: nothing — single task, no downstream consumers.

**Test-first: yes — a new test asserting the previously-selected "Git" item keeps its `bg-surface-base-navigation` selected-token class (and picks up no stray unstyled/default class) after the dropdown is opened, a sibling Description field steals focus, and the dropdown is reopened; this test must fail against the current `ptPreset.ts`/`Autocomplete.tsx` before any fix is applied.**

- [ ] **Step 1: Write the failing regression test**

Render `DataSourceTypeSelector` next to a plain sibling text field standing in for the Description textarea (mirrors `DataSourceForm.tsx:380-396`'s sibling layout, without needing the full `react-hook-form`/`DataSourceForm` tree), with `indexType` pre-set so the "Git" item starts selected. Use the `autocomplete.ts` helpers (per spec Acceptance Criterion 3) to open the dropdown, read the selected item's class list, blur to the sibling field, reopen, and re-assert.

```tsx
// src/pages/dataSources/components/__tests__/DataSourceTypeSelector.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import {
  getAutocomplete,
  openAutocompleteDropdown,
  findAutocompleteOption,
} from '@/test-utils/component-interactions/autocomplete'

import DataSourceTypeSelector from '../DataSourceTypeSelector'

describe('DataSourceTypeSelector dark-theme focus regression (EPMCDME-14856)', () => {
  it('keeps the selected item on the selected-token class after the Description field steals focus and the dropdown reopens', async () => {
    const user = userEvent.setup()

    render(
      <>
        <DataSourceTypeSelector
          clearErrors={() => {}}
          indexType={INDEX_TYPES.GIT}
          onIndexTypeChange={() => {}}
          indexMetadata={{}}
          onIndexMetadataChange={() => {}}
        />
        <textarea aria-label="Description" />
      </>
    )

    const autocomplete = await getAutocomplete('Datasource Type')
    await openAutocompleteDropdown(autocomplete, user)
    const firstOpenItem = await findAutocompleteOption('Git')
    expect(firstOpenItem.className).toContain('bg-surface-base-navigation')

    // Description field steals focus — mirrors clicking the Description
    // textarea while the Datasource Type dropdown is open.
    await user.click(screen.getByLabelText('Description'))

    await openAutocompleteDropdown(autocomplete, user)
    const reopenedItem = await findAutocompleteOption('Git')

    expect(reopenedItem.className).toContain('bg-surface-base-navigation')
    expect(reopenedItem.className).not.toMatch(/p-highlight|p-focus/)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails for the right reason**

Run: `npx vitest run --project unit src/pages/dataSources/components/__tests__/DataSourceTypeSelector.test.tsx`

If it fails on the reopened-item assertions (missing `bg-surface-base-navigation` and/or a stray `p-highlight`/`p-focus` class), that confirms the defect is a classList flip and Step 3 can diagnose why. If it unexpectedly passes, the defect isn't captured by this assertion shape: use `systematic-debugging` to log `reopenedItem.outerHTML` and diff it against `firstOpenItem.outerHTML`, find the actual differing attribute/class, and rewrite the assertion to catch it — do not proceed to Step 3 until the test is red for a confirmed, evidenced reason.

- [ ] **Step 3: Diagnose the mechanism (systematic-debugging)**

Read `node_modules/primereact/autocomplete/autocomplete.cjs.js` for how it computes the per-item `context` passed to `pt.item` and how/when it applies its own internal classes (e.g. `p-highlight`, `p-focus`) to the rendered `<li>` across a panel close (`onHide`) → reopen (`onShow`) cycle. Cross-reference against `Autocomplete.tsx`'s `handleFocus` (161-164, calls `.search(e, '')` on refocus), `handleBlur`/`resetText` (146-159), and `handleKeyDown`'s manual `items[0].focus()` DOM calls (174-189) for anything that could leave stale focus/selection state across the cycle. Instrument by temporarily logging the `context` object inside `ptPreset.ts`'s `item` callback for the affected option on both opens, and comparing `reopenedItem.outerHTML` from Step 2 against `firstOpenItem.outerHTML`. Do not guess — trace to the actual differing class/attribute before writing the fix.

- [ ] **Step 4: Implement the minimal fix**

Update `ptPreset.ts`'s `item` callback (lines 52-58) so every reachable state — first-open selected, first-open hover/default, and the same item after the blur/reopen cycle — resolves only to `bg-surface-base-navigation` (selected), `hover:bg-surface-specific-dropdown-hover` (hover), or no background class (default), matching the diagnosis from Step 3. If Step 3 traces the defect to a PrimeReact-internal class (e.g. a lingering `p-highlight`/`p-focus`) that the `pt.item` callback's `{ selected, disabled }` context cannot see or neutralize, close the gap in `Autocomplete.tsx`'s event handlers instead (e.g. explicitly clearing whatever DOM-level focus state survives the close/reopen in `onHide`) — do not touch `src/constants/theme.ts`/`LaraReact`. If diagnosis instead shows the leak genuinely originates in the global preset and cannot be closed from `ptPreset.ts`/`Autocomplete.tsx`, stop and report this as a scope escalation rather than editing that file.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx vitest run --project unit src/pages/dataSources/components/__tests__/DataSourceTypeSelector.test.tsx`
Expected: PASS — the reopened item keeps `bg-surface-base-navigation` and carries no stray unstyled/default class.

- [ ] **Step 6: Commit**

Commit per task using the repository's existing convention (ticket-prefixed subject, per `.ai-run/guides/standards/git-workflow.md`).
