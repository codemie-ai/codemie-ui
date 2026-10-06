# EPMCDME-8509 Checkbox Focus Indicator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make focus rings visible on the "Me" Checkbox, the "Shared" accordion RadioButtons, and the "Do not show" Checkbox in the GenAI popup, satisfying WCAG 2.4.7 (contrast ≥ 3:1).

**Architecture:** Two surgical changes. (1) The lara checkbox preset's `box` block currently uses `ring-border-subtle/20` — an ~4% opaque ring that is practically invisible. Replacing the colour token with `ring-border-accent` (a real theme-aware token: white in dark, #007AFF in light) fixes every Checkbox in the app via the global PrimeReact PT merge. (2) RadioButton.tsx's `customPT` has no focus ring and its `input` lacks the `peer` class required to trigger peer-* variants on `box`. Adding both makes the ring appear on Tab focus.

**Tech Stack:** Tailwind CSS 3.4.17, PrimeReact 10.x pass-through API, Vitest + @testing-library/react, userEvent.

**Spec:** `docs/superpowers/tasks/2026-09-02-epmcdme-8509-checkbox-focus-indicator/technical-analysis.md`

## Global Constraints

- Token to use: `ring-border-accent` — confirmed real in `tailwind.config.ts:313` (white / #007AFF). Do NOT use `ring-primary-500` (does not exist in this config) or `ring-border-subtle/20` (the bug).
- Ring size: `ring-2` for Checkbox (keep existing shape). `ring-2` for RadioButton (match checkbox shape).
- Variant: `peer-focus-visible:` — never bare `focus:` (fires on mouse click).
- No `ring-offset-*` — default offset colour is #fff; paints a white halo in dark mode.
- No call-site edits — fix the preset and the component; call sites inherit.
- No edits to other presets (inputswitch, tag, dropdown) in this run.
- Tests verify focusability (behavioral) only. jsdom cannot compute Tailwind ring styles; tests cannot verify contrast. Do not claim they do.
- Commit format: `EPMCDME-8509: Capital sentence`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/styles/presets/lara/checkbox/index.ts` | Modify | Fix the ring colour token on `box` (line 66) |
| `src/components/form/RadioButton/RadioButton.tsx` | Modify | Add `peer` to input; add ring classes to box |
| `src/components/form/__tests__/Checkbox.test.tsx` | Create | Regression guard: Checkbox receives Tab focus |
| `src/components/form/RadioButton/__tests__/RadioButton.test.tsx` | Create | Regression guard: RadioButton receives Tab focus |

---

### Task 1: Fix Checkbox focus ring — lara preset + regression test

> Test-first: **note** — this is a pure CSS class swap. The behavioural focus test (Tab → toHaveFocus) passes before AND after the fix because focusability is unchanged. The test is written as a regression guard and to document the intended keyboard behaviour. It cannot verify contrast ratio in jsdom; contrast must be verified manually in a browser.

**Files:**
- Modify: `src/styles/presets/lara/checkbox/index.ts:66`
- Create: `src/components/form/__tests__/Checkbox.test.tsx`

**Interfaces:**
- Consumes: `Checkbox` from `@/components/form/Checkbox`
- Produces: nothing consumed by Task 2

- [ ] **Step 1: Write the regression test (will already pass — see note above)**

Create `src/components/form/__tests__/Checkbox.test.tsx`:

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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { Checkbox } from '@/components/form/Checkbox'

describe('Checkbox accessibility', () => {
  it('receives keyboard focus when tabbed to', async () => {
    const user = userEvent.setup()
    render(<Checkbox checked={false} onChange={() => {}} />)

    await user.tab()

    expect(screen.getByRole('checkbox')).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run test to confirm it passes (GREEN — focusability is pre-existing)**

```bash
cd /Users/alex/Projects/Work/codemie-dev/codemie-ui
npx vitest run src/components/form/__tests__/Checkbox.test.tsx
```

Expected: PASS — document the output in the MR description.

- [ ] **Step 3: Apply the fix to the lara checkbox preset**

In `src/styles/presets/lara/checkbox/index.ts`, inside the `box` States block (line ~66), change:

```ts
// BEFORE
'peer-focus-visible:ring-2 peer-focus-visible:ring-border-subtle/20': !props.disabled,
```

to:

```ts
// AFTER
'peer-focus-visible:ring-2 peer-focus-visible:ring-border-accent': !props.disabled,
```

Only the colour token changes. Keep `ring-2`, `peer-focus-visible:`, and `!props.disabled`.

- [ ] **Step 4: Run test again to confirm still GREEN**

```bash
npx vitest run src/components/form/__tests__/Checkbox.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run lint**

```bash
cd /Users/alex/Projects/Work/codemie-dev/codemie-ui
npm run lint -- --max-warnings 0
```

Expected: no new errors or warnings.

- [ ] **Step 6: Commit**

```bash
git add src/styles/presets/lara/checkbox/index.ts \
        src/components/form/__tests__/Checkbox.test.tsx
git commit -m "EPMCDME-8509: Restore visible focus ring on Checkbox via border-accent token"
```

---

### Task 2: Add focus ring to RadioButton + regression test

> Test-first: same note as Task 1 — pure CSS/class addition. The Tab-focus test passes before the fix. Adding `peer` to the input does not affect DOM focusability; the ring classes on `box` are invisible in jsdom. Test is a regression guard.

**Files:**
- Modify: `src/components/form/RadioButton/RadioButton.tsx`
- Create: `src/components/form/RadioButton/__tests__/RadioButton.test.tsx`

**Interfaces:**
- Consumes: `RadioButton` from `@/components/form/RadioButton/RadioButton`
- Produces: nothing

- [ ] **Step 1: Write the regression test**

Create `src/components/form/RadioButton/__tests__/RadioButton.test.tsx`:

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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import RadioButton from '../RadioButton'

describe('RadioButton accessibility', () => {
  it('receives keyboard focus when tabbed to', async () => {
    const user = userEvent.setup()
    render(<RadioButton inputId="test-radio" label="Option A" />)

    await user.tab()

    expect(screen.getByRole('radio')).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run test to confirm it passes (GREEN — focusability pre-existing)**

```bash
npx vitest run src/components/form/RadioButton/__tests__/RadioButton.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Apply the fix to RadioButton.tsx**

In `src/components/form/RadioButton/RadioButton.tsx`, inside `customPT`:

**input** — add `peer` class:

```ts
// BEFORE
input: {
  className: 'absolute opacity-0 cursor-pointer z-10 w-full h-full left-0 top-0',
},
```

```ts
// AFTER
input: {
  className: 'peer absolute opacity-0 cursor-pointer z-10 w-full h-full left-0 top-0',
},
```

**box** — add focus-visible ring classes at the end of the `twMerge(...)` call. The full updated box className string:

```ts
box: {
  className: twMerge(
    'transition border min-w-[18px] w-[18px] h-[18px] inline-block rounded-full relative',
    'after:content-[""] after:block after:w-[9px] after:h-[9px] after:absolute',
    'after:top-[50%] after:left-[50%] after:rounded-full after:transform after:-translate-x-1/2 after:-translate-y-1/2',
    'after:scale-0 after:transition-transform after:duration-100 after:ease-in',
    'border-text-primary after:bg-text-primary',
    props.checked && 'after:scale-100 border-text-primary after:!bg-border-accent',
    'group-hover:border-border-accent group-hover:after:bg-border-accent',
    'peer-focus-visible:ring-2 peer-focus-visible:ring-border-accent'
  ),
},
```

> DOM structure note: PrimeReact RadioButton renders `input` before `box` inside `root` (same layout as Checkbox, which already uses the `peer` pattern). `peer` on input + `peer-focus-visible:` on box is safe. If a future PrimeReact version reorders the DOM, switching to `has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-accent` on the wrapping label (Tailwind 3.4.17 supports `has-*`) is the fallback.

- [ ] **Step 4: Run test again to confirm still GREEN**

```bash
npx vitest run src/components/form/RadioButton/__tests__/RadioButton.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run lint**

```bash
npm run lint -- --max-warnings 0
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/form/RadioButton/RadioButton.tsx \
        src/components/form/RadioButton/__tests__/RadioButton.test.tsx
git commit -m "EPMCDME-8509: Add visible focus ring to RadioButton via peer-focus-visible"
```

---

### Task 3: Gates — lint, full test suite, sonar, test-harness

**Files:** none (validation only)

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Record: total passed / failed / skipped → MR description.

- [ ] **Step 2: Run sonar-local with token**

```bash
SONAR_TOKEN=<token> npm run sonar-local
```

Without `SONAR_TOKEN` set it silently skips. The token is required; obtain it from the team secrets before running.

- [ ] **Step 3: Run test-harness**

```bash
npm run test-harness
```

Record: full pass/fail numbers → MR description (compliance 3.1/3.2 require this).

- [ ] **Step 4: Run code-review-orchestrator**

Invoke `sdlc-factory:code-review-orchestrator` and commit `code-review-final.json` into the task folder.

---

## Post-run report (do not fix — list for maintainer)

These items are out of scope for this run; they should become separate tickets:

1. **`accessibility-patterns.md` prescribes a non-existent token.** `.ai-run/guides/patterns/accessibility-patterns.md:12` and `:104` prescribe `focus:ring-2 focus:ring-primary-500`. The token `primary-500` does not exist in `tailwind.config.ts`. Tailwind falls back to its default ring colour (semi-transparent blue, unverified contrast). This guide defect caused EPMCDME-14283 and will cause further defects. Recommend a ticket to update the guide to `focus-visible:ring-1 focus-visible:ring-border-accent` and grep/fix `NavigationMore.tsx:131` and `:168` which already use the broken token.

2. **Other lara presets likely carry the same `/20` ring bug.** `src/styles/presets/lara/` exports `inputswitch`, `tag`, `dropdown`, and `checkbox`. Only `checkbox` was audited in this run. A grep for `ring-border-subtle/20` or any `/[0-9]+` opacity suffix on ring classes in those preset files would find candidates.

3. **Duplicated `FormGenAIPopup` component.** `src/pages/assistants/components/AssistantForm/components/FormGenAIPopup.tsx` and `src/pages/skills/components/FormGenAIPopup.tsx` appear to be copies. Both use the same Checkbox ("Do not show this popup"), both inherit the fix via the preset. Deduplication is a separate clean-up task.
