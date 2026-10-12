# CLI Analytics Session Detail Harness Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `'Claude-Code'` literal in the CLI Analytics Session Details modal subtitle with the real `harness_name` field the backend now returns.

**Architecture:** One-field type addition (`SessionDetail.harness_name: string`) plus a one-line swap in `SessionModal.tsx`'s subtitle array. No data-layer change — the store/hook pass the API response through untransformed, so declaring the field is sufficient for it to flow through.

**Tech Stack:** React 18, TypeScript 5, Vitest + React Testing Library.

**Spec:** No `spec.md` for this task — requirements arrived inline from the caller (EPMCDME-15326 frontend follow-up). Technical analysis: `docs/superpowers/tasks/2026-10-05-harness-name-frontend/technical-analysis.md`.

**Commit per task using the repository's existing convention.**

## Global Constraints

- `harness_name` is required (`string`, never optional/nullable) — the backend always resolves it, falling back to `"Unknown"`.
- Only `SessionDetail` gets the new field; `SessionRow` is untouched (backend only added it to the detail model).
- `delivery_framework`, `SessionsView.tsx`, and `CLIInsightsTab.tsx`/`cliInsights/` are out of scope — no task touches them.

## Review Focus

- A session whose `harness_name` is `"Unknown"` (backend fallback) must still render as visible text in the subtitle, not be dropped by `.filter(Boolean)` — covered by Task 2's reliance on the existing filter behavior and worth an explicit assertion.
- `session` can be `undefined` while loading — `session?.harness_name` must not throw. Covered by Task 2 (optional chaining preserved).
- The new test file must not assert against `SessionBody`'s internals (it is mocked), only the header subtitle text.

---

## Acceptance criteria

- [ ] `SessionDetail.harness_name: string` added to `src/types/cliAnalytics.ts`; `SessionRow` unchanged.
- [ ] `SessionModal.tsx`'s subtitle no longer contains the literal `'Claude-Code'`; it renders `session?.harness_name` instead.
- [ ] A session with `harness_name: "Cursor"` renders "Cursor" (not "Claude-Code") in the Session Details header subtitle, proven by a new test.
- [ ] `useCliAnalyticsSession.test.ts`'s `MOCK_SESSION` fixture updated to satisfy the new required field.
- [ ] No change to `SessionRow`, `SessionsView.tsx`, `delivery_framework` behavior, or `CLIInsightsTab.tsx`.

---

### Task 1: Add `harness_name` to the `SessionDetail` type and fix the existing hook test fixture

**Files:**
- Modify: `src/types/cliAnalytics.ts:90-99`
- Modify: `src/pages/analytics/components/cli-analytics/hooks/__tests__/useCliAnalyticsSession.test.ts:28-41`

**Interfaces:**
- Produces: `SessionDetail.harness_name: string` — a required field every later task (Task 2, Task 3) reads via `session?.harness_name` or sets directly on mock session objects.

Test-first: no — this task is a required type/fixture change with no new behavior of its own to pin; the required field makes the current `MOCK_SESSION` fail TS compilation, so there is nothing to "fail" meaningfully first. Task 1's own correctness is verified by Task 3's new test, which is written test-first.

- [ ] **Step 1: Add the field to `SessionDetail`**

In `src/types/cliAnalytics.ts`, inside the `SessionDetail` interface (lines 90-99, which `extends SessionRow`), add `harness_name: string` as a new line directly after `events: SessionEvent[]` (line 91) — required, not optional, matching backend's always-resolved contract (falls back to `"Unknown"`, never null/undefined). Do not add it to `SessionRow` (lines 46-65).

- [ ] **Step 2: Update the hook test's mock fixture**

In `useCliAnalyticsSession.test.ts`, add `harness_name: 'Claude Code',` as a new line to the `MOCK_SESSION` object literal (lines 28-41), e.g. after `tool_call_count: 12,` (line 39). This satisfies the now-required field so the file still type-checks; the test's existing assertions (`toEqual(MOCK_SESSION)`) are unaffected since they compare the whole object.

- [ ] **Step 3: Verify the hook test file still passes**

Run: `npx vitest run --project unit src/pages/analytics/components/cli-analytics/hooks/__tests__/useCliAnalyticsSession.test.ts`
Expected: PASS (4 tests), confirming the fixture change didn't break existing assertions.

- [ ] **Step 4: Commit**

---

### Task 2: Replace the hardcoded `'Claude-Code'` literal in `SessionModal.tsx`

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx:34-39`

**Interfaces:**
- Consumes: `SessionDetail.harness_name: string` (from Task 1).
- Produces: subtitle string rendered into `Popup`'s `headerContent` — consumed by Task 3's test.

Test-first: yes — Task 3 writes `SessionModal.test.tsx` asserting the subtitle renders `session.harness_name` (e.g. "Cursor") and does not contain "Claude-Code"; that test fails against today's code (hardcoded literal) before this task's fix lands, then passes after. Because this task has no safe intermediate commit without the test existing, implement Task 2 and Task 3 together in sequence: write the failing test first (Task 3 Steps 1-2), then make this one-line fix, then verify (Task 3 Steps 3-4).

- [ ] **Step 1: Replace the literal**

In `SessionModal.tsx`, change line 35 from `'Claude-Code',` to `session?.harness_name,` inside the `subtitle` array (lines 34-39). Leave `.filter(Boolean).join(' · ')` (lines 41-42) and every other array entry (`model_name`, `repository`, `branch`, `delivery_framework`) untouched — `delivery_framework` is out of scope.

- [ ] **Step 2: Commit**

(Commit together with Task 3's test — see Task 3.)

---

### Task 3: Add `SessionModal.test.tsx` pinning the real harness name in the subtitle

**Files:**
- Create: `src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx`

**Interfaces:**
- Consumes: `useCliAnalyticsSession` (mocked directly, per the hook's existing shape `{ session, loading, error }`), `Popup`'s `headerContent` prop (ReactNode — rendered directly, not stringified, since `SessionModal` passes JSX here, unlike the string `header` prop `ExtendedSessionsModal` uses), `SessionBody` (mocked to a stub).

Test-first: yes — written and run (expected to fail against the current hardcoded `'Claude-Code'` literal) before Task 2's fix lands.

- [ ] **Step 1: Write the failing test**

Follow the Popup-mocking pattern from `ExtendedSessionsModal.test.tsx:25-46`, adapted for `headerContent` (ReactNode) instead of `header` (string):

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
import { describe, expect, it, vi } from 'vitest'

import type { SessionDetail } from '@/types/cliAnalytics'

import SessionModal from '../views/SessionModal'

vi.mock('@/components/Popup', () => ({
  default: ({ headerContent }: { headerContent?: React.ReactNode }) => (
    <div data-testid="popup">{headerContent}</div>
  ),
}))

vi.mock('../views/SessionBody', () => ({
  default: () => <div data-testid="session-body" />,
}))

const mockUseCliAnalyticsSession = vi.fn()
vi.mock('../hooks/useCliAnalyticsSession', () => ({
  useCliAnalyticsSession: () => mockUseCliAnalyticsSession(),
}))

const MOCK_SESSION: SessionDetail = {
  trace_id: 'abc123',
  developer_name: 'alice@co.com',
  repository: 'svc',
  branch: null,
  start_time: '2026-07-01T09:00:00Z',
  duration_ms: 45000,
  model_name: 'claude-sonnet-4-5',
  input_tokens: 8500,
  output_tokens: 1800,
  cost_usd: 0.085,
  tool_call_count: 12,
  harness_name: 'Cursor',
  events: [],
}

describe('SessionModal', () => {
  it('renders the session harness_name in the subtitle, not a hardcoded value', () => {
    mockUseCliAnalyticsSession.mockReturnValue({
      session: MOCK_SESSION,
      loading: false,
      error: null,
    })

    render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

    expect(screen.getByTestId('popup').textContent).toContain('Cursor')
    expect(screen.getByTestId('popup').textContent).not.toContain('Claude-Code')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx`
Expected: FAIL — subtitle contains `"Claude-Code"` (the current hardcoded literal), so `not.toContain('Claude-Code')` fails.

- [ ] **Step 3: Apply Task 2's fix**

Perform Task 2 Step 1 now (replace line 35's `'Claude-Code'` with `session?.harness_name` in `SessionModal.tsx`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/views/SessionModal.tsx src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx
```

Use the repository's existing commit-message convention (ticket key + summary) for the commit subject.

---

## Self-Review

**1. Requirements coverage:** Type addition → Task 1. Subtitle fix → Task 2 (+ Task 3's test proves it). Hook test fixture → Task 1 Step 2. New `SessionModal.test.tsx` → Task 3. No change to `SessionRow`/`SessionsView.tsx`/`delivery_framework`/`CLIInsightsTab.tsx` → honored by every task (none references those files); confirmed no task edits them.

**2. Placeholder scan:** None — every step names the exact file, line range, and either the one-line change or full new-symbol code.

**3. Type consistency:** `SessionDetail.harness_name: string` (Task 1) matches `session?.harness_name` (Task 2) and the `MOCK_SESSION.harness_name` fields in both test files (Task 1 Step 2, Task 3 Step 1).

**4. Review Focus:** `"Unknown"` fallback rendering — the existing `.filter(Boolean).join(' · ')` already handles any truthy string, including `"Unknown"`, so no new code path is needed; not pinned by a dedicated test since it is unchanged existing behavior, not new logic this task introduces. `session` undefined during loading — unchanged, optional chaining (`session?.harness_name`) preserved in Task 2 Step 1. Test file scope — Task 3's test only asserts header subtitle text, not `SessionBody` internals (mocked to a stub).

**5. Negative-constraints pass:**
- "backend only added it to the detail model, not the list-row model" → honored: no task touches `SessionRow` (`src/types/cliAnalytics.ts:46-65`) or `SessionsView.tsx`.
- "do not touch `delivery_framework`" → honored: Task 2 Step 1 explicitly leaves the `delivery_framework` array entry untouched.
- "do not touch `CLIInsightsTab.tsx`/`cliInsights/`" → honored: no task references that file or folder.
- "keep the existing `.filter(Boolean).join(' · ')` composition" → honored: Task 2 Step 1 explicitly preserves lines 41-42 unchanged.
- No whole-suite quality-gate, browser-verification, code-review, or commit-chaining task was added — each task ends in its own single commit per the header convention.
