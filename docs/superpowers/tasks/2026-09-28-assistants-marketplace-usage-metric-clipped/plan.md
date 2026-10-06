# Assistants Marketplace Usage Metric Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix EPMCDME-14284 — the Assistants Marketplace card's usage-count metric (`unique_users_count`) clips at 320-360px card widths because it renders unformatted with a 12px icon gap while crowded reaction buttons eat the remaining width.

**Architecture:** Two new pure formatting helpers in `src/utils/helpers.ts` (compact-uppercase for the visible label, comma-grouped exact for a new tooltip); `StatusLabel.tsx`'s `GLOBAL` branch uses both, drops to a 4px gap, and gains its own `Tooltip` mount; the three tertiary reaction `Button`s in `AssistantCard.tsx` shrink to content width so they stop pushing the metric off the card edge.

**Tech Stack:** React 18 / TypeScript, `Intl.NumberFormat`, PrimeReact `Tooltip` (via local `@/components/Tooltip` wrapper), Tailwind, Vitest + React Testing Library.

**Spec:** No `spec.md` — requirements arrived inline from EPMCDME-14284 (see Acceptance criteria below) plus `docs/superpowers/tasks/2026-09-28-assistants-marketplace-usage-metric-clipped/technical-analysis.md`.

**Commit per task using the repository's existing convention.**

## Acceptance criteria

- [ ] 0-999 renders as an exact integer (0, 35, 567, 999).
- [ ] >=1,000 renders compact with uppercase `K`/`M`, no space before the unit (1K, 1.2K, 20K, 20.9K, 22.4K, 999.9K).
- [ ] Rounding is half-up to at most 1 decimal; whole thousands drop the trailing `.0` (1,249 -> 1.2K, 1,250 -> 1.3K, 20K not 20.0K).
- [ ] Visible label has a space before the unit word: "22.4K uses" / "1 use".
- [ ] Hover tooltip shows the exact comma-grouped count: "22,432 total uses" / "1 total use".
- [ ] GLOBAL status row's icon-to-value gap is 4px (`gap-1`); SHARED/OWNED/NOT_SHARED rows keep `gap-3` unchanged.
- [ ] No clipping, overlap, or second-line wrap at 320-360px card widths.

## Global Constraints

- `formatCompactCount` (`src/utils/helpers.ts:367-374`) stays byte-for-byte unchanged — its lowercase output is asserted by `helpers.test.ts` and by `AssistantCard.test.tsx`'s inline mock.
- `formatMetricCount`/`formatExactCount` are new, independent exports — no shared implementation with `formatCompactCount`.
- Only the GLOBAL branch of `StatusLabel.tsx` changes gap/text/tooltip; SHARED/OWNED/NOT_SHARED are untouched, including their existing `gap-3` test assertion.
- Do not touch `AssistantDetailsProfile.tsx` or `WorkflowMarketplace.tsx` — same bug pattern exists there but is out of scope for this ticket.
- `'en-US'` locale, inline at each `Intl` call site, matching the existing convention.

## Review Focus

- Whole-thousand values must not show a trailing `.0` (e.g. 20000 -> "20K", not "20.0K") — `maximumFractionDigits: 1` alone does not guarantee this without checking `Intl.NumberFormat`'s actual output.
- `AssistantCard.test.tsx` fully mocks `@/utils/helpers` without `formatMetricCount`/`formatExactCount`; every existing global-assistant test in that file will throw "is not a function" once `StatusLabel` calls them, unless the mock is extended in the same task that touches `AssistantCard.tsx`.
- The GLOBAL row's `aria-label` currently equals the visible text; once the visible text is abbreviated it must not silently become an abbreviated accessible name — it should carry the exact/tooltip wording instead.
- `count === 1` singular branch ("1 use" / "1 total use") is easy to skip when only testing round numbers ≥1000.
- A new `Tooltip` mount inside `StatusLabel` must target a class distinct from `AssistantCard.tsx`'s own `tooltip-target-<id>` class so the two tooltip instances never collide when both render for the same card.

---

### Task 1: Add `formatMetricCount` and `formatExactCount` to helpers.ts

**Files:**
- Modify: `src/utils/helpers.ts` (add after `formatCompactCount`, line 374)
- Test: `src/utils/__tests__/helpers.test.ts`

**Interfaces:**
- Produces: `formatMetricCount(value?: number | string | null): string`, `formatExactCount(value?: number | string | null): string` — both imported by `StatusLabel.tsx` in Task 2.

**Test-first: yes — failing tests for both new exports before they exist.**

- [ ] **Step 1: Write failing tests** in `src/utils/__tests__/helpers.test.ts` (new `describe` blocks) covering: 0, 1, 35, 567, 999, 1000, 1200, 1249 (-> `'1.2K'`), 1250 (-> `'1.3K'`), 20000 (-> `'20K'`), 20900 (-> `'20.9K'`), 22432 (-> `'22.4K'`), 999900 (-> `'999.9K'`), 1000000 (-> `'1M'`), and `null`/`undefined`/`'42'`/`'abc'` inputs, for `formatMetricCount`; and 0 (-> `'0'`), 1 (-> `'1'`), 22432 (-> `'22,432'`), 1000000 (-> `'1,000,000'`), `null`/`undefined`/`'42'` for `formatExactCount`.
- [ ] **Step 2: Run** `npx vitest run src/utils/__tests__/helpers.test.ts` — expect FAIL, `formatMetricCount`/`formatExactCount` not exported.
- [ ] **Step 3: Implement**, directly below `formatCompactCount` (`src/utils/helpers.ts:374`):

```ts
export const formatMetricCount = (value?: number | string | null): string => {
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)
}

export const formatExactCount = (value?: number | string | null): string => {
  return Number(value || 0).toLocaleString('en-US')
}
```

- [ ] **Step 4: Run** `npx vitest run src/utils/__tests__/helpers.test.ts` — expect PASS, including the existing `formatCompactCount` cases unchanged.
- [ ] **Step 5: Commit.**

---

### Task 2: Reformat StatusLabel's GLOBAL row — compact label, exact tooltip, gap-1

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx`
- Test: `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx`

**Interfaces:**
- Consumes: `formatMetricCount`, `formatExactCount` from `@/utils/helpers` (Task 1); `Tooltip` from `@/components/Tooltip`.

**Test-first: yes — failing assertions for compact text, gap-1, and tooltip on the GLOBAL branch.**

- [ ] **Step 1: Update/add failing tests** in `StatusLabel.test.tsx`: change line 39 and line 93 expectations from `'42 total uses'` to `'42 uses'`; add cases for `unique_users_count: 0` (-> `'0 uses'`... exact: `1` -> `'1 use'`), and `20900` (-> `'20.9K uses'`, tooltip/aria text containing `'20,900 total uses'`); add a `gap-1` class assertion on the GLOBAL render (leave the existing line 111 `gap-3` assertion, which renders a non-global instance, untouched).
- [ ] **Step 2: Run** `npx vitest run src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx` — expect FAIL.
- [ ] **Step 3: Implement**, `StatusLabel.tsx:29-89`: import `formatMetricCount, formatExactCount` from `@/utils/helpers` and `Tooltip` from `@/components/Tooltip`. Compute `count = assistant.unique_users_count ?? 0` once. Build a `tooltipTargetClass` via `useMemo(() => 'status-tooltip-target-' + (assistant.id || assistant.slug), [assistant.id, assistant.slug])` (distinct from `AssistantCard.tsx`'s own `tooltip-target-` prefix). For `StatusType.GLOBAL` only: visible text = `` `${formatMetricCount(count)} ${count === 1 ? 'use' : 'uses'}` ``; exact/tooltip text = `` `${formatExactCount(count)} ${count === 1 ? 'total use' : 'total uses'}` ``; container className branches to `gap-1` instead of `gap-3` (keep `flex flex-row items-center text-xs whitespace-nowrap`); `aria-label` uses the exact/tooltip text, not the visible text; add `data-pr-tooltip={exactText}` and `tooltipTargetClass` on the div, and render `<Tooltip target={'.' + tooltipTargetClass} position="top" showDelay={100} />` next to it. SHARED/OWNED/NOT_SHARED branches are untouched (same `gap-3`, same `getStatusText`/`aria-label` wiring as today).
- [ ] **Step 4: Run** the same test file — expect PASS, plus confirm the pre-existing non-GLOBAL `gap-3` test (line 111 area) still passes unmodified.
- [ ] **Step 5: Commit.**

---

### Task 3: Shrink tertiary reaction buttons; keep AssistantCard.test.tsx green

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx` (Like/Dislike/Clone `Button` usages, ~lines 189, 212, 238)
- Test: `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx`

**Interfaces:**
- Consumes: `formatMetricCount`/`formatExactCount` (Task 1) — via `StatusLabel`, rendered inside `AssistantCard`, not called directly here.

**Test-first: yes — failing test for `min-w-0`/`px-1.5` on the three reaction buttons; existing global-assistant tests fail first for the wrong reason (missing helper mocks) until the mock is fixed.**

- [ ] **Step 1: Update the test file**: extend the `vi.mock('@/utils/helpers', ...)` call (lines 23-29) to also stub `formatMetricCount` and `formatExactCount` (e.g. reuse the same `Intl.NumberFormat` call with `maximumFractionDigits: 1` and no lowercase, and `Number(value || 0).toLocaleString('en-US')` respectively) so `StatusLabel`'s global branch does not throw. Add a new test asserting the Like/Dislike/Clone buttons carry `min-w-0` and `px-1.5`.
- [ ] **Step 2: Run** `npx vitest run src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx` — expect FAIL: the new class assertion fails, and confirm the mock extension alone (without the Task 3 implementation) still lets prior tests pass.
- [ ] **Step 3: Implement**: on each of the three tertiary `<Button>` usages (`AssistantCard.tsx`, Like ~line 191, Dislike ~line 214, Clone ~line 240), change `className={tooltipClass}` to `className={classNames(tooltipClass, 'min-w-0', 'px-1.5')}`. Do not change the chat button or any other `Button` usage.
- [ ] **Step 4: Run** the same test file — expect PASS, including the pre-existing `12k`/`68k`/`54k` reaction-counter and `shrink-0` chat-button assertions unchanged.
- [ ] **Step 5: Commit.**

---

## Self-Review

**Spec coverage:** Acceptance criteria 1-4 -> Task 1 (`formatMetricCount`). Criterion 5 (visible label spacing) -> Task 2. Criterion 6 (tooltip, exact commas) -> Task 1 (`formatExactCount`) + Task 2 (tooltip wiring). Criterion 7 (gap-1, GLOBAL-only) -> Task 2. Criterion 8 (no clipping at 320-360px) -> Task 2 (gap reduction) + Task 3 (button shrink) together; no single task fully owns layout stability, which is inherent to a two-cause bug — both tasks are required and neither claims it alone.

**Placeholder scan:** None found — every step has literal code or a literal assertion description.

**Type consistency:** `formatMetricCount`/`formatExactCount` signatures declared in Task 1 are the exact ones imported in Task 2 and mocked in Task 3. `count`, `tooltipTargetClass` names introduced in Task 2 are not referenced elsewhere.

**Negative-constraint pass:**
- "do not touch AssistantDetailsProfile.tsx / WorkflowMarketplace.tsx" — no task modifies either file. Honored.
- "formatCompactCount byte-for-byte unchanged" — Task 1 only adds new exports after it, never edits `helpers.ts:367-374`; Task 3's mock extension in the test file adds new stub entries without changing the existing `formatCompactCount` stub. Honored.
- "do not change gap on SHARED/OWNED/NOT_SHARED, leave their gap-3 and tests untouched" — Task 2 explicitly branches the className so only the GLOBAL case gets `gap-1`, and Step 4 requires re-confirming the pre-existing non-GLOBAL `gap-3` test still passes unmodified. Honored.
- "no space before K" — `Intl.NumberFormat` with `compactDisplay: 'short'` produces `20.9K` with no separating space for `en-US`; no task inserts one. Honored.
- Non-goals section (AssistantDetailsProfile.tsx, WorkflowMarketplace.tsx) — covered above, same answer.

## Review Focus (resolved into tasks)

Each Review Focus item above maps to a step: whole-thousands-no-`.0` -> Task 1 Step 1 test cases (20000, 999900); helpers-mock-breaks-AssistantCard.test.tsx -> Task 3 Step 1; aria-label must carry exact wording -> Task 2 Step 3; singular "1 use"/"1 total use" -> Task 1 Step 1 and Task 2 Step 1; tooltip class collision -> Task 2 Step 3's distinct `status-tooltip-target-` prefix.
