# EPMCDME-8478 Assistant Cards as a List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose assistant/template cards on Marketplace, Project Assistants and Templates pages as a semantic list (WCAG 1.3.1).

**Architecture:** All three pages render through `AssistantGrid.tsx`. Turn its grid `<div>` into a `<ul role="list">` and wrap each `<AssistantCard>` in an `<li>` inside the grid. The shared `Card` and `AssistantCard` stay untouched, so the other 5 `Card` consumers are unaffected and the `AssistantCard` sibling popups/tooltip sit inside the `<li>` (valid children).

**Tech Stack:** React, Tailwind, Vitest + React Testing Library.

**Spec:** none (inline requirements); analysis in `technical-analysis.md` in this directory.

Commit per task using the repository's existing convention.

## Acceptance criteria

- Marketplace, Project Assistants and Templates card grids expose `list` with one `listitem` per card.
- The list has an accessible name ("Assistants" or "Templates").
- Click behavior and visual layout are unchanged.
- `Card` component is not modified.
- `AssistantGrid.test.tsx` asserts the list and listitem roles.

## Global Constraints

- Do not modify `src/components/Card/Card.tsx`.
- Precedent: `<ul role="list" aria-label=...>` in `AssistantDetails/components/ConversationStarters.tsx`.

## Review Focus

- Layout: `justify-items-center` would shrink an `<li>` to content width; the `<li>` needs `w-full` so the card keeps its width.
- Empty list: the empty state must still render no `list` role.
- Template mode must name the list "Templates", not "Assistants".

### Task 1: Render AssistantGrid cards as ul/li

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx:71-107`
- Test: `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx`

**Interfaces:**
- Produces: the grid container is `<ul role="list" aria-label={isTemplate ? 'Templates' : 'Assistants'}>` with unchanged `cn(...)` classes; each card is wrapped in `<li key=... className="w-full">`. The `key` moves from `AssistantCard` to the `<li>`.

- [ ] **Step 1: Write the failing tests** in a new `describe('AssistantGrid list semantics')` block. The `AssistantCard` mock already renders `data-testid="assistant-card"`.
  - `exposes assistants as a named list with one listitem per card`: render with two stub assistants (distinct ids) and `isTemplate={false}`. Assert `getByRole('list', { name: 'Assistants' })` and `getAllByRole('listitem')` has length 2.
  - `names the list "Templates" in template mode`: render with `assistantTemplates={[stubTemplate]}` and `isTemplate`. Assert `getByRole('list', { name: 'Templates' })`.
  - `renders no list when empty`: render with `baseProps`. Assert `queryByRole('list')` is null.
- [ ] **Step 2: Run** `npx vitest run src/pages/assistants/components/AssistantList/AssistantGrid` and expect the first two new tests to FAIL (no list role).
- [ ] **Step 3: Implement** the change described in Interfaces. Do not alter the grid classes, the card props or the `onViewAssistant` wiring.
- [ ] **Step 4: Run** the same command and expect all tests to PASS. Also run `npx vitest run src/pages/assistants` to confirm `AssistantsListPage.integration.test.tsx` still passes.

Test-first: yes — the list/listitem role assertions fail until the grid emits `ul`/`li`.

## Out of scope (flag for caller)

- `src/pages/favorites/FavoritesPage.tsx:51-155` has the same plain-`<div>` grid but is not named in the ticket. It can be fixed in a follow-up using the same pattern.
- "Related assistant cards" is assumed to mean the Marketplace grid; this was not verified in a browser.
- Manual layout check on the three pages is left to the calling flow's verification stage.

## Negative-constraint pass

- "avoid changing the shared Card component": honored. Task 1 touches only `AssistantGrid.tsx` and its test.
- "keep click behavior and layout unchanged": honored. The grid classes are kept, the `li` is `w-full`, and no handlers change.
- "FavoritesPage out of ticket scope": honored. Only flagged.
