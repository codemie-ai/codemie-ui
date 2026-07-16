# Table Copy Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a copy-to-clipboard button to every markdown table output in the CodeMie UI.

**Architecture:** Extract `table` from the generic `blockTokens` array in `MarkdownTokens.tsx` and render it through a new `TableBlock.tsx` component. `TableBlock` wraps the existing sanitized HTML in a `relative`-positioned container and overlays a `ButtonType.TERTIARY` copy button (absolute, top-right) — the same pattern used by `MermaidDiagram.tsx`. `copyToClipboard(token.raw, ...)` is the clipboard call; `token.raw` holds the full raw markdown pipe-table text regardless of table size.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, DOMPurify, marked (Parser), Tailwind CSS

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/components/markdown/tokens/TableBlock.tsx` | Render table HTML + copy button |
| Create | `src/components/markdown/tokens/__tests__/TableBlock.test.tsx` | Unit tests for TableBlock |
| Modify | `src/components/markdown/MarkdownTokens.tsx` | Remove `'table'` from `blockTokens`, add `TableBlock` branch |

---

### Task 1: Create TableBlock component (TDD)

**Files:**
- Create: `src/components/markdown/tokens/__tests__/TableBlock.test.tsx`
- Create: `src/components/markdown/tokens/TableBlock.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/markdown/tokens/__tests__/TableBlock.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import TableBlock from '../TableBlock'

const mockCopyToClipboard = vi.fn()

vi.mock('@/utils/utils', async () => {
  const actual = await vi.importActual('@/utils/utils')
  return {
    ...actual,
    copyToClipboard: mockCopyToClipboard,
  }
})

vi.mock('@/assets/icons/copy.svg?react', () => ({
  default: () => <svg data-testid="copy-icon">Copy</svg>,
}))

describe('TableBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the provided table HTML', () => {
    const { container } = render(
      <TableBlock
        html="<table><tbody><tr><td>Cell</td></tr></tbody></table>"
        raw="| Cell |\n|---|"
      />
    )
    expect(container.querySelector('table')).toBeInTheDocument()
    expect(container.querySelector('td')).toHaveTextContent('Cell')
  })

  it('renders a copy button with accessible label "Copy table"', () => {
    render(<TableBlock html="<table></table>" raw="| a |\n|---|" />)
    expect(screen.getByRole('button', { name: 'Copy table' })).toBeInTheDocument()
  })

  it('calls copyToClipboard with raw markdown and correct notification when button is clicked', () => {
    const raw = '| Name | Age |\n|---|---|\n| Alice | 30 |'
    render(<TableBlock html="<table></table>" raw={raw} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy table' }))

    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1)
    expect(mockCopyToClipboard).toHaveBeenCalledWith(raw, 'Table copied to clipboard')
  })
})
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
npx vitest run src/components/markdown/tokens/__tests__/TableBlock.test.tsx
```

Expected: FAIL — `Cannot find module '../TableBlock'`

- [ ] **Step 3: Create TableBlock.tsx**

Create `src/components/markdown/tokens/TableBlock.tsx`:

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

import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import { ButtonSize, ButtonType } from '@/constants'
import { copyToClipboard } from '@/utils/utils'

type TableBlockProps = {
  html: string
  raw: string
}

const TableBlock: FC<TableBlockProps> = ({ html, raw }) => (
  <div className="relative my-1">
    <div dangerouslySetInnerHTML={{ __html: html }} />
    <Button
      variant={ButtonType.TERTIARY}
      size={ButtonSize.MEDIUM}
      className="absolute top-0 right-0 z-10 bg-surface-base-primary hover:bg-surface-specific-dropdown-hover"
      aria-label="Copy table"
      data-tooltip-id="react-tooltip"
      data-tooltip-content="Copy table"
      onClick={() => copyToClipboard(raw, 'Table copied to clipboard')}
    >
      <CopySvg className="h-4 w-4" />
    </Button>
  </div>
)

export default TableBlock
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npx vitest run src/components/markdown/tokens/__tests__/TableBlock.test.tsx
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/components/markdown/tokens/TableBlock.tsx src/components/markdown/tokens/__tests__/TableBlock.test.tsx
git commit -m "EPMCDME-13243: Add TableBlock component with copy button"
```

---

### Task 2: Wire TableBlock into MarkdownTokens

**Files:**
- Modify: `src/components/markdown/MarkdownTokens.tsx`

- [ ] **Step 1: Update MarkdownTokens.tsx**

Open `src/components/markdown/MarkdownTokens.tsx`.

**Change 1** — Add import after the existing `MermaidDiagram` import (line 22):

```ts
import TableBlock from '@/components/markdown/tokens/TableBlock'
```

**Change 2** — Line 44, remove `'table'` from `blockTokens`:

Before:
```ts
const blockTokens: MarkdownTokenType[] = ['hr', 'table', 'heading']
```

After:
```ts
const blockTokens: MarkdownTokenType[] = ['hr', 'heading']
```

**Change 3** — Add a `table` branch. Insert it before the `blockTokens` check (before line 71 in the original file), so the explicit case is checked first:

```tsx
if (token.type === TOKEN_TYPES.table) {
  return (
    <TableBlock
      key={i}
      html={DOMPurify.sanitize(Parser.parse([token], options), { ADD_ATTR: ['target'] })}
      raw={token.raw}
    />
  )
}
if (blockTokens.includes(token.type)) return <div key={i} {...getBlockProps(token)} />
```

The full updated return block in `MarkdownTokens` should look like:

```tsx
return normalizedTokens.map((token, i) => {
  if (inlineTokens.includes(token.type)) return <span key={i} {...getInlineProps(token)} />

  if (token.type === TOKEN_TYPES.table) {
    return (
      <TableBlock
        key={i}
        html={DOMPurify.sanitize(Parser.parse([token], options), { ADD_ATTR: ['target'] })}
        raw={token.raw}
      />
    )
  }

  if (blockTokens.includes(token.type)) return <div key={i} {...getBlockProps(token)} />

  if (token.type === TOKEN_TYPES.paragraph) return <p key={i} {...getBlockProps(token)} />
  if (token.type === TOKEN_TYPES.space) return <span key={i} {...getBlockProps(token)} />
  if (token.type === TOKEN_TYPES.text) return <span key={i} {...getBlockProps(token)} />
  if (token.type === TOKEN_TYPES.list) return <ListToken key={i} token={token} />
  if (token.type === TOKEN_TYPES.blockquote) {
    return (
      <blockquote key={i}>
        <MarkdownTokens tokens={token.tokens} />
      </blockquote>
    )
  }

  if (token.type === TOKEN_TYPES.code) {
    if (token.lang === 'mermaid') return <MermaidDiagram key={i} code={token.text ?? ''} />

    if (token.lang === 'md' && !token.text?.includes('```') && token.text?.trim()?.length) {
      return <Markdown key={i} content={token.text} />
    }

    return <CodeBlock key={i} text={token.text ?? ''} language={token.lang} />
  }

  return null
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run full TableBlock test suite to confirm nothing regressed**

```bash
npx vitest run src/components/markdown/tokens/__tests__/TableBlock.test.tsx
```

Expected: PASS — 3 tests passing

- [ ] **Step 4: Commit**

```bash
git add src/components/markdown/MarkdownTokens.tsx
git commit -m "EPMCDME-13243: Wire TableBlock into MarkdownTokens"
```

---

## Self-Review Checklist

- [x] Spec AC: visible copy button — Task 1 Step 3 (`absolute top-0 right-0 z-10`)
- [x] Spec AC: copies full content not just visible — `token.raw` is the full markdown string
- [x] Spec AC: works for wide/long tables — `token.raw` is size-independent; `overflow-x-auto` wrapper preserved via existing `renderer.table`
- [x] Spec AC: user feedback — `toaster.info('Table copied to clipboard')` via `copyToClipboard`
- [x] Spec AC: follows CodeMie UI style — `ButtonType.TERTIARY`, `ButtonSize.MEDIUM`, `bg-surface-base-primary`
- [x] Spec AC: keyboard accessible — `Button` is a `<button>` element, natively focusable
- [x] Spec AC: accessible name "Copy table" — `aria-label="Copy table"` on Button
- [x] Spec AC: existing message-level copy not broken — `ChatAiMessageActions.tsx` untouched
- [x] Type consistency — `TableBlockProps { html: string; raw: string }` used identically in component and test
- [x] No placeholders
