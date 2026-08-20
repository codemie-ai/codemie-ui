# Sticky Code Block Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `stickyHeader` boolean prop to `CodeBlock` that wraps the header in a `sticky top-0 z-10` div, and enable it in `MarkdownTokens` so chat code block headers pin to the viewport top when scrolling through long code.

**Architecture:** A thin outer wrapper div carries `sticky top-0 z-10` when `stickyHeader={true}`, keeping `.code-block-header` (and its `container-type: inline-size` container query logic) completely unchanged. `MarkdownTokens` opts in with `stickyHeader`. `ChatHistory`'s `overflow-y-auto` div is already the correct sticky ancestor — no scroll JS needed.

**Tech Stack:** React 18, TypeScript 5.8, Tailwind CSS 3.4, Vitest 1.6 + React Testing Library 16

---

## File Map

| File | Change |
|---|---|
| `src/components/CodeBlock/CodeBlock.tsx` | New `stickyHeader?: boolean` prop + sticky wrapper div |
| `src/components/markdown/MarkdownTokens.tsx` | Add `stickyHeader` at code-token render (line 104) |
| `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` | New describe block: 2 class-presence tests |

`CodeBlock.scss` and `ChatHistory.tsx` are untouched.

---

### Task 1: `stickyHeader` prop + sticky wrapper div in `CodeBlock`

**Files:**
- Modify: `src/components/CodeBlock/CodeBlock.tsx`
- Test: `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx`

**Test-first: yes — write the failing tests before touching `CodeBlock.tsx`**

- [ ] **Step 1: Write the failing tests**

Open `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx`.

Update the import lines at the top (the file currently imports from vitest without `afterEach` and from `@testing-library/react` without `cleanup`):

```tsx
import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest'
```

Add this describe block at the end of the file, after the last closing `})`:

```tsx
describe('CodeBlock stickyHeader prop', () => {
  afterEach(cleanup)

  it('does not apply sticky positioning by default', () => {
    const { container } = render(<CodeBlock text="const x = 1;" language="js" />)
    const wrapper = container.querySelector('.code-block-header')?.parentElement
    expect(wrapper?.classList.contains('sticky')).toBe(false)
  })

  it('applies sticky top-0 z-10 to the wrapper when stickyHeader is true', () => {
    const { container } = render(<CodeBlock text="const x = 1;" language="js" stickyHeader />)
    const wrapper = container.querySelector('.code-block-header')?.parentElement
    expect(wrapper?.classList.contains('sticky')).toBe(true)
    expect(wrapper?.classList.contains('top-0')).toBe(true)
    expect(wrapper?.classList.contains('z-10')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests — confirm they fail**

```bash
npx vitest run src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx --reporter=verbose
```

Expected: the two new `stickyHeader` tests fail (TypeScript error on the unknown prop, or `classList.contains` returning `false`/`undefined`). All existing tests continue to pass.

- [ ] **Step 3: Add `stickyHeader` to the interface**

In `src/components/CodeBlock/CodeBlock.tsx`, replace the `CodeBlockProps` interface (lines 35–48):

Old:
```tsx
interface CodeBlockProps {
  isInChat?: boolean
  title?: string
  language?: FileExtension
  text: string
  downloadFilename?: string
  className?: string
  headerClassName?: string
  contentClassName?: string
  headerActionsLast?: boolean
  headerActionsTemplate?: ReactNode
  expandable?: boolean
  expandTitle?: string
}
```

New:
```tsx
interface CodeBlockProps {
  isInChat?: boolean
  title?: string
  language?: FileExtension
  text: string
  downloadFilename?: string
  className?: string
  headerClassName?: string
  stickyHeader?: boolean
  contentClassName?: string
  headerActionsLast?: boolean
  headerActionsTemplate?: ReactNode
  expandable?: boolean
  expandTitle?: string
}
```

- [ ] **Step 4: Destructure `stickyHeader` in the component**

Replace the destructuring block (lines 50–63):

Old:
```tsx
const CodeBlock: FC<CodeBlockProps> = ({
  isInChat,
  title,
  language = 'txt',
  text,
  downloadFilename,
  className,
  headerClassName,
  contentClassName,
  headerActionsLast,
  headerActionsTemplate,
  expandable,
  expandTitle,
}) => {
```

New:
```tsx
const CodeBlock: FC<CodeBlockProps> = ({
  isInChat,
  title,
  language = 'txt',
  text,
  downloadFilename,
  className,
  headerClassName,
  stickyHeader,
  contentClassName,
  headerActionsLast,
  headerActionsTemplate,
  expandable,
  expandTitle,
}) => {
```

- [ ] **Step 5: Replace the header block with wrapper + header**

Locate the entire header `div` (lines 90–150). Replace the full block:

Old:
```tsx
      <div
        className={cn(
          'flex justify-between code-block-header items-center gap-x-4 gap-y-2 flex-wrap py-2 !pl-4 !pr-2 !m-0 bg-surface-base-tertiary shadow-block border border-border-specific-panel-outline rounded-t-lg',
          expandable && 'code-block-header--has-expand',
          headerClassName
        )}
      >
        <p className="text-sm">{title ?? language.toLowerCase()}</p>

        <div className="flex flex-wrap gap-2">
          {expandable && (
            <Button
              variant="secondary"
              className="!px-2"
              aria-label="Expand"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Expand"
              onClick={() => setIsExpandPopupVisible(true)}
            >
              <ExpandSvg /> <span className="code-block-header-btn-label">Expand</span>
            </Button>
          )}

          {isHTML && (
            <Button
              variant="secondary"
              className="!px-2"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Preview HTML document"
              onClick={() => setIsHtmlPopupVisible(!isHtmlPopupVisible)}
            >
              <EyeSvg /> <span className="code-block-header-btn-label">Preview</span>
            </Button>
          )}

          {!headerActionsLast && headerActionsTemplate}

          <Button
            variant="secondary"
            className="!px-2"
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Copy to buffer"
            onClick={() => copyToClipboard(outputText, 'Copied to clipboard')}
          >
            <CopySvg className="mr-0.5" /> <span className="code-block-header-btn-label">Copy</span>
          </Button>

          <Button
            type="secondary"
            className="!px-2"
            data-tooltip-id="react-tooltip"
            data-tooltip-place="top"
            data-tooltip-content={`Download as ${displayLanguage}`}
            onClick={downloadCode}
          >
            <DownloadSvg /> <span className="code-block-header-btn-label">Download</span>
          </Button>

          {headerActionsLast && headerActionsTemplate}
        </div>
      </div>
```

New:
```tsx
      <div className={cn(stickyHeader && 'sticky top-0 z-10')}>
        <div
          className={cn(
            'flex justify-between code-block-header items-center gap-x-4 gap-y-2 flex-wrap py-2 !pl-4 !pr-2 !m-0 bg-surface-base-tertiary shadow-block border border-border-specific-panel-outline rounded-t-lg',
            expandable && 'code-block-header--has-expand',
            headerClassName
          )}
        >
          <p className="text-sm">{title ?? language.toLowerCase()}</p>

          <div className="flex flex-wrap gap-2">
            {expandable && (
              <Button
                variant="secondary"
                className="!px-2"
                aria-label="Expand"
                data-tooltip-id="react-tooltip"
                data-tooltip-content="Expand"
                onClick={() => setIsExpandPopupVisible(true)}
              >
                <ExpandSvg /> <span className="code-block-header-btn-label">Expand</span>
              </Button>
            )}

            {isHTML && (
              <Button
                variant="secondary"
                className="!px-2"
                data-tooltip-id="react-tooltip"
                data-tooltip-content="Preview HTML document"
                onClick={() => setIsHtmlPopupVisible(!isHtmlPopupVisible)}
              >
                <EyeSvg /> <span className="code-block-header-btn-label">Preview</span>
              </Button>
            )}

            {!headerActionsLast && headerActionsTemplate}

            <Button
              variant="secondary"
              className="!px-2"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Copy to buffer"
              onClick={() => copyToClipboard(outputText, 'Copied to clipboard')}
            >
              <CopySvg className="mr-0.5" /> <span className="code-block-header-btn-label">Copy</span>
            </Button>

            <Button
              type="secondary"
              className="!px-2"
              data-tooltip-id="react-tooltip"
              data-tooltip-place="top"
              data-tooltip-content={`Download as ${displayLanguage}`}
              onClick={downloadCode}
            >
              <DownloadSvg /> <span className="code-block-header-btn-label">Download</span>
            </Button>

            {headerActionsLast && headerActionsTemplate}
          </div>
        </div>
      </div>
```

- [ ] **Step 6: Run tests — confirm green**

```bash
npx vitest run src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx --reporter=verbose
```

Expected: all tests pass, including both new `stickyHeader` tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/CodeBlock/CodeBlock.tsx \
        src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx
git commit -m "EPMCDME-14054: add stickyHeader prop to CodeBlock with sticky wrapper div"
```

---

### Task 2: Enable `stickyHeader` in `MarkdownTokens`

**Files:**
- Modify: `src/components/markdown/MarkdownTokens.tsx`

**Test-first: no — sticky layout cannot be tested in JSDOM; prop propagation is already covered by Task 1 tests.**

- [ ] **Step 1: Add `stickyHeader` at the code-token render site**

In `src/components/markdown/MarkdownTokens.tsx`, locate line 104:

Old:
```tsx
      return <CodeBlock key={i} text={token.text ?? ''} language={token.lang} />
```

New:
```tsx
      return <CodeBlock key={i} text={token.text ?? ''} language={token.lang} stickyHeader />
```

- [ ] **Step 2: Run the full test suite for the affected components**

```bash
npx vitest run src/components/CodeBlock src/components/markdown --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/markdown/MarkdownTokens.tsx
git commit -m "EPMCDME-14054: enable stickyHeader on code blocks in markdown chat messages"
```

---

### Task 3: Browser verification

**Test-first: N/A — visual scroll behavior cannot be automated in JSDOM.**

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

App serves at http://localhost:5173.

- [ ] **Step 2: Verify sticky behavior in chat**

Navigate to a chat conversation. Send a prompt that produces a long code block — e.g.:

> "Write a Python script with at least 80 lines"

Scroll slowly through the code block.

Expected: the header (language label + Copy + Download buttons) pins to the top of the chat scroll area while the code scrolls beneath it. When you scroll past the bottom of the code block, the header scrolls away naturally.

- [ ] **Step 3: Verify non-chat contexts are unaffected**

Open the Workflow editor or Settings page where `CodeBlock` renders without `stickyHeader`. Scroll the page.

Expected: the code block header scrolls normally with the page — no sticky behavior.
