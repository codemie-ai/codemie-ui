# Fix Session Modal Subtitle Overflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the CLI Analytics Session Detail modal's subtitle from overflowing past the modal's right edge/close button, and show the full subtitle on hover only when it is actually truncated.

**Architecture:** Two additive changes in the existing `Popup` → `SessionModal` chain. (1) `Popup.tsx` gets a `pt.headerTitle` pass-through entry (`flex-1 min-w-0`) so PrimeReact's internally generated `p-dialog-title` wrapper shrinks instead of growing to content width — this is the actual missing width constraint. (2) `SessionModal.tsx`'s subtitle span adopts the repo's `useIsTruncated` + `Tooltip`/`data-pr-tooltip` convention (already used in `Card.tsx`, `WorkflowCard.tsx`) so a tooltip with the full subtitle appears on hover only when the text is actually clipped.

**Tech Stack:** React 18, TypeScript, Tailwind, PrimeReact (`Dialog`, `Tooltip`), Vitest + React Testing Library.

**Spec:** EPMCDME-16718 (Jira) + `docs/superpowers/tasks/2026-11-05-fix-session-modal-subtitle-overflow/technical-analysis.md`

## Global Constraints

- Never import PrimeReact `Dialog` directly — all modal changes go through `Popup`'s existing slot props (`.ai-run/guides/patterns/modal-patterns.md`).
- Tailwind-only, semantic tokens, no arbitrary values (`.ai-run/guides/styling/styling-guide.md`).
- Use the repo's `useIsTruncated(ref)` hook convention for the tooltip, not a plain `title` attribute (confirmed decision).
- `Popup` is shared by ~15+ other modals — the `pt.headerTitle` addition must be additive (shrink/stretch only), never change existing callers' layout.

## Review Focus

- A short subtitle (one segment, e.g. only `harness_name`) must not get an unwanted tooltip or clipped text — `useIsTruncated` must return `false` for it.
- A subtitle exactly at the boundary (wraps/clips by 1px) must not throw or loop — `useIsTruncated`'s `ResizeObserver` already handles this; no new risk introduced, but worth a sanity check in the test.
- Other `Popup` consumers using `headerContent` (e.g. the sign-in/sign-up modals) must not visually regress from the new `pt.headerTitle` entry — covered by Task 1's test asserting the class is additive, and a manual spot check in Stage 6.
- The modal's close button must remain fully visible and clickable regardless of subtitle length — implicitly covered by Task 1's width-constraint test.
- Missing `subtitle` (all fields `null`/falsy) must still render the modal without an empty/broken tooltip wrapper — `SessionModal.tsx` already guards this with `{subtitle && ...}`; Task 2's test confirms the guarded branch still works with the new ref/tooltip wiring.

---

### Task 1: Constrain Popup's generated header-title wrapper

**Files:**
- Modify: `src/components/Popup/Popup.tsx:232-263` (the `pt` pass-through object)
- Test: `src/components/Popup/__tests__/Popup.test.tsx`

**Interfaces:**
- Consumes: nothing new — `Popup`'s existing `pt` prop object.
- Produces: PrimeReact's internally rendered `.p-dialog-title` wrapper now carries `flex-1 min-w-0` whenever any `Popup` is open with `headerContent` (or `header`) set. Later tasks (Task 2) rely on this wrapper now shrinking so `truncate` works on the child subtitle span.

- [ ] **Step 1: Write the failing test**

In `Popup.test.tsx`, add a test asserting the generated title wrapper constrains width:

```tsx
it('constrains the generated header-title wrapper so long header content can shrink/truncate', () => {
  renderPopup({ headerContent: <div data-testid="long-header">long header content</div> })
  const titleWrapper = screen.getByTestId('long-header').closest('.p-dialog-title')
  expect(titleWrapper).toHaveClass('flex-1', 'min-w-0')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/Popup/__tests__/Popup.test.tsx -t "constrains the generated header-title wrapper"`
Expected: FAIL — `titleWrapper` is `null`'s classList (or missing `flex-1`/`min-w-0`), because `pt.headerTitle` does not exist yet.

- [ ] **Step 3: Add `headerTitle: { className: 'flex-1 min-w-0' }` to the `pt` object in `Popup.tsx`**

Add it as a sibling entry to `root`/`header`/`headerIcons`/`mask`/`content`/`footer` inside the same `pt={{ ... }}` object (around line 232-263). No other prop or callback changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/Popup/__tests__/Popup.test.tsx -t "constrains the generated header-title wrapper"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Popup/Popup.tsx src/components/Popup/__tests__/Popup.test.tsx
git commit -m "EPMCDME-16718: Constrain Popup header-title wrapper to allow shrinking"
```

---

### Task 2: Truncate the session subtitle with a hover tooltip

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx:16-58`
- Test: `src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx`

**Interfaces:**
- Consumes: `useIsTruncated(ref: RefObject<HTMLElement>) => boolean` from `@/hooks/useIsTruncated`; `Tooltip` from `@/components/Tooltip` (props: `target: string`, `position: string`, `showDelay: number`), used exactly as in `src/components/Card/Card.tsx:72` / `src/pages/workflows/components/WorkflowCard.tsx:169`.
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Write the failing tests**

In `SessionModal.test.tsx`, mock `@/hooks/useIsTruncated` so its return value is controllable, and add two tests:

```tsx
const mockUseIsTruncated = vi.fn()
vi.mock('@/hooks/useIsTruncated', () => ({
  useIsTruncated: () => mockUseIsTruncated(),
}))

it('sets a tooltip target with the full subtitle when the subtitle is truncated', () => {
  mockUseIsTruncated.mockReturnValue(true)
  mockUseCliAnalyticsSession.mockReturnValue({ session: MOCK_SESSION, loading: false, error: null })

  render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

  const subtitleEl = screen.getByText(/Cursor/)
  expect(subtitleEl).toHaveAttribute('data-pr-tooltip', expect.stringContaining('Cursor'))
})

it('does not set a tooltip when the subtitle is not truncated', () => {
  mockUseIsTruncated.mockReturnValue(false)
  mockUseCliAnalyticsSession.mockReturnValue({ session: MOCK_SESSION, loading: false, error: null })

  render(<SessionModal traceId="abc123" onHide={vi.fn()} />)

  const subtitleEl = screen.getByText(/Cursor/)
  expect(subtitleEl).toHaveAttribute('data-pr-tooltip', '')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx`
Expected: FAIL — `data-pr-tooltip` attribute does not exist on the subtitle span yet.

- [ ] **Step 3: Wire `useIsTruncated` and a `Tooltip` onto the subtitle span in `SessionModal.tsx`**

- Import `useRef` from `react`, `useIsTruncated` from `@/hooks/useIsTruncated`, and `Tooltip` from `@/components/Tooltip`.
- Add `const subtitleRef = useRef<HTMLSpanElement>(null)` and `const isSubtitleTruncated = useIsTruncated(subtitleRef)`.
- Give the subtitle a stable tooltip-target class, e.g. `const tooltipClass = 'tooltip-target-session-subtitle'`.
- Render `<Tooltip target={'.' + tooltipClass} position="bottom" showDelay={100} />` once alongside the `Popup` (same level as in `Card.tsx:72`).
- On the subtitle `<span>`: add `ref={subtitleRef}`, `data-pr-tooltip={isSubtitleTruncated ? subtitle : ''}`, `data-pr-position="bottom"`, and the `tooltipClass` in its `className` — keep the existing `text-xs text-text-secondary truncate` classes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx`
Expected: PASS (all tests in the file, including the pre-existing `harness_name` test)

- [ ] **Step 5: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/views/SessionModal.tsx src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx
git commit -m "EPMCDME-16718: Show full session subtitle in a tooltip only when truncated"
```
