# Skip-to-main-content link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give keyboard/screen-reader users a way to jump straight to page content, satisfying WCAG 2.1 "2.4.1 Bypass Blocks" (EPMCDME-8581).

**Architecture:** A new `SkipLink` component renders a visually-hidden anchor (`href="#main-content"`) as the first child of `App.tsx`, ahead of `Banner`. `PageLayout.tsx`'s single production `<main>` gets `id="main-content"` and `tabIndex={-1}` so the browser can move focus into it when the link is activated.

**Tech Stack:** React 19 + TypeScript, Tailwind (`sr-only` / `focus:not-sr-only` utilities), Vitest + React Testing Library.

## Global Constraints

- Every new/modified source file keeps the repo's Apache 2.0 license header (enforced by the `license-headers:check` pre-commit hook) — copy the exact 14-line header verbatim from `src/components/appLevel/Announcement.tsx:1-14`.
- Scope is the authenticated shell only: `src/App.tsx` and `src/components/Layouts/Layout/PageLayout.tsx`. Do not touch `StandaloneLayout.tsx` (explicitly deferred per spec).
- Use real project Tailwind tokens only: `bg-surface-base-primary`, `text-text-primary`, `ring-border-accent` (the `primary-500` / `text-white` tokens in `.ai-run/guides/patterns/accessibility-patterns.md` do not exist in this codebase — do not use them).
- No `.eslintrc.cjs` changes, no automated axe/a11y tooling additions (not installed in this repo).
- Commit messages follow this repo's convention: `EPMCDME-8581: Capital sentence` (plain, not Conventional Commits).

---

### Task 1: `SkipLink` component

**Files:**
- Create: `src/components/SkipLink/SkipLink.tsx`
- Test: `src/components/SkipLink/__tests__/SkipLink.test.tsx`

**Interfaces:**
- Consumes: nothing (prop-less component).
- Produces: `SkipLink` — default export, `React.FC`, no props. Later tasks (Task 2) import it as `import SkipLink from '@/components/SkipLink/SkipLink'` and render `<SkipLink />` with no props.

- [ ] **Step 1: Write the failing test**

Create `src/components/SkipLink/__tests__/SkipLink.test.tsx`:

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
import { describe, expect, it } from 'vitest'

import SkipLink from '../SkipLink'

describe('SkipLink', () => {
  it('renders a link to the main content landmark', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })

    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('is visually hidden until focused', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })

    expect(link).toHaveClass('sr-only')
    expect(link).toHaveClass('focus:not-sr-only')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SkipLink/__tests__/SkipLink.test.tsx`
Expected: FAIL — cannot find module `../SkipLink` (component doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/SkipLink/SkipLink.tsx`:

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

import { FC } from 'react'

const SkipLink: FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
               focus:rounded focus:bg-surface-base-primary focus:px-4 focus:py-2
               focus:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-accent"
  >
    Skip to main content
  </a>
)

export default SkipLink
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SkipLink/__tests__/SkipLink.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/SkipLink/SkipLink.tsx src/components/SkipLink/__tests__/SkipLink.test.tsx
git commit -m "EPMCDME-8581: Add SkipLink component"
```

**Test-first: yes — `SkipLink` module does not exist, so the test fails on import resolution before any implementation is written.**

---

### Task 2: Render `SkipLink` first in `App.tsx`

**Files:**
- Modify: `src/App.tsx:22,67` (add import at line 22 alphabetically among the `@/components/...` imports; render `<SkipLink />` as the new first child of `UnsavedChangesProvider`, immediately before the existing `<Banner />` at line 67)

**Interfaces:**
- Consumes: `SkipLink` (default export, no props) from Task 1 — `import SkipLink from '@/components/SkipLink/SkipLink'`.
- Produces: nothing consumed by later tasks — this task only changes render order in `App.tsx`.

- [ ] **Step 1: Add the import**

In `src/App.tsx`, insert this import in its alphabetical place among the existing `@/components/...` imports (after the `SessionExpiredPopup` import at line 24, before `ToastContainer` at line 25 — `SkipLink` sorts between them):

```tsx
import SkipLink from '@/components/SkipLink/SkipLink'
```

- [ ] **Step 2: Render `<SkipLink />` ahead of `<Banner />`**

In `src/App.tsx`, change:

```tsx
        <UnsavedChangesProvider>
          <Banner />
          <ToastContainer />
```

to:

```tsx
        <UnsavedChangesProvider>
          <SkipLink />
          <Banner />
          <ToastContainer />
```

- [ ] **Step 3: Run the existing test suite to confirm no regression**

Run: `npx vitest run`
Expected: PASS — no existing test renders `App.tsx` (confirmed zero test coverage for this file), so this is a smoke check that the change doesn't break an unrelated suite via a shared import path.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open the app in a browser, and press Tab once from page load. Expected: the very first focusable element is the "Skip to main content" link (visually revealed on focus), appearing even when a `Banner` message is active.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "EPMCDME-8581: Render SkipLink first in App"
```

**Test-first: no — `App.tsx` has zero existing test coverage (heavy provider nesting with no render harness in this repo, confirmed during technical research), and building one is out of scope per the spec. This is a one-line JSX reordering verified by Task 1's own component test plus the manual Tab-key check in Step 4, not new runtime behavior that needs its own harness.**

---

### Task 3: Main landmark in `PageLayout.tsx`

**Files:**
- Modify: `src/components/Layouts/Layout/PageLayout.tsx:66-71`
- Modify: `src/components/Layouts/Layout/__tests__/PageLayout.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: the app's sole `<main>` landmark now carries `id="main-content"` (the fragment target `SkipLink` from Task 1 points to) and `tabIndex={-1}` (so it accepts programmatic focus).

- [ ] **Step 1: Write the failing test**

In `src/components/Layouts/Layout/__tests__/PageLayout.test.tsx`, add this test inside the existing `describe('PageLayout', ...)` block:

```tsx
  it('exposes the main landmark as the skip-link target', () => {
    render(
      <PageLayout title="Test Title">
        <div>Content</div>
      </PageLayout>
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabIndex', '-1')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Layouts/Layout/__tests__/PageLayout.test.tsx`
Expected: FAIL — rendered `<main>` has no `id` or `tabIndex` attribute yet.

- [ ] **Step 3: Write minimal implementation**

In `src/components/Layouts/Layout/PageLayout.tsx`, change:

```tsx
    <main
      className="flex w-full h-full min-w-0 bg-surface-base-primary bg-contain bg-no-repeat bg-bottom"
      style={{
        backgroundImage: !isDark && isContentGradientEnabled ? `url(${contentGradient})` : 'none',
      }}
    >
```

to:

```tsx
    <main
      id="main-content"
      tabIndex={-1}
      className="flex w-full h-full min-w-0 bg-surface-base-primary bg-contain bg-no-repeat bg-bottom"
      style={{
        backgroundImage: !isDark && isContentGradientEnabled ? `url(${contentGradient})` : 'none',
      }}
    >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Layouts/Layout/__tests__/PageLayout.test.tsx`
Expected: PASS (5 tests, including the 4 pre-existing ones — no regression).

- [ ] **Step 5: Manual verification**

With `npm run dev` still running from Task 2, Tab to the "Skip to main content" link and press Enter/activate it. Expected: focus moves into the page's `<main>` region (verify via browser dev tools that `document.activeElement` is the `<main id="main-content">` element).

- [ ] **Step 6: Commit**

```bash
git add src/components/Layouts/Layout/PageLayout.tsx src/components/Layouts/Layout/__tests__/PageLayout.test.tsx
git commit -m "EPMCDME-8581: Add main-content landmark id to PageLayout"
```

**Test-first: yes — the new assertion on `id`/`tabIndex` fails against the current `<main>` markup before the attributes are added.**

---

## Self-Review Notes

- **Spec coverage:** Problem (WCAG 2.4.1) → Task 1 (skip link exists) + Task 3 (target landmark exists) + Task 2 (correct DOM order ahead of `Banner`). Scope (authenticated shell only, `StandaloneLayout` excluded) → no task touches `StandaloneLayout.tsx`. Testing section of the spec → Tasks 1 and 3 match the spec's stated test files exactly; Task 2 matches the spec's stated "no new App.tsx test" decision. Risks/notes (no lint enforcement, manual Tab verification) → covered by Task 2 Step 4 and Task 3 Step 5.
- **Placeholder scan:** no TBD/TODO; all code blocks are complete and copy-pasteable including full license headers.
- **Type consistency:** `SkipLink` is a prop-less `FC` in Task 1, imported and rendered with no props in Task 2 — consistent. `id`/`tabIndex` values (`"main-content"`, `-1`) match between Task 1's anchor `href="#main-content"` and Task 3's `<main id="main-content">`.
