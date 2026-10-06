# EPMCDME-14840 — Filled feedback icons instead of a new color token — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the selected like/dislike state in chat by filling the icon, and drop the extra `text.accent.feedback` theme token, as the reviewer asked on MR !1952.

**Architecture:** `MessageFeedbackActions` picks the icon by state: liked → `thumb-up-filled.svg` with the existing `text-text-accent`; disliked → the same filled icon with `rotate-180` and the existing `text-failed-secondary`; unselected → the current outline icons. This is the pattern already used in `SkillCard.tsx:115-136`. `ChatMessageAction` passes `iconClassName` straight to the SVGR `<svg>`, so `rotate-180` rotates the icon itself.

**Tech Stack:** React 18, TypeScript, Tailwind 3.4, SVGR (`?react`), Vitest + Testing Library (`--project unit`, jsdom).

**Spec:** no `spec.md` (sdlc-light). Requirements = reviewer comment by Andriy Lukashchuk on `tailwind.config.ts:378` (28.09): "Let's use the existing color token — adding a new one is too much for this and it will not work with theming engine. tl;dr — I suggest we just fill the icon when the feedback is sent." Codebase context: `technical-analysis.md` in this folder.

## Global Constraints

- No new theme tokens; only existing classes (`text-text-accent`, `text-failed-secondary`).
- No new SVG assets; reuse `@/assets/icons/thumb-up-filled.svg?react`.
- Keep the tooltip typo fix from `6a2045d1b` (`your negative feedback`).
- Run tests with the `LC_ALL=en_US.UTF-8` prefix (uk_UA locale breaks suites).

## Review Focus

1. Dark theme: the liked icon keeps the near-white `text-text-accent`, so the selected state must be carried by the filled shape. → Task 1 test `liked state renders the filled icon with the existing accent class`.
2. Disliked icon must point down (rotated filled thumb), not up. → Task 1 test `disliked state renders the filled icon rotated`.
3. Unselected state must still show outline icons (no regression for messages without feedback). → Task 1 test `unselected state renders outline icons`.
4. Removing the token must not leave any reference behind (a dangling class silently renders default color). → Task 2 grep check.
5. Toggling back (remove feedback) returns to the outline icon — same code path as 3, covered by state-driven rendering.

---

### Task 1: Filled icon for the selected state

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx:19-20, 166-179`
- Test: `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/__tests__/MessageFeedbackActions.test.tsx` (append a describe block + three icon mocks)

**Interfaces:**
- Consumes: `ChatMessageAction` props `icon: FC<SVGProps<SVGSVGElement>>`, `iconClassName?: string`.
- Produces: no new exports.

Test-first: yes — `liked state renders the filled icon with the existing accent class` fails because the like button renders the outline icon (`thumb-up-outline` testid) with `text-text-accent-feedback`.

- [ ] **Step 1: Write the failing tests** — add icon mocks that forward props (so class assertions can fail) and a describe block:

```tsx
vi.mock('@/assets/icons/thumb-up.svg?react', () => ({
  default: (props: any) => <svg data-testid="thumb-up-outline" {...props} />,
}))
vi.mock('@/assets/icons/thumb-down.svg?react', () => ({
  default: (props: any) => <svg data-testid="thumb-down-outline" {...props} />,
}))
vi.mock('@/assets/icons/thumb-up-filled.svg?react', () => ({
  default: (props: any) => <svg data-testid="thumb-up-filled" {...props} />,
}))

describe('MessageFeedbackActions — selected state icons (EPMCDME-14840)', () => {
  const withMark = (mark: string) => ({ ...message, userMark: { mark } })

  it('liked state renders the filled icon with the existing accent class', () => {
    render(<MessageFeedbackActions message={withMark('correct')} indexes={indexes} />)
    const icon = within(screen.getByRole('button', { name: 'Click to remove your positive feedback' })).getByTestId('thumb-up-filled')
    expect(icon).toHaveClass('text-text-accent')
    expect(icon).not.toHaveClass('rotate-180')
  })

  it('disliked state renders the filled icon rotated', () => {
    render(<MessageFeedbackActions message={withMark('wrong')} indexes={indexes} />)
    const icon = within(screen.getByRole('button', { name: 'Click to remove your negative feedback' })).getByTestId('thumb-up-filled')
    expect(icon).toHaveClass('rotate-180')
    expect(icon).toHaveClass('text-failed-secondary')
  })

  it('unselected state renders outline icons', () => {
    render(<MessageFeedbackActions message={message} indexes={indexes} />)
    expect(within(screen.getByRole('button', { name: 'Like this response' })).getByTestId('thumb-up-outline')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: 'Dislike this response' })).getByTestId('thumb-down-outline')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify RED** — `LC_ALL=en_US.UTF-8 npx vitest run --project unit src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions` → liked/disliked tests FAIL (`Unable to find an element by: [data-testid="thumb-up-filled"]`); unselected passes (guards existing behaviour).

- [ ] **Step 3: Implement**

```tsx
import ThumbDownSvg from '@/assets/icons/thumb-down.svg?react'
import ThumbUpFilledSvg from '@/assets/icons/thumb-up-filled.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
...
      <ChatMessageAction
        icon={isLiked ? ThumbUpFilledSvg : ThumbUpSvg}
        onClick={handleLike}
        iconClassName={cn('h-4', isLiked && 'text-text-accent')}
        label={isLiked ? 'Click to remove your positive feedback' : 'Like this response'}
      />

      <ChatMessageAction
        icon={isDisliked ? ThumbUpFilledSvg : ThumbDownSvg}
        onClick={handleDislike}
        iconClassName={cn('h-4', isDisliked && 'rotate-180 text-failed-secondary')}
        label={isDisliked ? 'Click to remove your negative feedback' : 'Dislike this response'}
      />
```

- [ ] **Step 4: Run to verify GREEN** — same command → all tests in the folder pass (4 existing + 3 new).

- [ ] **Step 5: Mutation check** — temporarily render `ThumbUpSvg` for the liked state; the liked test must fail; revert by reversing that exact edit.

- [ ] **Step 6: Commit** — `EPMCDME-14840: Fill the feedback icon for the selected state`

### Task 2: Remove the `text.accent.feedback` token

**Files:**
- Modify: `tailwind.config.ts:378` (delete `feedback: [c['blue']['300'], c['blue']['400']],`)

Test-first: no — config removal; guarded by a grep that must return 0 matches and by the Task 1 tests (the component no longer references the class).

- [ ] **Step 1:** Delete the line.
- [ ] **Step 2:** `grep -rn "accent-feedback\|feedback: \[c\[" src tailwind.config.ts` → no output.
- [ ] **Step 3:** `npm run typecheck` and the Task 1 test command → green.
- [ ] **Step 4: Commit** — `EPMCDME-14840: Drop the accent feedback token`
