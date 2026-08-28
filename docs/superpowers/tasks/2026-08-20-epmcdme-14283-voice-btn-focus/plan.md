# EPMCDME-14283: Voice Button Focus Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible keyboard focus indicator to the "Use voice" / "Stop listening" button to satisfy WCAG 2.4.7.

**Architecture:** Single className edit on one `<button>` element in `ChatPromptVoiceRecorder.tsx`. Add the project-standard focus ring (`focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`) and `rounded-full` so the ring follows the circular button shape.

**Tech Stack:** React 18, TypeScript 5, Tailwind 3, Vitest + React Testing Library.

## Global Constraints

- Do NOT change `aria-label` logic — EPMCDME-8444 is already merged and must not be touched.
- Do NOT touch recording behaviour, MediaRecorder, getUserMedia, or the 10 s timeout.
- Focus ring token must be `focus:ring-primary-500` — matches the project's documented standard and existing usage in `NavigationMore.tsx`.
- TDD: write the failing test before adding the classes to the component.
- Commit message must carry the ticket key `EPMCDME-14283`.

---

### Task 1: Add focus ring to the voice recorder button

**Test-first:** yes — assert button className contains `focus:ring-2` and `focus:ring-primary-500`

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptVoiceRecorder.test.tsx` (add one test)
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptVoiceRecorder.tsx:122` (edit className)

**Interfaces:**
- Consumes: nothing new — same render setup as the two existing tests
- Produces: nothing downstream depends on this task

- [ ] **Step 1: Write the failing test**

Add the following test inside the existing `describe('ChatPromptVoiceRecorder', ...)` block in `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptVoiceRecorder.test.tsx`:

```typescript
it('has a visible focus ring indicator', () => {
  render(<ChatPromptVoiceRecorder onTextReady={vi.fn()} />)
  const button = screen.getByRole('button', { name: 'Use voice' })
  expect(button.className).toContain('focus:ring-2')
  expect(button.className).toContain('focus:ring-primary-500')
})
```

- [ ] **Step 2: Run the test to confirm it fails (RED)**

```bash
npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPromptVoiceRecorder.test.tsx
```

Expected: the new test fails — the current className string does not contain `focus:ring-2` or `focus:ring-primary-500`. The two existing tests must still pass.

- [ ] **Step 3: Implement the fix**

In `src/pages/chat/components/ChatPrompt/ChatPromptVoiceRecorder.tsx`, change line 122 from:

```tsx
      className="relative focus:outline-none w-[30px] h-[30px] flex items-center justify-center"
```

to:

```tsx
      className="relative focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full w-[30px] h-[30px] flex items-center justify-center"
```

- [ ] **Step 4: Run the tests to confirm all three pass (GREEN)**

```bash
npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPromptVoiceRecorder.test.tsx
```

Expected: all three tests pass. No other test file is affected.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPromptVoiceRecorder.tsx \
        src/pages/chat/components/ChatPrompt/__tests__/ChatPromptVoiceRecorder.test.tsx
git commit -m "EPMCDME-14283: Add focus ring indicator to voice recorder button"
```
