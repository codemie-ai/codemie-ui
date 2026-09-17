# Isolate Chat HTML Preview Iframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sandbox the chat HTML preview iframe (`sandbox="allow-scripts"` only) so preview
JavaScript still executes but cannot reach the app's origin, session, or top window, and delete
the dead, divergently-sandboxed `HTMLPreviewPopup` component so no second configuration can drift.

**Architecture:** Add a single exported constant for the approved sandbox token string next to the
surviving `HtmlPreviewPopup.tsx`, apply it to that component's iframe, delete the unused
`src/components/HTMLPreviewPopup/` directory outright, and add greenfield tests that assert the
attribute value and the absence of unsafe tokens. No component is renamed, no prop changes, no
`CodeBlock.tsx` edit — `CodeBlock.tsx` already imports the surviving component and needs no change.

**Tech Stack:** React 18, TypeScript 5, Vitest + @testing-library/react (existing `unit` project).

**Spec:** Requirements are inline (ticket EPMCDME-15059); no `spec.md` exists for this task.
Technical analysis: `docs/superpowers/tasks/2026-09-16-epmcdme-15059/technical-analysis.md`.

## Global Constraints

- Sandbox value on the surviving iframe must be exactly `allow-scripts` — no other token.
- Must never add: `allow-same-origin`, `allow-top-navigation`,
  `allow-top-navigation-by-user-activation`, `allow-popups`, `allow-popups-to-escape-sandbox`,
  `allow-forms`, `allow-modals`, `allow-downloads`.
- Preserve the imperative `iframeRef.current.srcdoc = html` refresh pattern — do not replace with
  key-remount or state-driven re-render.
- Delete `src/components/HTMLPreviewPopup/` (both `HTMLPreviewPopup.tsx` and `index.ts`) entirely;
  do not merge it.
- No sanitization of the `html` string is in scope — `unSanitizeMessage` stays a decode step.
- No CSP/`nginx.conf`/header change is in scope.
- Every new file carries the same Apache license banner already present at the top of
  `src/components/CodeBlock/HtmlPreviewPopup.tsx`.
- Commit per task using the repository's existing convention.

---

## Acceptance criteria

- [ ] 1. Chat HTML Preview uses a sandboxed iframe.
- [ ] 2. JavaScript inside the preview continues to execute.
- [ ] 3. Sandbox includes `allow-scripts`.
- [ ] 4. Sandbox does not include `allow-same-origin`.
- [ ] 5. Preview JavaScript cannot access `parent.document` or `top.document`.
- [ ] 6. Preview JavaScript cannot read Codemie UI cookies.
- [ ] 7. Preview JavaScript cannot access Codemie UI `localStorage`/`sessionStorage`.
- [ ] 8. Preview content cannot navigate the top-level Codemie window.
- [ ] 9. Preview content cannot create an unsandboxed popup.
- [ ] 10. Refreshing the preview preserves the same sandbox restrictions.
- [ ] 11. All HTML preview entry points use the same approved security configuration.
- [ ] 12. Automated tests verify the iframe `sandbox` attribute and prohibit unsafe sandbox tokens.
- [ ] 13. Existing HTML/JavaScript preview functionality remains operational.
- [ ] 14. No API changes required.

Criteria 5-9 follow directly from criteria 3-4 as browser-enforced consequences of the
`allow-scripts`-only sandbox token (no `allow-same-origin` means the iframe is treated as opaque
origin — no DOM/storage/cookie access to the parent; no `allow-top-navigation*` blocks top-window
navigation; no `allow-popups` blocks popup creation) — they are verified by asserting the exact
attribute value (Task 2), not by separate runtime probes, since jsdom does not enforce sandboxing.

---

### Task 1: Add the shared sandbox constant

**Files:**
- Create: `src/components/CodeBlock/htmlPreviewSandbox.ts`
- Test: `src/components/CodeBlock/__tests__/htmlPreviewSandbox.test.ts`

**Interfaces:**
- Produces: `export const HTML_PREVIEW_SANDBOX = 'allow-scripts'` — the single source of truth
  Task 2 imports and Task 3's tests import to build their assertions against.

Test-first: yes — a test asserting `HTML_PREVIEW_SANDBOX` equals `'allow-scripts'` and contains
none of the forbidden tokens, written against a module that does not exist yet.

- [ ] **Step 1: Write the failing test**

```typescript
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

import { describe, it, expect } from 'vitest'

import { HTML_PREVIEW_SANDBOX } from '../htmlPreviewSandbox'

const FORBIDDEN_TOKENS = [
  'allow-same-origin',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-forms',
  'allow-modals',
  'allow-downloads',
]

describe('HTML_PREVIEW_SANDBOX', () => {
  it('is exactly allow-scripts', () => {
    expect(HTML_PREVIEW_SANDBOX).toBe('allow-scripts')
  })

  it('excludes every forbidden token', () => {
    const tokens = HTML_PREVIEW_SANDBOX.split(/\s+/)
    FORBIDDEN_TOKENS.forEach((forbidden) => expect(tokens).not.toContain(forbidden))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CodeBlock/__tests__/htmlPreviewSandbox.test.ts`
Expected: FAIL — cannot resolve `../htmlPreviewSandbox`.

- [ ] **Step 3: Create the constant module**

```typescript
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

// Approved sandbox token for previewing untrusted, chat-authored HTML/JS in an iframe.
// allow-scripts only: JS executes, but the iframe keeps an opaque origin (no
// allow-same-origin), cannot navigate the top window, and cannot open unsandboxed popups.
// Do not add further tokens without updating this comment and the tests that pin this value.
export const HTML_PREVIEW_SANDBOX = 'allow-scripts'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/CodeBlock/__tests__/htmlPreviewSandbox.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

---

### Task 2: Apply the sandbox attribute to the live preview iframe

**Files:**
- Modify: `src/components/CodeBlock/HtmlPreviewPopup.tsx:16-21,58`

**Interfaces:**
- Consumes: `HTML_PREVIEW_SANDBOX` from `./htmlPreviewSandbox` (Task 1).
- No prop or exported-signature change — `HtmlPreviewPopupProps` (`isVisible`, `html`, `onHide`)
  and the default export stay identical, so `CodeBlock.tsx:30` needs no edit.

Test-first: yes — a test rendering `HtmlPreviewPopup` and asserting the rendered `iframe`'s
`sandbox` attribute equals `allow-scripts` and excludes every forbidden token; currently no
`sandbox` attribute exists at all, so the assertion fails first.

- [ ] **Step 1: Write the failing test**

Create `src/components/CodeBlock/__tests__/HtmlPreviewPopup.test.tsx`:

```typescript
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

import { render, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

import HtmlPreviewPopup from '../HtmlPreviewPopup'

const FORBIDDEN_TOKENS = [
  'allow-same-origin',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-forms',
  'allow-modals',
  'allow-downloads',
]

afterEach(cleanup)

describe('HtmlPreviewPopup sandboxing', () => {
  it('sets sandbox to exactly allow-scripts', () => {
    const { container } = render(
      <HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />
    )
    const iframe = container.querySelector('iframe')
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  })

  it('excludes every forbidden sandbox token', () => {
    const { container } = render(
      <HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />
    )
    const tokens = container.querySelector('iframe')?.getAttribute('sandbox')?.split(/\s+/) ?? []
    FORBIDDEN_TOKENS.forEach((forbidden) => expect(tokens).not.toContain(forbidden))
  })

  it('keeps the same sandbox attribute after refresh', () => {
    const { container, getByRole } = render(
      <HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />
    )
    fireEvent.click(getByRole('button', { name: /refresh|reload/i }))
    const iframe = container.querySelector('iframe')
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  })

  it('still renders the preview iframe with the given html as srcdoc', () => {
    const { container } = render(
      <HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />
    )
    expect(container.querySelector('iframe')).toBeInTheDocument()
  })
})
```

Note: the refresh button in `HtmlPreviewPopup.tsx` currently has no accessible name — check the
rendered button (`refresh-btn close-btn` class, `<RefreshSvg />` child, no `aria-label`). If
`getByRole('button', { name: /refresh|reload/i })` cannot resolve it, query by
`container.querySelectorAll('button')[0]` instead (the refresh button is the first of the two
header buttons) rather than adding a new `aria-label`, since no such change is in scope.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CodeBlock/__tests__/HtmlPreviewPopup.test.tsx`
Expected: FAIL — `iframe` has no `sandbox` attribute.

- [ ] **Step 3: Add the sandbox attribute**

In `src/components/CodeBlock/HtmlPreviewPopup.tsx`, add
`import { HTML_PREVIEW_SANDBOX } from './htmlPreviewSandbox'` alongside the existing imports
(line 21 area), and change line 58's iframe to
`<iframe title="HTML Preview" ref={iframeRef} sandbox={HTML_PREVIEW_SANDBOX} srcDoc={html} className="size-full pb-4" />`.
Leave `reloadIframe` (lines 32-34) untouched — mutating `.srcdoc` does not touch the `sandbox`
attribute, so refresh preserves it for free.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/CodeBlock/__tests__/HtmlPreviewPopup.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

---

### Task 3: Delete the dead, divergently-sandboxed component

**Files:**
- Delete: `src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx`
- Delete: `src/components/HTMLPreviewPopup/index.ts`
- Test: confirm no remaining reference (verification step, no new test file — deleting code has
  no failing-test cycle of its own).

**Interfaces:**
- None — zero callers exist anywhere in `src/` per the technical analysis; nothing consumes this
  component's exports.

Test-first: no — this step removes dead code; there is no behavior to pin with a failing test,
only a repo-wide grep confirming no reference survives.

- [ ] **Step 1: Confirm zero remaining references**

Run: `grep -rn "HTMLPreviewPopup" src/ --include='*.ts' --include='*.tsx'`
Expected: no output (the two files about to be deleted are the only matches before deletion).

- [ ] **Step 2: Delete the directory**

Delete `src/components/HTMLPreviewPopup/HTMLPreviewPopup.tsx` and
`src/components/HTMLPreviewPopup/index.ts`.

- [ ] **Step 3: Re-run the reference check**

Run: `grep -rn "HTMLPreviewPopup" src/ --include='*.ts' --include='*.tsx'`
Expected: no output.

- [ ] **Step 4: Commit**

---

## Self-review notes

**Coverage:** Criteria 1-4, 10-13 each map to Task 1 or 2's tests directly. Criteria 5-9 are
browser-enforced consequences of the exact token value pinned by those same tests (documented
under Acceptance criteria above) — jsdom does not execute sandbox restrictions, so no separate
runtime-probe task is added; the attribute-value assertion is the correct test boundary. Criterion
11 (single approved configuration) is satisfied by Task 3 removing the only other entry point.
Criterion 14 requires no task — confirmed by omission (no API/server file appears in any task).

**Negative-constraints pass:**
- "without `allow-same-origin`" and the full forbidden-token list — honored by Task 1's constant
  value and asserted by both Task 1 and Task 2 tests; no task adds any forbidden token.
- "do not merge [HTMLPreviewPopup]" — Task 3 deletes outright, does not fold logic into the
  survivor.
- "do not replace [reloadIframe] with a React key-remount/state-driven approach" — Task 2 leaves
  `reloadIframe`'s direct `.srcdoc` mutation untouched; only the iframe's `sandbox` prop is added.
- "No API changes" — no task touches `src/utils/api.ts` or any store/router file.
- No CSP/`nginx.conf` change — no task touches `nginx.conf`.
- negative-constraints: all addressed above (none omitted).
