# EPMCDME-15061 — Hint Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unit test file for `src/components/Hint/Hint.tsx` that verifies the `appendTo={() => document.body}` contract introduced by the bug fix.

**Architecture:** Mock `@/components/Tooltip` with a `vi.fn()` spy to capture props at render time; assert `appendTo` is a function and that calling it returns `document.body`. No implementation changes — test file only.

**Tech Stack:** Vitest · React Testing Library · TypeScript

**Spec:** requirements inline (see acceptance criteria below)

## Acceptance criteria

- [ ] `src/components/Hint/__tests__/Hint.test.tsx` exists.
- [ ] A test asserts that when `hint` is provided, the `Tooltip` wrapper receives `appendTo` as a function whose return value is `document.body`.
- [ ] A test asserts `appendTo` is NOT the string `'self'`.
- [ ] All existing tests continue to pass.

## Global Constraints

- Test file location follows repo convention: `src/components/<Name>/__tests__/<Name>.test.tsx`.
- Commit carries ticket key `EPMCDME-15061` per repository git-workflow convention.

---

### Task 1: Unit tests for Hint component

**Test-first: yes — failing tests for `appendTo` contract (file does not exist yet, so every test fails)**

**Files:**
- Create: `src/components/Hint/__tests__/Hint.test.tsx`

**Interfaces:**
- Consumes: `src/components/Hint/Hint.tsx` (default export `Hint`)
- Consumes: `@/components/Tooltip` (mocked; default export captured as `MockTooltip`)
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write the test file**

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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Hint from '../Hint'

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: (props: any) => <svg data-testid="info-icon" {...props} />,
}))

const { MockTooltip } = vi.hoisted(() => ({
  MockTooltip: vi.fn(() => null),
}))

vi.mock('@/components/Tooltip', () => ({
  default: MockTooltip,
}))

describe('Hint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when hint prop is absent', () => {
    const { container } = render(<Hint id="test" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when hint prop is null', () => {
    const { container } = render(<Hint id="test" hint={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the info icon when hint is provided', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    expect(screen.getByTestId('info-icon')).toBeInTheDocument()
  })

  it('passes appendTo as a function to Tooltip', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(typeof props.appendTo).toBe('function')
  })

  it('appendTo function returns document.body', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.appendTo()).toBe(document.body)
  })

  it('does not pass appendTo="self" to Tooltip', () => {
    render(<Hint id="test-hint" hint="Some tooltip text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.appendTo).not.toBe('self')
  })

  it('passes the hint text as children to Tooltip', () => {
    render(<Hint id="test-hint" hint="Hint content" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.children).toBe('Hint content')
  })

  it('passes the correct target selector to Tooltip', () => {
    render(<Hint id="my-hint-id" hint="text" />)
    const [[props]] = MockTooltip.mock.calls as any
    expect(props.target).toBe('#my-hint-id')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail (file does not exist yet)**

```
npm run test:unit -- --reporter=verbose src/components/Hint
```

Expected: test collection error or all tests fail — confirms the test file is wired up before the implementation exists. (Because `Hint.tsx` already exists with the fix, tests should actually pass immediately — if they do at this step, the contract is already met and Step 3 is just a pass confirmation.)

- [ ] **Step 3: Confirm all Hint tests pass**

```
npm run test:unit -- --reporter=verbose src/components/Hint
```

Expected: all 8 tests pass. Quote the `Test Files` line from the output.

- [ ] **Step 4: Confirm no existing tests were broken**

```
npm run test:unit -- --reporter=verbose
```

Expected: same pass count as before this task; no new failures.

- [ ] **Step 5: Commit**

Follow the repository's existing commit-message convention (ticket key `EPMCDME-15061` in the subject). Stage only the new test file.
