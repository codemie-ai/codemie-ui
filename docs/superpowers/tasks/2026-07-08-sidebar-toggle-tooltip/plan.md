# Sidebar Toggle Ctrl+B Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hover-hold tooltip reading "Toggle Sidebar (Ctrl + B)" to the sidebar hide/show toggle button.

**Architecture:** Add three `data-tooltip-*` attributes to the existing toggle `<button>` in `SidebarToggle.tsx`. The app's single global `react-tooltip` instance (already mounted, already configured for hover-hold) picks up any element carrying `data-tooltip-id="react-tooltip"` — no new component, state, or event wiring needed.

**Tech Stack:** React, TypeScript, `react-tooltip` (existing global instance in `src/utils/tooltip.ts`).

## Global Constraints

- Tooltip text: `"Toggle Sidebar (Ctrl + B)"` — exact string, per approved spec.
- Reuse `data-tooltip-id="react-tooltip"` pattern only. Do not use the separate `src/components/Tooltip/Tooltip.tsx` (PrimeReact) wrapper — wrong pattern for this button.
- `data-tooltip-place="right"` required — button sits at the left viewport edge; default top placement risks clipping.
- Do not modify the Ctrl+B keydown handler (`SidebarToggle.tsx:26-44`) — it is correct and out of scope.
- Do not change `aria-label` — it stays dynamic ("Hide Sidebar" / "Open Sidebar").
- No new test file — spec's non-goals section explicitly excludes new test infra for this XS, presentation-only, additive change (component has zero existing coverage).

---

### Task 1: Add hover-hold tooltip to sidebar toggle button

**Files:**
- Modify: `src/components/Sidebar/SidebarToggle.tsx:58-69`

**Interfaces:**
- Consumes: the app's global `react-tooltip` instance, already mounted and configured with `openEvents: { mouseover: true }` in `src/utils/tooltip.ts` (no import needed in this file — targeting is done via `data-tooltip-id`, matching the existing convention used in e.g. `src/pages/chat/components/ChatHeader/ChatHeaderClearButton.tsx:38-40`).
- Produces: nothing consumed by later tasks — this is the only task.

**Test-first: no — this is a presentation-only additive change (three static `data-*` attributes) to a component with zero existing test coverage; per the approved spec's non-goals, no new test file is introduced for this XS ticket.** Verification is manual (Task 2).

- [ ] **Step 1: Add the three `data-tooltip-*` attributes to the button**

Edit `src/components/Sidebar/SidebarToggle.tsx`, changing the button's opening tag (currently lines 58-69):

```tsx
      <button
        type="button"
        aria-label={isOpen ? 'Hide Sidebar' : 'Open Sidebar'}
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Toggle Sidebar (Ctrl + B)"
        data-tooltip-place="right"
        className={classNames(
          'bg-curve absolute left-0 top-[calc(50%-100px)] flex',
          'items-center justify-center cursor-pointer bg-surface-base-primary-border',
          'w-[24px] h-[128px] select-none bg-surface-specific-sidebar-toggle hover:bg-text-primary/15',
          'transition-all duration-150 z-10',
          sidebarOffsetClass
        )}
        onClick={toggle}
      >
```

Only the three `data-tooltip-*` lines are new; everything else in the button stays unchanged.

- [ ] **Step 2: Typecheck**

Run: `yarn tsc --noEmit` (or the project's configured typecheck script per `.ai-run/guides/quality-gates.md`)
Expected: no new errors introduced by this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar/SidebarToggle.tsx
git commit -m "EPMCDME-12771: add Ctrl+B tooltip to sidebar toggle button"
```

### Task 2: Manual verification

**Files:** none (verification only)

**Interfaces:** none

**Test-first: no — manual UI verification, not a unit-testable behavior change.**

- [ ] **Step 1: Start the dev server and open the app**

Run the project's dev server per `.ai-run/guides/development/setup-guide.md`.

- [ ] **Step 2: Hover-hold over the sidebar toggle button**

Expected: after the tooltip's `showDelay`/hover threshold, a tooltip reading "Toggle Sidebar (Ctrl + B)" appears to the right of the button, styled like other app tooltips (e.g. "Clear Chat" on the Chats page).

- [ ] **Step 3: Move the cursor away**

Expected: tooltip disappears.

- [ ] **Step 4: Click the button and press Ctrl+B**

Expected: sidebar still opens/closes correctly in both cases — no regression to existing toggle behavior.

- [ ] **Step 5: Repeat on at least one other page using the shared `SidebarToggle` component** (e.g. workflows, assistants, or skills page)

Expected: same tooltip behavior, confirming the shared-component change propagates correctly everywhere the ticket requires ("Chats page and other areas").
