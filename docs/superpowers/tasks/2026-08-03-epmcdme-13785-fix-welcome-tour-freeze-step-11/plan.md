# Fix Welcome Tour Freeze on Step 11 (Analytics) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the welcome tour freezing on step 11 when the Analytics nav link is highlighted, caused by the `prebuilt-assistants` step activating with an absent DOM target that blocks all mouse interaction.

**Architecture:** Three cooperating bugs: (1) the `prebuilt-assistants` condition always evaluates true; (2) the actual DOM target (`[data-onboarding="prebuilt-assistants"]`) lives in `NavigationAssistants` which is not rendered by `Navigation.tsx` — the attribute must move to `NavigationPinnedSection`; (3) `OnboardingSpotlight` retains the previous step's spotlight position when the target element is not found on transition. Fixing all three eliminates the freeze and guards against recurrence.

**Tech Stack:** React 18, Valtio, vitest, @testing-library/react, jsdom

## Global Constraints

- Commit message format: `EPMCDME-13785: Capital sentence` — enforced by Tekton CI
- License header required on every new source file (Apache 2.0 block as seen in sibling files)
- Pre-commit hooks: lint-staged, license-headers:check, secrets:check, sonar-local — never use `--no-verify`
- Test files: vitest, jsdom environment, `@testing-library/react` for component tests
- Test runner command: `npx vitest run --project unit <path>`

---

## File Structure

| Action | Path | Change |
|---|---|---|
| Modify | `src/configs/onboarding/navigationIntroduction.tsx` | Fix `prebuilt-assistants` condition (line 295–301) |
| Modify | `src/components/Navigation/NavigationPinnedSection/NavigationPinnedSection.tsx` | Add `data-onboarding="prebuilt-assistants"` to the inner conditional div (line 352–361) |
| Modify | `src/components/Onboarding/OnboardingSpotlight.tsx` | Add `setPosition(null)` at top of useEffect to clear stale position on target change (line 36–67) |
| Create | `src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts` | Unit tests for the `prebuilt-assistants` condition |
| Modify | `src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx` | Add assertions for `data-onboarding="prebuilt-assistants"` presence/absence |
| Create | `src/components/Onboarding/__tests__/OnboardingSpotlight.test.tsx` | Unit tests for stale-position clearing |

---

### Task 1: Fix `prebuilt-assistants` step condition

**Files:**
- Modify: `src/configs/onboarding/navigationIntroduction.tsx:295-301`
- Create: `src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts`

**Interfaces:**
- Consumes: `document.querySelector` (JSDOM in tests, real DOM at runtime)
- Produces: corrected `prebuilt-assistants` condition used by Tasks 2 and 3

**Background:** The current condition body is:
```ts
const assistantsSection = document.querySelector(
  'header nav[aria-label="bottom-nav-links"]'
)
return !!assistantsSection?.querySelector('div[class*="flex"]')
```
`div[class*="flex"]` matches any div containing "flex" in any class, so the section always has one. It must be replaced with a direct check for the actual `target` selector.

- [ ] **Step 1: Write the failing test**

Create `src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts` with this exact content (including the Apache 2.0 license header):

```ts
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

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/Onboarding/FirstTimeWelcomeContent', () => ({ default: () => null }))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: { completeOnboarding: vi.fn(), navigationExpanded: false, toggleNavigationExpanded: vi.fn() },
}))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/utils/enterpriseEdition', () => ({ isEnterpriseEdition: vi.fn(() => false) }))
vi.mock('@/utils/onboarding', () => ({
  findNavLinkByText: vi.fn(() => null),
  getElementPosition: vi.fn(() => null),
}))

import { navigationIntroductionFlow } from '@/configs/onboarding/navigationIntroduction'

describe('navigationIntroductionFlow — prebuilt-assistants condition', () => {
  const step = navigationIntroductionFlow.steps.find((s) => s.id === 'prebuilt-assistants')!
  const condition = step.condition!

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns false when [data-onboarding="prebuilt-assistants"] is absent from DOM', () => {
    expect(condition()).toBe(false)
  })

  it('returns true when [data-onboarding="prebuilt-assistants"] exists in DOM', () => {
    const el = document.createElement('div')
    el.setAttribute('data-onboarding', 'prebuilt-assistants')
    document.body.appendChild(el)

    expect(condition()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run --project unit src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts
```

Expected: The first test (`returns false when absent`) **fails** — the current condition returns `true` even when the element is absent.

- [ ] **Step 3: Fix the condition in `navigationIntroduction.tsx`**

In `src/configs/onboarding/navigationIntroduction.tsx`, replace lines 295–301 (the `prebuilt-assistants` condition):

```ts
      condition: () => {
        const assistantsSection = document.querySelector(
          'header nav[aria-label="bottom-nav-links"]'
        )
        return !!assistantsSection?.querySelector('div[class*="flex"]')
      },
```

With:

```ts
      condition: () => !!document.querySelector('[data-onboarding="prebuilt-assistants"]'),
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run --project unit src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts
```

Expected: Both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/configs/onboarding/navigationIntroduction.tsx \
        src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts
git commit -m "EPMCDME-13785: Fix prebuilt-assistants condition to check actual target element"
```

---

### Task 2: Move `data-onboarding="prebuilt-assistants"` to `NavigationPinnedSection`

**Files:**
- Modify: `src/components/Navigation/NavigationPinnedSection/NavigationPinnedSection.tsx:352-361`
- Modify: `src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx`

**Interfaces:**
- Consumes: `helpAssistantsFetched` and `allItems` from `NavigationPinnedSection` internal state
- Produces: `[data-onboarding="prebuilt-assistants"]` present in DOM iff `helpAssistantsFetched && allItems.length > 0`

**Background:** `NavigationAssistants` (which currently holds the attribute) is not rendered by `Navigation.tsx`. The actual help-assistants section is rendered by `NavigationPinnedSection`. The attribute must move there so the condition check (Task 1) and the spotlight target both resolve to the same real DOM node.

Place the attribute on the **inner conditional div** that only renders when `helpAssistantsFetched && allItems.length > 0` — this keeps condition and target consistent (both absent when assistants haven't loaded).

- [ ] **Step 1: Write the failing test**

Open `src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx`. Read the existing mock setup at the top of the file to understand how `mockAssistantsStore` is declared.

Add these two tests inside the existing `describe` block, after the final existing test:

```tsx
  describe('data-onboarding="prebuilt-assistants" attribute', () => {
    it('is absent when helpAssistantsFetched is false', () => {
      mockAssistantsStore.helpAssistantsFetched = false
      mockAssistantsStore.helpAssistants = [
        { id: 'a', slug: 'onboarding', name: 'Onboarding', description: '', icon_url: '' },
      ]
      const { container } = render(<NavigationPinnedSection />)
      expect(container.querySelector('[data-onboarding="prebuilt-assistants"]')).toBeNull()
    })

    it('is present when helpAssistantsFetched is true and items exist', () => {
      mockAssistantsStore.helpAssistantsFetched = true
      mockAssistantsStore.helpAssistants = [
        { id: 'a', slug: 'onboarding', name: 'Onboarding', description: '', icon_url: '' },
      ]
      const { container } = render(<NavigationPinnedSection />)
      expect(container.querySelector('[data-onboarding="prebuilt-assistants"]')).not.toBeNull()
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run --project unit src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx
```

Expected: Both new tests FAIL — `data-onboarding="prebuilt-assistants"` is not present anywhere in `NavigationPinnedSection`.

- [ ] **Step 3: Add the attribute to `NavigationPinnedSection.tsx`**

In `src/components/Navigation/NavigationPinnedSection/NavigationPinnedSection.tsx`, locate the return statement's inner conditional div (around line 352). The current JSX is:

```tsx
      {helpAssistantsFetched && allItems.length > 0 && (
        <div
          className={cn(
            'flex flex-col gap-1.5 overflow-hidden h-full justify-end pb-[18px]',
            !navigationExpanded && 'items-center'
          )}
        >
```

Add `data-onboarding="prebuilt-assistants"` to that div:

```tsx
      {helpAssistantsFetched && allItems.length > 0 && (
        <div
          data-onboarding="prebuilt-assistants"
          className={cn(
            'flex flex-col gap-1.5 overflow-hidden h-full justify-end pb-[18px]',
            !navigationExpanded && 'items-center'
          )}
        >
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run --project unit src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx
```

Expected: All tests in the file PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navigation/NavigationPinnedSection/NavigationPinnedSection.tsx \
        src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx
git commit -m "EPMCDME-13785: Move data-onboarding prebuilt-assistants to NavigationPinnedSection"
```

---

### Task 3: Fix `OnboardingSpotlight` stale position on target change

**Files:**
- Modify: `src/components/Onboarding/OnboardingSpotlight.tsx:36-67`
- Create: `src/components/Onboarding/__tests__/OnboardingSpotlight.test.tsx`

**Interfaces:**
- Consumes: `target` prop (string selector or function), `getElementPosition` from `@/utils/onboarding`
- Produces: `position` state is null immediately after `target` changes to a selector whose element is absent

**Background:** The current `useEffect` only calls `setPosition` when `getElementPosition` returns a value, preserving stale position from the previous step. Adding `setPosition(null)` at the top of the effect (after the `!target` guard) resets position on every target change — the delayed retries (`t1`, `t2`) then re-populate it when the element resolves.

- [ ] **Step 1: Write the failing test**

Create `src/components/Onboarding/__tests__/OnboardingSpotlight.test.tsx` with this exact content:

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

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/onboarding', () => ({
  getElementPosition: vi.fn(),
}))
vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: vi.fn(() => '#9E00FF'),
}))

import { getElementPosition } from '@/utils/onboarding'
import { OnboardingSpotlight } from '../OnboardingSpotlight'

const mockGetElementPosition = vi.mocked(getElementPosition)

const FOUND_POSITION = { top: 10, left: 20, width: 100, height: 50 }

describe('OnboardingSpotlight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when target element is not found', () => {
    mockGetElementPosition.mockReturnValue(null)
    const { container } = render(<OnboardingSpotlight target="[data-missing]" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the spotlight div when target element is found', () => {
    mockGetElementPosition.mockReturnValue(FOUND_POSITION)
    const { container } = render(<OnboardingSpotlight target="[data-found]" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('clears stale position when target prop changes to a selector whose element is absent', () => {
    // First render: element found → spotlight visible
    mockGetElementPosition.mockReturnValue(FOUND_POSITION)
    const { container, rerender } = render(<OnboardingSpotlight target="[data-analytics]" />)
    expect(container.firstChild).not.toBeNull()

    // Rerender with new target whose element is absent
    mockGetElementPosition.mockReturnValue(null)
    rerender(<OnboardingSpotlight target="[data-prebuilt-assistants]" />)

    // Stale analytics spotlight must be gone
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run --project unit src/components/Onboarding/__tests__/OnboardingSpotlight.test.tsx
```

Expected: The third test (`clears stale position`) FAILS — current code retains `FOUND_POSITION` when `getElementPosition` returns `null` after the target changes.

- [ ] **Step 3: Fix `OnboardingSpotlight.tsx`**

In `src/components/Onboarding/OnboardingSpotlight.tsx`, update the `useEffect` to reset position on every target change. The full updated effect (lines 36–67) should be:

```ts
  useEffect(() => {
    if (!target) {
      setPosition(null)
      return
    }

    setPosition(null)

    const updatePosition = () => {
      const elementPosition = getElementPosition(target)
      if (elementPosition) {
        setPosition(elementPosition)
      }
    }

    updatePosition()

    const t1 = setTimeout(updatePosition, 100)
    const t2 = setTimeout(updatePosition, 300)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [target])
```

Also remove the comment that was rationalizing the old behavior:
```ts
      // Only update when the element is actually found — avoids clearing the backdrop
      // when the element is momentarily absent (e.g. between step transitions)
```
(That comment justified NOT clearing on step transition — it is now incorrect.)

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run --project unit src/components/Onboarding/__tests__/OnboardingSpotlight.test.tsx
```

Expected: All three tests PASS.

- [ ] **Step 5: Run full unit suite to check for regressions**

```bash
npx vitest run --project unit
```

Expected: All tests pass. If any onboarding-related test fails, investigate before proceeding.

- [ ] **Step 6: Commit**

```bash
git add src/components/Onboarding/OnboardingSpotlight.tsx \
        src/components/Onboarding/__tests__/OnboardingSpotlight.test.tsx
git commit -m "EPMCDME-13785: Clear stale spotlight position on target change"
```

---

## Self-Review

**Spec coverage:**
- Bug 1 (always-true condition): ✅ Task 1 fixes and tests it
- Bug 2 (target attribute on unmounted component): ✅ Task 2 moves attribute and tests presence
- Bug 3 (stale spotlight position): ✅ Task 3 fixes and tests it
- Freeze / overlay blocking: ✅ Fixed by combination of Tasks 1+2 (step excluded or spotlight clears)
- Tour restart after reload (secondary symptom): ✅ Resolved by fixing the freeze — `completeFlow`/`skipFlow` can now be reached

**Placeholder scan:** No placeholders found. All test code is complete. All implementation changes are shown.

**Type consistency:** `ElementPosition | null` used consistently in `OnboardingSpotlight.tsx` (matches `getElementPosition` return type). No type changes introduced.

**Test-first line per task:**
- Task 1: yes — condition test written before fix
- Task 2: yes — attribute presence test written before attribute added
- Task 3: yes — stale-position test written before fix
