# Hide Decorative Background Images from Assistive Technologies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the non-empty `alt` text from two decorative gradient `<img>` elements in `EditorBackground.tsx` so screen readers no longer announce them.

**Architecture:** Single-attribute fix on a leaf component. `EditorBackground` is rendered only inside `WorkflowEditor` when `isFullscreen` is true. The correct pattern (`alt=""` + `role="presentation"`) is already used by `StandaloneLayout`'s three gradient images and is prescribed by the project accessibility guide.

**Tech Stack:** React 18, TypeScript 5.

**Spec:** `docs/superpowers/tasks/2026-09-04-EPMCDME-8456/spec.md`

## Global Constraints

- Touch only `EditorBackground.tsx` — no changes to `WorkflowEditor.tsx`, `StandaloneLayout.tsx`, or any other file.
- Do not add, remove, or change any attribute other than `alt` and `role` on the two affected `<img>` elements.
- Do not add accessibility tests (Non-goal in spec).
- Do not address `DetailsGradientSvg` / `DetailsSidebar.tsx` (out of scope).
- Commit per task using the repository's existing convention.

negative-constraints: spec Non-goals rule out automated tests, DetailsGradientSvg changes, and any modification beyond the two attributes. Task 1 honors all three: it changes only `alt` and `role` on the two `<img>` elements and touches no other file.

---

### Task 1: Fix decorative `<img>` alt attributes in EditorBackground

**Files:**
- Modify: `src/pages/workflows/editor/EditorBackground.tsx` — the two `<img>` elements at lines ~32–41 that carry `alt="background-gradient"`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

**Test-first: no** — the change is a structural attribute value with no runtime logic; no behavior branch exists to drive with a failing test. The acceptance check is a grep assertion run after the edit (Step 2).

- [ ] **Step 1: Make the attribute changes**

  In `src/pages/workflows/editor/EditorBackground.tsx`, find both `<img>` elements that carry `alt="background-gradient"`. For each one:

  - Replace `alt="background-gradient"` with `alt=""`
  - Add `role="presentation"` alongside it

  Reference shape (do not copy surrounding code verbatim — locate the existing element and apply only these two attribute changes):

  ```tsx
  <img
    alt=""
    role="presentation"
    // all other existing props unchanged
  />
  ```

  There are exactly two such elements (dark and light gradient variants). Both receive the same change.

- [ ] **Step 2: Verify no `alt="background-gradient"` remains**

  ```bash
  grep -n 'background-gradient' src/pages/workflows/editor/EditorBackground.tsx
  ```

  Expected: no output (zero matches).

- [ ] **Step 3: Confirm both images have the correct attributes**

  ```bash
  grep -n 'role="presentation"' src/pages/workflows/editor/EditorBackground.tsx
  ```

  Expected: two matches (one per image).

- [ ] **Step 4: Commit**

  ```
  git add src/pages/workflows/editor/EditorBackground.tsx
  git commit
  ```

  Use the repository's commit message convention with ticket prefix `EPMCDME-8456`.
