# EPMCDME-15380 — Scrollable Global Left Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop branch of the global left nav (`#navigation-menu`) vertically scrollable so Help/Profile/Hide Menu are always reachable, and stop the pinned-assistants section from collapsing to zero height before the header gets a chance to scroll.

**Architecture:** Two independent, additive Tailwind-class changes to `src/components/Navigation/Navigation.tsx`: (1) add native `overflow-y-auto overflow-x-hidden` to the desktop header className, mirroring the mobile branch's existing pattern; (2) give the pinned-assistants wrapper a conditional non-zero `min-h` (derived from existing `ITEM_HEIGHT`/`CONTAINER_PB` constants) only when there is at least one pinned/help item to show, read from the same `assistantsStore` state `NavigationPinnedSection` already reads. No store, API, or routing change; no new prop/context.

**Tech Stack:** React 18, TypeScript, Tailwind, Valtio, Vitest + React Testing Library.

> **Superseded.** This plan's architecture (header-level scroll + a conditional height floor on
> the pinned-section wrapper) is not what shipped. Review replaced it with: only the middle links
> section scrolls (its own `flex-1 min-h-0 overflow-y-auto` wrapper); the logo, pinned section,
> Help, and Profile/expand button sit in non-shrinking blocks instead. The task steps below
> describe the abandoned first approach — see `code-review-final.json` for the final shipped
> design.

**Spec:** `docs/superpowers/tasks/2026-10-09-epmcdme-15380/spec.md`

## Global Constraints

- No change to `NavigationPinnedSection`'s internal `computeCollapsedBubbles`/`computeExpandedBubbles` logic.
- No new prop, context, or store between `Navigation.tsx` and `NavigationPinnedSection.tsx` — reuse the existing `assistantsStore` snapshot.
- No change to `appInfoStore`, routing, or any other API/data layer.
- No custom scrollbar component — plain native `overflow-y-auto` only.
- No change to the mobile overlay branch (`isMobileLayout` true arm).
- Profile and Hide Menu are NOT pinned/docked at the bottom — they scroll away with the rest of the content (Option A, explicitly chosen).
- Commit per task using the repository's existing convention.

## Review Focus

- Zero-items case (no pinned assistants, no help assistants fetched/empty) must contribute zero floor height — a reasonable reviewer would check this doesn't regress to always reserving space.
- Floor must not itself cause a scrollbar to appear when everything already fits in a tall viewport — only kicks in once content genuinely overflows.
- Desktop/mobile branches must stay mutually exclusive — the new classes must only land on the desktop (`else`) arm, never leak into `MOBILE_OVERLAY_CLASS_NAME`.
- `isPinnedAssistantsEnabled` being false must still correctly gate the floor condition (no floor contributed by pinned items when the flag is off, even if `pinnedAssistants` has stale data).
- Existing feature-flag-driven nav sections (Schedulers, Data Sources, Skills, Favorites) must keep rendering/hiding exactly as before — a header-level class change must not alter their mount logic.

---

### Task 1: Make the desktop header scrollable

**Files:**
- Modify: `src/components/Navigation/Navigation.tsx:207-213` (desktop `else` arm of the className ternary)
- Test: `src/components/Navigation/__tests__/Navigation.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new (pure className change on the existing `<header id="navigation-menu">`).

Test-first: yes — assert the desktop header carries `overflow-y-auto` and `overflow-x-hidden`, and that the mobile branch is unaffected.

- [ ] **Step 1: Write the failing test**

Add to the `describe('Navigation', ...)` block in `Navigation.test.tsx`:

```tsx
it('makes the desktop header vertically scrollable', () => {
  const { container } = renderWithRouter(<Navigation />)
  expect(container.firstChild).toHaveClass('overflow-y-auto')
  expect(container.firstChild).toHaveClass('overflow-x-hidden')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/Navigation/__tests__/Navigation.test.tsx -t "makes the desktop header"`
Expected: FAIL — header lacks `overflow-y-auto`/`overflow-x-hidden`.

- [ ] **Step 3: Add the overflow classes to the desktop branch**

In `Navigation.tsx`, add `'overflow-y-auto overflow-x-hidden'` to the array of classes in the desktop (`else`) arm at lines 207-213 (alongside `'h-full relative px-2 pt-6 pb-4 ...'`). Do not touch the mobile arm (lines 205-206).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/Navigation/__tests__/Navigation.test.tsx`
Expected: PASS, all existing tests in the file still green.

- [ ] **Step 5: Commit**

Commit per the repository's existing convention (ticket-prefixed message, e.g. `EPMCDME-15380: Make desktop navigation header vertically scrollable`).

---

### Task 2: Give the pinned-assistants wrapper a conditional height floor

**Files:**
- Modify: `src/components/Navigation/Navigation.tsx` (imports + body, wrapper at line 230)
- Test: `src/components/Navigation/__tests__/Navigation.test.tsx`

**Interfaces:**
- Consumes: `assistantsStore` (`@/store/assistants`) snapshot fields `pinnedAssistants`, `helpAssistants`, `helpAssistantsFetched`; `isPinnedAssistantsEnabled` (already destructured in `Navigation.tsx:83`); `ITEM_HEIGHT`, `CONTAINER_PB` from `@/components/Navigation/NavigationPinnedSection/pinnedSectionUtils`.
- Produces: a `hasPinnedContent` boolean local to `Navigation.tsx`; no exported interface change.

Test-first: yes — assert the wrapper's `min-h-*` class toggles between the floor value and `min-h-0` based on `assistantsStore` content.

- [ ] **Step 1: Write the failing tests**

Add to `Navigation.test.tsx` (uses the already-present `mockAssistantsStore` and `mockAppInfoStore.configs` to toggle `isPinnedAssistantsEnabled`):

```tsx
it('reserves a height floor for the pinned-assistants wrapper when there is at least one item', () => {
  mockAssistantsStore.helpAssistants = [{ slug: 'onboarding-assistant' }] as any
  mockAssistantsStore.helpAssistantsFetched = true
  mockAssistantsStore.pinnedAssistants = []
  const { container } = renderWithRouter(<Navigation />)
  const wrapper = container.querySelector('[data-testid="pinned-section-wrapper"]')
  expect(wrapper).not.toHaveClass('min-h-0')
})

it('contributes zero height to the pinned-assistants wrapper when there are no items', () => {
  mockAssistantsStore.helpAssistants = []
  mockAssistantsStore.helpAssistantsFetched = true
  mockAssistantsStore.pinnedAssistants = []
  const { container } = renderWithRouter(<Navigation />)
  const wrapper = container.querySelector('[data-testid="pinned-section-wrapper"]')
  expect(wrapper).toHaveClass('min-h-0')
})
```

(Use the real `ONBOARDING_ASSISTANT_SLUG`/`CHATBOT_ASSISTANT_SLUG` values from `@/constants/assistants` if they differ from `'onboarding-assistant'` — check that file before writing the literal.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/components/Navigation/__tests__/Navigation.test.tsx -t "pinned-assistants wrapper"`
Expected: FAIL — no `data-testid="pinned-section-wrapper"` exists yet and no conditional class.

- [ ] **Step 3: Implement the conditional floor**

In `Navigation.tsx`:
1. Import `assistantsStore` from `@/store/assistants` and `ITEM_HEIGHT`, `CONTAINER_PB` from `./NavigationPinnedSection/pinnedSectionUtils`.
2. Add `const { pinnedAssistants, helpAssistants, helpAssistantsFetched } = useSnapshot(assistantsStore)` alongside the existing `useSnapshot` calls.
3. Compute, mirroring `NavigationPinnedSection.tsx:352`'s `helpAssistantsFetched && allItems.length > 0` condition without duplicating its full `staticItems` derivation:
   ```ts
   const hasPinnedContent =
     helpAssistantsFetched &&
     (helpAssistants.length > 0 || (isPinnedAssistantsEnabled && pinnedAssistants.length > 0))
   ```
4. Change the wrapper at line 230 from `<div className="flex-1 min-h-0 overflow-hidden">` to:
   ```tsx
   <div
     data-testid="pinned-section-wrapper"
     className={cn(
       'flex-1 overflow-hidden',
       hasPinnedContent ? `min-h-[${ITEM_HEIGHT + CONTAINER_PB}px]` : 'min-h-0'
     )}
   >
   ```
   (If Tailwind's JIT does not pick up the interpolated arbitrary value at build time, use a static class name via `cn()`'s conditional branches instead, e.g. `hasPinnedContent ? 'min-h-[54px]' : 'min-h-0'` with the literal pixel value — confirm `ITEM_HEIGHT + CONTAINER_PB` still equals 54 before hardcoding, and prefer the literal form since Tailwind cannot statically extract a template-interpolated arbitrary class.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/components/Navigation/__tests__/Navigation.test.tsx`
Expected: PASS, all tests in the file green, including Task 1's.

- [ ] **Step 5: Commit**

Commit per the repository's existing convention (e.g. `EPMCDME-15380: Reserve a non-zero height floor for pinned assistants when present`).

---

## Self-Review

**Spec coverage:**
- Desktop scroll on overflow → Task 1.
- Help/Profile/Hide Menu reachable by scroll (they're siblings inside the now-scrollable header, no structural move needed) → covered by Task 1's class change; no separate task required since nothing else moves.
- Pinned section never fully disappears when it has content → Task 2.
- Pinned section contributes zero height when empty → Task 2 (second test case).
- Mouse/touchpad/keyboard scrolling → native `overflow-y-auto`, no code needed beyond Task 1 (per spec, satisfied for free).
- Mobile branch untouched → Task 1 explicitly scopes the class addition to the desktop arm only.
- `Navigation.test.tsx` gains overflow-class assertions → Task 1, Step 1.

**Placeholder scan:** none — every step shows literal code or an exact file:line target.

**Type consistency:** `hasPinnedContent` is a plain `boolean`, introduced and consumed only within Task 2's single file; no cross-task signature drift.

**Review Focus coverage:** all five items map to the tests in Task 1/Task 2 (overflow classes, floor-zero case, desktop/mobile exclusivity via Task 1 Step 1's second assertion, flag-off gating via `isPinnedAssistantsEnabled` in the `hasPinnedContent` expression, and existing feature-flag section tests already in `Navigation.test.tsx` remain untouched and are re-run in Step 4 of both tasks).

**Negative-constraints pass** (re-scanned spec Non-goals + Approach "no other structural change"):
- "No change to `NavigationPinnedSection`'s internal bubble logic" — honored; neither task touches that file.
- "No new prop, context, or store" — honored; Task 2 reads the existing `assistantsStore` directly in `Navigation.tsx`, same store `NavigationPinnedSection` already reads.
- "No change to `appInfoStore`, routing, or API layer" — honored; only Tailwind classes and one derived boolean touched.
- "No custom scrollbar styling/component" — honored; Task 1 uses only native `overflow-y-auto overflow-x-hidden`.
- "No change to the mobile overlay branch" — honored; Task 1 Step 3 explicitly scopes to the desktop arm, and Task 1's test asserts this isn't a shared code path by only exercising `renderWithRouter` in desktop mode (mobile mode is covered by the pre-existing, untouched mobile test block).
- "Profile and Hide Menu not pinned/docked at the bottom" — honored; no task adds `sticky`/`fixed` positioning or restructures the lower block; they remain plain flow children that scroll with the header.
- "No pixel-perfect/visual-regression harness" — honored; both tasks use class-presence `toHaveClass` assertions only.
negative-constraints: all re-scanned and satisfied (see above); none skipped.

---

Plan complete and saved to `docs/superpowers/tasks/2026-10-09-epmcdme-15380/plan.md`.
