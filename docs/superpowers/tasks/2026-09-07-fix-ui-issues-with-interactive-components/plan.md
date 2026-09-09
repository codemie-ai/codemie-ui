# EPMCDME-14725 — A2UI Interactive Component UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LLM-generated A2UI interactive surfaces render in the product typeface and the product's own control styling, read as read-only when they are read-only, stay inside the chat column at narrow widths, and never offer live controls in the read-only shared-conversation view.

**Architecture:** Seven independent defects, each fixed at its own layer. Typography and the read-only affordance are token/CSS changes in `src/a2ui/theme.css`, mirroring the `--font-family-body-sans` pattern already used by `Markdown.scss` and `ThoughtDocument.scss`. The narrow-width overflow is fixed by letting the SDK's inline-styled `Row` wrap, plus a graceful clip on our own `ButtonRenderer` label. The shared-view leak is a one-condition change in `ChatA2uiBlock.isSurfaceActive`, reading `isSharedPage` from the existing `useChatContext`.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind (`tailwindcss-themer` design tokens), `@a2ui/react` 0.10.2 / `@a2ui/web_core` 0.10.6 pinned to catalog `v0_9`, Vitest + Testing Library.

**Spec:** No spec — `sdlc-light` run. Requirements come from Jira EPMCDME-14725 acceptance criteria; codebase context is `docs/superpowers/tasks/2026-09-07-fix-ui-issues-with-interactive-components/technical-analysis.md`.

## Global Constraints

- Branch: `EPMCDME-14725_fix-interactive-components-ui`, cut from `origin/main` at `4b63957`.
- Commit subject format: `EPMCDME-14725: Capital sentence` — first word after the colon capitalised, no trailing period. Enforced by Tekton CI.
- Never mention Jira ticket IDs, EPAM, internal URLs or people inside source files. The ticket belongs in the branch name, commit subject and MR only.
- `.ai-run/guides/styling/styling-guide.md` mandates "Tailwind only, no custom CSS". `src/a2ui/theme.css` is the sanctioned exception: the published `@a2ui/react` build ships CSS-module class maps that came out empty, so its elements render `class="undefined"` and cannot be reached by utility classes. Every change in this plan that lands in `theme.css` does so because the target element is SDK-owned markup with no class hook; changes to markup we own go in Tailwind.
- Code comments: at most one short line where the reason is not evident from the code. Rationale belongs in the MR, not the source.
- Test command: `npx vitest run <path>`. Lint: `npm run lint`.

---

### Task 1: A2UI surfaces inherit the product body typeface

Chat prose (`.markdown`) computes `Geist, Arial, Helvetica, sans-serif`; an A2UI surface in the same message computes `GeistMono, monospace`, because `.a2ui-scope` declares `font-family: inherit` and inherits from `body`, which is mono. The product's sans stack is published as the `--font-family-body-sans` custom property on `:root` in `src/assets/stylesheets/main.scss` and consumed the same way by `Markdown.scss:48` and `ThoughtDocument.scss:18`. This task makes `.a2ui-scope` a third consumer.

**Files:**
- Modify: `src/a2ui/theme.css:100` (the `font-family: inherit` declaration inside the `.a2ui-scope` block)
- Test: `src/a2ui/__tests__/theme.font.test.ts` (create)

**Interfaces:**
- Consumes: `--font-family-body-sans`, defined on `:root` in `src/assets/stylesheets/main.scss`.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `src/a2ui/__tests__/theme.font.test.ts`. It is a source-text test, matching the established pattern in `src/components/markdown/__tests__/Markdown.font.integration.test.tsx` — jsdom does not resolve custom properties across stylesheets, so the assertion is on the stylesheet source.

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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

describe('theme.css font wiring', () => {
  let css: string

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../theme.css'), 'utf-8')
  })

  it('binds the surface to the shared body sans custom property', () => {
    expect(css).toContain('font-family: var(--font-family-body-sans')
  })

  it('does not inherit the mono body font', () => {
    expect(css).not.toMatch(/font-family:\s*inherit/)
  })

  it('falls back to the Geist sans stack when the property is unset', () => {
    const decl = css.match(/font-family: var\(--font-family-body-sans[^;]*;/)
    expect(decl).not.toBeNull()
    expect(decl?.[0]).toContain('Geist, Arial, Helvetica, sans-serif')
  })

  it('does not duplicate the sans stack outside the fallback', () => {
    const occurrences = css.match(/Geist, Arial, Helvetica, sans-serif/g) ?? []
    expect(occurrences).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/a2ui/__tests__/theme.font.test.ts`
Expected: FAIL — `binds the surface to the shared body sans custom property` and `does not inherit the mono body font` both fail; `theme.css` still says `font-family: inherit`.

- [ ] **Step 3: Write minimal implementation**

In `src/a2ui/theme.css`, replace line 100 (`  font-family: inherit;`, the last declaration inside the `.a2ui-scope` block) with:

```css
  /* Body inherits the mono stack; the surface is prose-adjacent and follows the chat. */
  font-family: var(--font-family-body-sans, Geist, Arial, Helvetica, sans-serif);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/a2ui/__tests__/theme.font.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Verify no A2UI snapshot or smoke test regressed**

Run: `npx vitest run src/a2ui`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/a2ui/theme.css src/a2ui/__tests__/theme.font.test.ts
git commit -m "EPMCDME-14725: Render interactive surfaces in the product body font"
```

---

### Task 2: Read-only surfaces look read-only

A submitted surface, and every surface in `/share/conversations/:token`, is wrapped in `<fieldset disabled>` with `pointer-events-none`. The semantics are correct — controls match `:disabled` and are not focusable — but nothing is painted: computed `opacity: 1`, unchanged colour and background, `cursor: default`. A shared conversation therefore shows what looks like a live, empty form. This task adds the visual affordance, keyed off `:disabled`, which the SDK's own markup already carries by inheritance from the fieldset.

**Files:**
- Modify: `src/a2ui/theme.css` (append a new rule block at end of file)
- Test: `src/a2ui/__tests__/theme.readonly.test.ts` (create)

**Interfaces:**
- Consumes: the `fieldset[disabled]` wrapper rendered by `ChatA2uiBlock.tsx:233-238` (unchanged by this task).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `src/a2ui/__tests__/theme.readonly.test.ts`:

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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

describe('theme.css read-only affordance', () => {
  let css: string

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../theme.css'), 'utf-8')
  })

  it('dims disabled controls inside a surface', () => {
    expect(css).toMatch(/\.a2ui-scope\s+:disabled[\s\S]{0,200}opacity:/)
  })

  it('marks disabled controls as not-allowed rather than default', () => {
    expect(css).toMatch(/\.a2ui-scope\s+:disabled[\s\S]{0,200}cursor:\s*not-allowed/)
  })

  it('exempts our own renderers from the dimming', () => {
    const block = css.match(/\.a2ui-scope\s+:disabled[\s\S]*?\}/)
    expect(block?.[0]).toContain('.a2ui-own')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/a2ui/__tests__/theme.readonly.test.ts`
Expected: FAIL — no `:disabled` rule exists in `theme.css`.

- [ ] **Step 3: Write minimal implementation**

Append to the end of `src/a2ui/theme.css`:

```css
/*
 * Read-only surfaces. A submitted surface — and every surface in the shared view — is
 * wrapped in a disabled fieldset, which stops interaction but paints nothing, so the
 * form still reads as live. Our own renderers opt out; they carry their own states.
 */
.a2ui-scope :disabled:not(.a2ui-own, .a2ui-own *) {
  opacity: 0.65;
  cursor: not-allowed;
}

.a2ui-scope :disabled:not(.a2ui-own, .a2ui-own *)::placeholder {
  opacity: 0.65;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/a2ui/__tests__/theme.readonly.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Verify the A2UI suite still passes**

Run: `npx vitest run src/a2ui`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/a2ui/theme.css src/a2ui/__tests__/theme.readonly.test.ts
git commit -m "EPMCDME-14725: Show read-only state on submitted interactive surfaces"
```

---

### Task 3: Surfaces stay inside the chat column at narrow widths

At a 420px viewport the whole document scrolls sideways (`document.documentElement.scrollWidth` 450 against a 420 viewport). The cause is the SDK's `Row`, rendered with the inline style `display: flex; flex-direction: row; justify-content: space-between; align-items: stretch; gap: …` and **no** `flex-wrap`, so it computes `nowrap`. Its children — our `ButtonRenderer` buttons — already carry `min-w-0` and `flex-shrink: 1`, but their label is `whitespace-nowrap` with `overflow: visible`, so the text spills out of the shrunken box (measured `scrollWidth` 110 against `clientWidth` 76) instead of wrapping or clipping.

Two changes: let the row wrap (the inline style does not set `flex-wrap`, so a plain stylesheet rule wins without `!important`), and clip the button label as a last resort when even a wrapped row cannot fit it.

**Files:**
- Modify: `src/a2ui/theme.css` (append a new rule block at end of file)
- Modify: `src/a2ui/renderers.tsx` (the `ButtonRenderer` class list, around line 296)
- Test: `src/a2ui/__tests__/theme.overflow.test.ts` (create)
- Test: `src/a2ui/__tests__/buttonOverflow.test.tsx` (create)

**Interfaces:**
- Consumes: `ButtonRenderer` from `src/a2ui/renderers.tsx`, and the SDK-owned row element identified by its inline `flex-direction: row`.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing stylesheet test**

Create `src/a2ui/__tests__/theme.overflow.test.ts`:

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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

describe('theme.css narrow-width containment', () => {
  let css: string

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../theme.css'), 'utf-8')
  })

  it('lets the catalog row wrap instead of forcing one line', () => {
    expect(css).toMatch(/flex-direction: row[\s\S]{0,400}flex-wrap:\s*wrap/)
  })

  it('lets row children shrink below their content width', () => {
    expect(css).toMatch(/flex-direction: row[\s\S]{0,400}min-width:\s*0/)
  })

  it('keeps the surface itself inside its column', () => {
    expect(css).toMatch(/\.a2ui-scope\s*\{[\s\S]*?max-width:\s*100%/)
  })
})
```

- [ ] **Step 2: Run the stylesheet test to verify it fails**

Run: `npx vitest run src/a2ui/__tests__/theme.overflow.test.ts`
Expected: FAIL — all three; `theme.css` has no row-wrap rule and `.a2ui-scope` has no `max-width`.

- [ ] **Step 3: Implement the stylesheet change**

In `src/a2ui/theme.css`, add `max-width: 100%;` and `min-width: 0;` inside the existing `.a2ui-scope { … }` block, directly above the `font-family` declaration edited in Task 1:

```css
  max-width: 100%;
  min-width: 0;
  font-family: var(--font-family-body-sans, Geist, Arial, Helvetica, sans-serif);
```

Then append at the end of the file:

```css
/*
 * The catalog's Row styles itself inline and never sets flex-wrap, so a row of buttons
 * refuses to break and pushes the chat column sideways on a narrow viewport. The inline
 * style sets no flex-wrap, so these plain declarations win without !important.
 */
.a2ui-scope div[style*='flex-direction: row'] {
  flex-wrap: wrap;
  min-width: 0;
}

.a2ui-scope div[style*='flex-direction: row'] > * {
  min-width: 0;
}
```

- [ ] **Step 4: Run the stylesheet test to verify it passes**

Run: `npx vitest run src/a2ui/__tests__/theme.overflow.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Write the failing button test**

Create `src/a2ui/__tests__/buttonOverflow.test.tsx`:

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
import { describe, it, expect, vi } from 'vitest'

import { ButtonRenderer } from '../renderers'

describe('ButtonRenderer narrow-width behaviour', () => {
  const renderButton = () =>
    render(
      <ButtonRenderer
        props={{ action: vi.fn() }}
        buildChild={() => <span>A deliberately long action label</span>}
        context={{}}
      />
    )

  it('clips an overlong label instead of letting it spill out of the button', () => {
    renderButton()
    const button = screen.getByRole('button')
    expect(button.className).toContain('overflow-hidden')
  })

  it('keeps the label on one line so the clip has something to clip', () => {
    renderButton()
    expect(screen.getByRole('button').className).toContain('whitespace-nowrap')
  })
})
```

If `ButtonRenderer`'s prop shape differs from the two-argument form above, read `src/a2ui/__tests__/factory.test.tsx` and mirror how it constructs `A2uiRenderProps` there; the assertions stay as written.

- [ ] **Step 6: Run the button test to verify it fails**

Run: `npx vitest run src/a2ui/__tests__/buttonOverflow.test.tsx`
Expected: FAIL on `clips an overlong label` — the class list has `whitespace-nowrap` but no `overflow-hidden`.

- [ ] **Step 7: Implement the button change**

In `src/a2ui/renderers.tsx`, in `ButtonRenderer` (from line 296), add `overflow-hidden` to the class names passed to the design-system `Button`, alongside the existing `min-w-0`. Do not remove `whitespace-nowrap` — the row wrapping added in Step 3 is the primary fix, and the clip is the fallback for a label too long for any single row.

- [ ] **Step 8: Run the button test to verify it passes**

Run: `npx vitest run src/a2ui/__tests__/buttonOverflow.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 9: Run the whole A2UI suite**

Run: `npx vitest run src/a2ui`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/a2ui/theme.css src/a2ui/renderers.tsx src/a2ui/__tests__/theme.overflow.test.ts src/a2ui/__tests__/buttonOverflow.test.tsx
git commit -m "EPMCDME-14725: Keep interactive surfaces inside the chat column on narrow screens"
```

---

### Task 4: Shared conversations never offer a live surface

`ChatA2uiBlock.isSurfaceActive` (`src/pages/chat/components/ChatHistory/ChatAiMessage/ChatA2uiBlock.tsx:111`) is

```ts
const isSurfaceActive = (surfaceId: string) =>
  !isChatBusy && !isSubmitting && (isFormEditing || (!answers.has(surfaceId) && isAtEdge))
```

It never consults `isSharedPage`. In `/share/conversations/:token` an unanswered surface sitting on the last turn therefore renders fully interactive, and pressing its button calls `submitA2uiAction` against a conversation the viewer cannot write to. `isSharedPage` is already on the chat context (`src/pages/chat/hooks/useChatContext.tsx:21`), set `true` by `SharedChatPage.tsx:54` and `false` by `ChatPage.tsx:142`, and is consumed the same way by sibling components (`ChatAiMessage.tsx:73`).

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatA2uiBlock.tsx` (imports near line 41; the component body around lines 73 and 111)
- Test: `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatA2uiBlock.test.tsx` (extend)

**Interfaces:**
- Consumes: `useChatContext()` from `@/pages/chat/hooks/useChatContext`, field `isSharedPage: boolean`.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

`ChatA2uiBlock.test.tsx` already mocks `useChatContext` at line 62 with `isSharedPage: false`. Make that mock configurable and add a shared-page case. Replace the existing mock block with:

```tsx
const { mockChatContext } = vi.hoisted(() => ({
  mockChatContext: {
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
  },
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))
```

Then append this suite at the end of the file, reusing whatever envelope factory and `render` helper the file already defines for an unanswered surface on the last turn (search the file for `data-testid="a2ui-surface-fieldset"` to find the closest existing case and copy its setup verbatim):

```tsx
describe('ChatA2uiBlock in the shared conversation view', () => {
  beforeEach(() => {
    mockChatContext.isSharedPage = false
  })

  it('leaves an unanswered last-turn surface interactive in the normal chat', () => {
    mockChatContext.isSharedPage = false
    renderUnansweredSurfaceAtEdge()
    expect(screen.getByTestId('a2ui-surface-fieldset')).not.toBeDisabled()
  })

  it('locks an unanswered last-turn surface in the shared view', () => {
    mockChatContext.isSharedPage = true
    renderUnansweredSurfaceAtEdge()
    expect(screen.getByTestId('a2ui-surface-fieldset')).toBeDisabled()
  })
})
```

`renderUnansweredSurfaceAtEdge()` is the helper you copy from the existing unanswered-surface case; if the file inlines that setup rather than exposing a helper, extract it into one named exactly that and point the existing test at it too.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatA2uiBlock.test.tsx -t 'shared conversation view'`
Expected: FAIL on `locks an unanswered last-turn surface in the shared view` — the fieldset is enabled because `isSurfaceActive` ignores `isSharedPage`.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatA2uiBlock.tsx`:

Add the import alongside the existing relative import of `ChatIndexes` (line 41):

```ts
import { useChatContext } from '../../../hooks/useChatContext'
```

In the component body, next to `const { currentChat } = useSnapshot(chatsStore)` (line 73):

```ts
const { isSharedPage } = useChatContext()
```

Change `isSurfaceActive` (line 111) to:

```ts
const isSurfaceActive = (surfaceId: string) =>
  !isSharedPage &&
  !isChatBusy &&
  !isSubmitting &&
  (isFormEditing || (!answers.has(surfaceId) && isAtEdge))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatA2uiBlock.test.tsx`
Expected: PASS — the whole file, including the pre-existing cases.

- [ ] **Step 5: Run the sibling integration suite**

Run: `npx vitest run src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__`
Expected: PASS — `ChatA2uiBlock.valtio.integration.test.tsx` included.

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/components/ChatHistory/ChatAiMessage/ChatA2uiBlock.tsx src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatA2uiBlock.test.tsx
git commit -m "EPMCDME-14725: Lock interactive surfaces in the shared conversation view"
```

---

### Task 5: A checkbox and its label share a centre line

A checkbox row is a flex container with `align-items: center`, yet the label text sits 4px above the box. Two rules in `theme.css` collide:

- `theme.css:123` — `.a2ui-scope label[for]:not(.a2ui-own *)`, specificity (0,3,1): `display: block; margin-bottom: 0.5rem`. `:not()` takes the specificity of its argument, so `.a2ui-own *` contributes a class.
- `theme.css:181` — `.a2ui-scope input + label[for]`, specificity (0,2,2): `display: inline; margin-bottom: 0`.

(0,3,1) beats (0,2,2), so the generic field-label rule wins and the checkbox label keeps `margin-bottom: 8px`. `align-items: center` centres the label's **margin box** (16px text + 8px margin = 24px) against the 16px control, which puts the text 8/2 = 4px high. Measured: container height 24, input `y = -689.5`, label `y = -693.5`.

Raising the specificity of the checkbox rule fixes it without touching the generic one. `display: inline` is dropped in the same edit: the label is a flex item, and flex items are blockified regardless, so that declaration never did anything.

**Files:**
- Modify: `src/a2ui/theme.css:181` (the `.a2ui-scope input + label[for]` selector and its `display` declaration)
- Test: `src/a2ui/__tests__/theme.checkboxAlignment.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `src/a2ui/__tests__/theme.checkboxAlignment.test.ts`. jsdom computes no layout, so the assertion is that the checkbox-label rule out-specifies the generic field-label rule — which is the actual defect.

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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

/** Counts (id, class-ish, element) the way CSS does, for the selectors used here. */
const specificity = (selector: string): [number, number, number] => {
  const withoutNot = selector.replace(/:not\(([^)]*)\)/g, ' $1 ')
  const ids = (withoutNot.match(/#[\w-]+/g) ?? []).length
  const classes = (withoutNot.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!\()/g) ?? []).length
  const elements = (withoutNot.match(/(^|[\s+>~])[a-z]+/g) ?? []).length
  return [ids, classes, elements]
}

const compare = (a: [number, number, number], b: [number, number, number]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

describe('theme.css checkbox label alignment', () => {
  let css: string

  const selectorOf = (marker: string) => {
    const rule = css.split('}').find((block) => block.includes(marker))
    return rule?.split('{')[0].trim().split('\n').pop()?.trim() ?? ''
  }

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../theme.css'), 'utf-8')
  })

  it('the checkbox label rule out-specifies the generic field label rule', () => {
    const generic = css.match(/\.a2ui-scope label\[for\][^{]*/)?.[0].trim() ?? ''
    const checkbox = css.match(/\.a2ui-scope input \+ label\[for\][^{]*/)?.[0].trim() ?? ''
    expect(generic).not.toBe('')
    expect(checkbox).not.toBe('')
    expect(compare(specificity(checkbox), specificity(generic))).toBeGreaterThan(0)
  })

  it('the checkbox label clears the block label bottom margin', () => {
    expect(selectorOf('margin-bottom: 0;')).toContain('input + label[for]')
  })

  it('does not declare a display on the checkbox label', () => {
    const block = css.match(/\.a2ui-scope input \+ label\[for\][^}]*}/)?.[0] ?? ''
    expect(block).not.toMatch(/display:/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/a2ui/__tests__/theme.checkboxAlignment.test.ts`
Expected: FAIL on `the checkbox label rule out-specifies the generic field label rule` (0,2,2 does not beat 0,3,1) and on `does not declare a display on the checkbox label`.

- [ ] **Step 3: Write minimal implementation**

In `src/a2ui/theme.css`, replace the selector and comment block at lines 175-189 with:

```css
/*
 * A checkbox labels itself AFTER its control, so the generic field-label rule above would
 * give it that rule's block margin — which a centred flex row then splits, leaving the
 * text half a margin above the box. The `:not()` matches the same exclusion as the
 * generic rule purely to out-specify it.
 */
.a2ui-scope input + label[for]:not(.a2ui-own *) {
  margin-bottom: 0;
  font-size: var(--a2ui-font-size-s);
  line-height: var(--a2ui-checkbox-size);
  font-weight: 500;
  color: rgb(var(--colors-text-primary));
  cursor: pointer;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/a2ui/__tests__/theme.checkboxAlignment.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Confirm the offset is gone in the browser**

With the dev server running, open a conversation containing a checkbox surface and run:

```js
const box = document.querySelector('.a2ui-scope input[type=checkbox]')
const label = box.nextElementSibling
const mid = (el) => { const r = el.getBoundingClientRect(); return r.y + r.height / 2 }
console.log({ delta: +(mid(box) - mid(label)).toFixed(1) })
```

Expected: `delta` is 0 (was 4).

- [ ] **Step 6: Commit**

```bash
git add src/a2ui/theme.css src/a2ui/__tests__/theme.checkboxAlignment.test.ts
git commit -m "EPMCDME-14725: Align an interactive checkbox with its label text"
```

---

### Task 6: Checkboxes and radios match the design system

A2UI checkboxes and radios compute `appearance: auto` — the browser paints its own native control. The SDK does set `border`, `background` and `border-radius` inline on the input, but a native-appearance control ignores them, so the measured result is `border-width: 0`, `border-radius: 0`, transparent background, and only `accent-color` getting through. The product's own controls look nothing like that:

- `src/components/form/Checkbox.tsx:124-127` — `w-4 h-4 rounded-[4px] border transition-colors`, border going to `border-accent` on hover, and when checked an accent fill carrying a check glyph in `surface-base-primary`.
- `src/components/form/RadioButton/RadioButton.tsx:49-59` — `18px` square, `rounded-full`, `border-text-primary`, an inner `9px` dot that scales from 0 to 1 and fills `border-accent` when checked, both border and dot going accent on hover.

Switching to `appearance: none` hands painting back to CSS. The SDK's inline `background` / `border` / `border-radius` read from `--a2ui-checkbox-*` custom properties, so the resting state is set by defining those properties rather than by overriding the inline style. The checked state and the glyphs are not expressible through those properties and need rules of their own; because the inline `background` would otherwise win, those carry `!important`, as several rules in this file already do.

**Files:**
- Modify: `src/a2ui/theme.css` — the `.a2ui-scope` custom-property block (around lines 68-80) and the `input[type='radio'] / input[type='checkbox']` rule (lines 205-211)
- Test: `src/a2ui/__tests__/theme.choiceControls.test.ts` (create)

**Interfaces:**
- Consumes: `--colors-border-accent`, `--colors-text-primary`, `--colors-surface-base-primary`, `--colors-border-primary` — the same `tailwindcss-themer` tokens the rest of the file uses, so both themes follow automatically.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `src/a2ui/__tests__/theme.choiceControls.test.ts`:

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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

describe('theme.css choice controls', () => {
  let css: string

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../theme.css'), 'utf-8')
  })

  it('takes painting away from the native control', () => {
    expect(css).toMatch(/input\[type='radio'\][\s\S]{0,400}appearance:\s*none/)
  })

  it('sizes the checkbox like the design system checkbox', () => {
    expect(css).toContain('--a2ui-checkbox-size: 1rem')
    expect(css).toContain('--a2ui-checkbox-border-radius: 0.25rem')
  })

  it('gives the resting control a visible border through the catalog property', () => {
    expect(css).toMatch(/--a2ui-checkbox-border:[^;]*colors-border-primary/)
  })

  it('renders the radio as a circle', () => {
    expect(css).toMatch(/input\[type='radio'\][\s\S]{0,600}border-radius:\s*50%/)
  })

  it('fills a checked control with the accent colour', () => {
    expect(css).toMatch(/:checked[\s\S]{0,300}colors-border-accent/)
  })

  it('draws a check glyph on a checked checkbox', () => {
    expect(css).toMatch(/input\[type='checkbox'\]:checked::after[\s\S]{0,300}content:/)
  })

  it('draws a dot inside a checked radio', () => {
    expect(css).toMatch(/input\[type='radio'\]:checked::after[\s\S]{0,300}border-radius:\s*50%/)
  })

  it('moves the border to accent on hover', () => {
    expect(css).toMatch(/:hover[\s\S]{0,200}colors-border-accent/)
  })

  it('leaves our own renderers alone', () => {
    const block = css.match(/\.a2ui-scope input\[type='radio'\][^{]*/)?.[0] ?? ''
    expect(block).toContain('.a2ui-own')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/a2ui/__tests__/theme.choiceControls.test.ts`
Expected: FAIL on every assertion except the two `--a2ui-checkbox-*` size ones — the current rule sets only `accent-color`.

- [ ] **Step 3: Define the resting appearance through the catalog properties**

In `src/a2ui/theme.css`, inside the `.a2ui-scope` custom-property block, next to the existing `--a2ui-checkbox-*` declarations around lines 68-80, add:

```css
  --a2ui-checkbox-background: transparent;
  --a2ui-checkbox-border: var(--a2ui-border-width) solid rgb(var(--colors-border-primary));
```

Leave `--a2ui-checkbox-size: 1rem` and `--a2ui-checkbox-border-radius: 0.25rem` as they are — they already match the design system's `w-4 h-4 rounded-[4px]`, they were simply never honoured by a native control.

- [ ] **Step 4: Replace the choice-control rule**

Replace the rule at lines 205-211 (`.a2ui-scope input[type='radio'], .a2ui-scope input[type='checkbox'] { … accent-color … }`) with:

```css
/*
 * A native-appearance control paints itself and ignores the border, background and radius
 * the catalog sets inline, so it lands in the chat as a stock OS checkbox. Painting is
 * taken back here to match the design system's own Checkbox and RadioButton.
 */
.a2ui-scope input[type='radio']:not(.a2ui-own *),
.a2ui-scope input[type='checkbox']:not(.a2ui-own *) {
  appearance: none;
  flex: none;
  align-self: center;
  position: relative;
  margin: 0;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.a2ui-scope input[type='radio']:not(.a2ui-own *) {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
}

.a2ui-scope input[type='radio']:not(.a2ui-own *):hover,
.a2ui-scope input[type='checkbox']:not(.a2ui-own *):hover {
  border-color: rgb(var(--colors-border-accent)) !important;
}

.a2ui-scope input[type='checkbox']:not(.a2ui-own *):checked {
  background: rgb(var(--colors-border-accent)) !important;
  border-color: rgb(var(--colors-border-accent)) !important;
}

/* The tick: a rotated two-sided box, so no icon font or SVG is needed. */
.a2ui-scope input[type='checkbox']:not(.a2ui-own *):checked::after {
  content: '';
  position: absolute;
  top: 45%;
  left: 50%;
  width: 0.25rem;
  height: 0.5rem;
  border: solid rgb(var(--colors-surface-base-primary));
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -50%) rotate(45deg);
}

.a2ui-scope input[type='radio']:not(.a2ui-own *):checked {
  border-color: rgb(var(--colors-border-accent)) !important;
}

.a2ui-scope input[type='radio']:not(.a2ui-own *):checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.5625rem;
  height: 0.5625rem;
  border-radius: 50%;
  background: rgb(var(--colors-border-accent));
  transform: translate(-50%, -50%);
}

.a2ui-scope input[type='radio']:not(.a2ui-own *):focus-visible,
.a2ui-scope input[type='checkbox']:not(.a2ui-own *):focus-visible {
  outline: 2px solid rgb(var(--colors-border-accent));
  outline-offset: 2px;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/a2ui/__tests__/theme.choiceControls.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 6: Run the whole A2UI suite**

Run: `npx vitest run src/a2ui`
Expected: PASS. Task 2's `:disabled` rule still applies on top — a disabled checked box dims rather than losing its fill.

- [ ] **Step 7: Compare against the design system in the browser, both themes**

Open a conversation with a checkbox surface and a radio surface (the `HR Complex Case Assistant` fixture has a checkbox; a multiple-choice prompt produces radios), and put a platform `Checkbox` / `RadioButton` on screen for comparison — the assistant form's "Enable interactive features" section is the closest one. Check the box size, corner radius, border colour at rest, hover, the checked fill and glyph, and the radio's dot. Toggle the theme and repeat: every colour here is a `--colors-*` token, so both themes must follow without a second rule.

Expected: an A2UI checkbox is indistinguishable from a platform checkbox at rest, on hover and when checked; the same for radios.

- [ ] **Step 8: Commit**

```bash
git add src/a2ui/theme.css src/a2ui/__tests__/theme.choiceControls.test.ts
git commit -m "EPMCDME-14725: Match interactive checkboxes and radios to the design system"
```

---

### Task 7: A filterable choice picker keeps its spacing

A `ChoicePicker` with `filterable: true` renders as a `<div>` containing `STRONG` (the label), `INPUT` (the filter box) and `DIV` (the options). The options sit flush against the filter box — measured vertical gap 0. Both layout rules in `theme.css` miss this shape:

- `theme.css:168` — `.a2ui-scope strong + div` is an adjacent-sibling selector. Without a filter the options div does follow `strong` and the rule applies; with a filter the `INPUT` sits between them, `root.matches('strong + div')` is `false`, and the options container gets no `display: flex`, no `flex-direction` and no `gap`.
- `theme.css:227` — `.a2ui-scope div:has(> .chip)` sets `flex-direction`, `flex-wrap` and `gap` but never `display: flex`; it was relying on the rule above to supply it. It also matches only the chip variant — a filterable picker renders its options as `LABEL` elements.

Neither rule owns the spacing between the filter box and the options, because that gap belongs to the picker root, which is `display: block`. Measured: root `display: block`, options container `display: block` with `gap: normal`, filter-to-options gap `0`, label-to-filter gap `4` (the `strong` bottom margin).

The fix gives the root its own column layout through `:has(> strong)` — which matches a picker with or without a filter — makes the chip row self-sufficient, and widens the options rule to a general sibling so it no longer cares what sits between the label and the options.

**Files:**
- Modify: `src/a2ui/theme.css` — the `.a2ui-scope strong` rule (line 161), the `.a2ui-scope strong + div` rule (line 168), the `.a2ui-scope div:has(> .chip)` rule (line 227)
- Test: `src/a2ui/__tests__/theme.choicePickerLayout.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks. Ordering matters against Task 3: the row-wrap rule added there targets `div[style*='flex-direction: row']`, which is SDK inline styling and does not overlap these selectors.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `src/a2ui/__tests__/theme.choicePickerLayout.test.ts`:

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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

describe('theme.css choice picker layout', () => {
  let css: string

  const blockFor = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return css.match(new RegExp(`${escaped}[^{]*\\{[^}]*\\}`))?.[0] ?? ''
  }

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../theme.css'), 'utf-8')
  })

  it('lays the picker root out as a column, filter box or not', () => {
    const block = blockFor('.a2ui-scope div:has(> strong)')
    expect(block).toContain('flex-direction: column')
    expect(block).toContain('gap:')
  })

  it('reaches the options through a general sibling, not an adjacent one', () => {
    expect(css).not.toContain('.a2ui-scope strong + div')
    expect(css).toContain('.a2ui-scope strong ~ div')
  })

  it('makes the chip row a flex container in its own right', () => {
    expect(blockFor('.a2ui-scope div:has(> .chip)')).toContain('display: flex')
  })

  it('lets the root gap own the label spacing instead of a stacked margin', () => {
    expect(css).toMatch(/div:has\(> strong\) > strong[^{]*\{[^}]*margin-bottom:\s*0/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/a2ui/__tests__/theme.choicePickerLayout.test.ts`
Expected: FAIL on all four — there is no `:has(> strong)` rule, the selector is still `strong + div`, and the chip rule has no `display`.

- [ ] **Step 3: Give the picker root its own layout**

In `src/a2ui/theme.css`, immediately before the `.a2ui-scope strong` rule (line 161), add:

```css
/*
 * A choice picker's root. Matched through its label rather than by class, because the
 * catalog's class map is empty. It owns the spacing between the label, the optional
 * filter box and the options, so nothing depends on which of them are present.
 */
.a2ui-scope div:has(> strong) {
  display: flex;
  flex-direction: column;
  gap: var(--a2ui-spacing-s);
}

/* The root gap spaces the label now; a margin on top of it would double the first step. */
.a2ui-scope div:has(> strong) > strong {
  margin-bottom: 0;
}
```

- [ ] **Step 4: Widen the options selector and make the chip row self-sufficient**

In the same file, change the options rule at line 168 from `.a2ui-scope strong + div` to:

```css
/* General sibling: a filterable picker puts its filter box between the label and these. */
.a2ui-scope strong ~ div {
  display: flex;
  flex-direction: column;
  gap: var(--a2ui-spacing-s);
}
```

And add `display: flex;` as the first declaration of the `.a2ui-scope div:has(> .chip)` rule at line 227, so the chip row no longer depends on another rule having supplied it:

```css
.a2ui-scope div:has(> .chip) {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--a2ui-spacing-s);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/a2ui/__tests__/theme.choicePickerLayout.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Run the whole A2UI suite**

Run: `npx vitest run src/a2ui`
Expected: PASS.

- [ ] **Step 7: Confirm the spacing in the browser**

Ask an assistant with interactive features on for a filterable multi-select — for example: *"Покажи через request_user_input один ChoicePicker с label Interests, filterable, множественный выбор, options: Reading, Gaming, Cooking, Hiking, Music"* — then run:

```js
const scope = [...document.querySelectorAll('.a2ui-scope')].pop()
const filter = [...scope.querySelectorAll('input')].find((i) => (i.placeholder || '').toLowerCase().includes('filter'))
const root = filter.parentElement
const options = root.children[2]
console.log({
  rootDisplay: getComputedStyle(root).display,
  optionsDisplay: getComputedStyle(options).display,
  gapLabelToFilter: +(filter.getBoundingClientRect().y - root.children[0].getBoundingClientRect().bottom).toFixed(1),
  gapFilterToOptions: +(options.getBoundingClientRect().y - filter.getBoundingClientRect().bottom).toFixed(1),
})
```

Expected: `rootDisplay` and `optionsDisplay` both `flex`; both gaps `8` — even, and no longer `0` between the filter and the options. Then repeat with a non-filterable picker and confirm nothing regressed there.

- [ ] **Step 8: Commit**

```bash
git add src/a2ui/theme.css src/a2ui/__tests__/theme.choicePickerLayout.test.ts
git commit -m "EPMCDME-14725: Space a filterable choice picker from its options"
```

---

### Task 8: Full verification and manual browser check

The visual acceptance criteria (AC-1, AC-2, AC-3) and the browser matrix (AC-6) cannot be proven by Vitest — jsdom computes no layout and the repo has no in-house e2e. This task runs the automated gates and then re-runs, on the local stack, the exact measurements that established the defects, so each fix has before/after evidence for the MR.

**Files:**
- Modify: none
- Test: none created

**Interfaces:**
- Consumes: every change from Tasks 1–7.
- Produces: measurement output and screenshots for the MR description.

- [ ] **Step 1: Run the full unit suite**

Run: `npx vitest run 2>&1 | tail -40`
Expected: PASS. If anything fails, compare the failing list against a `main` run before treating it as caused by this branch.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: clean. If the local ESLint `@/`-alias resolver fails on files this branch did not touch, that is a known local-environment fault — record it and let CI be the authority.

- [ ] **Step 3: Re-measure the four defects in Chrome against the local stack**

With `npm run dev` on `localhost:5173` and the backend container up, open a conversation containing A2UI surfaces and its `/share/conversations/:token` view, and run in the console:

```js
const s = document.querySelector('.a2ui-scope')
const md = document.querySelector('.markdown')
console.log({
  fontProse: getComputedStyle(md).fontFamily,
  fontSurface: getComputedStyle(s).fontFamily,
  disabledOpacity: getComputedStyle(s.querySelector(':disabled')).opacity,
  disabledCursor: getComputedStyle(s.querySelector(':disabled')).cursor,
})
```

Expected: `fontProse` and `fontSurface` both resolve to the Geist sans stack; `disabledOpacity` is `0.65`; `disabledCursor` is `not-allowed`.

- [ ] **Step 4: Re-measure narrow-width containment**

Resize the viewport to 420px wide and run:

```js
console.log({
  viewport: window.innerWidth,
  docScrollWidth: document.documentElement.scrollWidth,
  spill: [...document.querySelectorAll('.a2ui-scope *')]
    .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).length,
})
```

Expected: `spill` is 0 (was 11) — every element that used to escape its box is contained.

`docScrollWidth` stays at 450 against a 420 viewport, unchanged by this fix and not caused by a2ui: the residual 30px is a decorative background image carrying a hardcoded `min-w-[450px]`, outside the surface. Measure in the dark theme — the light theme swaps in a `min-w-[600px]` variant of that same image, which shifts the number for a reason unrelated to the fix.

- [ ] **Step 5: Check the shared view has no live surface**

Open a shared conversation whose last turn carries an unanswered surface and run:

```js
console.log([...document.querySelectorAll('[data-testid="a2ui-surface-fieldset"]')].map((f) => f.disabled))
```

Expected: every entry `true`.

- [ ] **Step 6: Repeat Steps 3–5 in Edge**

AC-6 names Chrome and Edge explicitly. The `:disabled` selector, `flex-wrap` and the custom-property fallback are all long-standing features in both engines; this is confirmation, not exploration.

- [ ] **Step 7: Re-check the checkbox centre line, the control styling and the picker spacing**

```js
const box = document.querySelector('.a2ui-scope input[type=checkbox]')
const label = box.nextElementSibling
const mid = (el) => { const r = el.getBoundingClientRect(); return r.y + r.height / 2 }
const cs = getComputedStyle(box)
console.log({
  delta: +(mid(box) - mid(label)).toFixed(1),
  appearance: cs.appearance,
  radius: cs.borderRadius,
  border: cs.borderWidth,
})
```

Expected: `delta` 0 (was 4); `appearance` `none` (was `auto`); `radius` `4px` (was `0px`); `border` `1px` (was `0px`).

- [ ] **Step 8: Capture before/after screenshots**

At minimum: the surface typography in a normal chat, a read-only surface in the shared view, the narrow-width (420px) row, and a checkbox/radio pair beside the platform's own controls in both themes. The `codemie-ui` MR compliance bot requires before/after screenshots in the MR description.

- [ ] **Step 9: Commit the planning artifacts**

```bash
git add docs/superpowers/tasks/2026-09-07-fix-ui-issues-with-interactive-components
git commit -m "EPMCDME-14725: Add planning artifacts"
```

---

## Out of scope

Deliberately not fixed here, per the agreed scope (reproduced defects plus their obvious neighbours):

- The 22 elements rendering `class="undefined"` because `@a2ui/react` ships empty CSS-module class maps, and the structural selectors in `theme.css` that compensate for them. This is the underlying fragility behind several risks in `technical-analysis.md`, but replacing that approach is a package-upgrade project, not a bug fix.
- The `v0_9` protocol pin against installed `@a2ui/react` 0.10.2 / `@a2ui/web_core` 0.10.6. The measurements above show the pinned catalog markup still matching the theme's selectors, so the drift is latent rather than active.
- `SharedChatPage.tsx` building its `ChatContext` through `as unknown as ChatContextValue`. Task 4 reads only `isSharedPage`, which that stub does set.
- The absence of an a2ui guide under `.ai-run/guides/`, and the stale `InteractiveErrorBoundary.tsx` reference in `error-handling-patterns.md:23,241`.

## Verified non-defects

Checked during reproduction and found working; no task addresses them:

- The share endpoint does serialise `a2uiEnvelopes`, `a2uiAction` and `a2uiDataModel` — all six surfaces rendered in the shared view with their submitted values. The backend dependency flagged in `technical-analysis.md` does not exist.
- `<fieldset disabled className="contents">` does propagate: controls match `:disabled` and are not keyboard-focusable, despite `display: contents`.
- The `✓` marker from `.a2ui-answered::before` appears exactly once per surface, on the button the surface was submitted with. It is correct, not a leak.
