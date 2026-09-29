# EPMCDME-8503 — Conversation Starters Semantic List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace non-semantic `<div>` wrapper and `<div>` items in `ConversationStarters.tsx` with `<ul>/<li>` to satisfy WCAG 1.3.1.

**Architecture:** Single-file JSX change — introduce a `<ul>` as sibling to the existing `<h5>`, move the `flex flex-col gap-2` spacing onto it, and change each mapped `<div>` to `<li>`. Tailwind preflight resets list bullets and margin/padding, so visual appearance is unchanged with no extra classes needed.

**Tech Stack:** React 18, TypeScript, Tailwind 3, Vitest + React Testing Library (integration project).

**Spec:** Requirements inline (EPMCDME-8503).

## Global Constraints

- Only `ConversationStarters.tsx` and `AssistantDetailsPage.integration.test.tsx` may change — `ChatPromptStarters.tsx` is explicitly out of scope.
- Commit per task using the repository's existing convention (ticket prefix `EPMCDME-8503`).

---

## Acceptance criteria

- The conversation starter items are inside a `<ul>` element on the assistant details page.
- Each starter is an `<li>` element.
- Visual appearance is unchanged.
- An integration test asserts the list semantics with a non-empty `conversation_starters` fixture.

---

### Task 1: Convert ConversationStarters items wrapper to `<ul>/<li>` and add integration test

**Files:**
- Modify: `src/pages/assistants/components/AssistantDetails/components/ConversationStarters.tsx:24-31`
- Modify: `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` (new `it()` inside `'Initial Page Load'` describe)

**Test-first: yes — integration test using `getByRole('list')` and `getAllByRole('listitem')` fails because the rendered output is `<div>` elements, not `<ul>/<li>`.**

**Interfaces:**
- Consumes: `ConversationStartersProps` (`items?: string[]`) — unchanged.
- Produces: same default export `ConversationStarters`, new DOM shape: `<ul>` containing `<li>` children.

- [ ] **Step 1: Write the failing integration test**

  In `AssistantDetailsPage.integration.test.tsx`, inside the `'Initial Page Load'` describe block, add after the existing tests:

  ```tsx
  it('renders conversation starters as a semantic list', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI(
      'GET',
      'v1/assistants/id/asst-123',
      createAssistantFixture({ conversation_starters: ['Tell me a joke', 'Explain quantum physics'] })
    )
    mockAPI('GET', 'v1/user/reactions', { items: [] })

    renderPage('/assistants/asst-123')

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Tell me a joke')
    expect(items[1]).toHaveTextContent('Explain quantum physics')
  })
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  Run: `npx vitest run --project integration src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx`

  Expected: FAIL — `getByRole('list')` finds no `<ul>` in the DOM.

- [ ] **Step 3: Update ConversationStarters.tsx**

  At `src/pages/assistants/components/AssistantDetails/components/ConversationStarters.tsx:24-31`, change the return statement from:

  ```tsx
  return (
    <div className="flex flex-col gap-2">
      <h5 className="mb-1 text-xs font-bold">Conversation Starters:</h5>
      {items.map((item) => (
        <div className="w-fit rounded-lg rounded-br-sm px-4 py-2 text-xs bg-gradient1" key={item}>
          {item}
        </div>
      ))}
    </div>
  )
  ```

  to:

  ```tsx
  return (
    <div className="flex flex-col gap-2">
      <h5 className="mb-1 text-xs font-bold">Conversation Starters:</h5>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li className="w-fit rounded-lg rounded-br-sm px-4 py-2 text-xs bg-gradient1" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  Run: `npx vitest run --project integration src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx`

  Expected: all tests PASS, including the new `'renders conversation starters as a semantic list'` case.
