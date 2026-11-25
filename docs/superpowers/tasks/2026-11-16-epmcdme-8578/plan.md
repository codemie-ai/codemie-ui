# EPMCDME-8578 Delete button hover contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every `ButtonType.DELETE` button a safe contrast margin (>= 5.0:1 target, hard floor 4.5:1) in default and hover states, in both themes.

**Architecture:** Fix in the shared layer only: the `failed.delete.{default,hover}` tokens (`tailwind.config.ts:459-462`) and, if needed, the DELETE class string (`src/components/Button/Button.tsx:87`). No ConversationCard override. The unmerged remote branch `EPMCDME-8578-delete-all-conversations-button-contrast-ratio-fix` is not reused.

**Tech Stack:** Tailwind theme tokens ([dark, light] tuples), Vitest + Testing Library.

**Spec:** none (inline requirements, EPMCDME-8578). Commit per task using the repository's existing convention (ticket key EPMCDME-8578 required).

## Acceptance criteria

- On `#/settings/profile`, hovered "Delete All Conversations" text vs its effective background is >= 4.5:1 in dark and light themes, with margin (target >= 5.0:1).
- The combination `#FE3B4C` on `#333436` cannot occur for any DELETE button hover.
- Default (non-hover) DELETE state also >= 4.5:1 in both themes (currently 4.17 dark, 3.88 light).
- No new dependency; no change to `ConversationCard.tsx`.

## Global Constraints

- Tuple order is [dark, light] (`.ai-run/guides/styling/theme-management.md`).
- Effective background = delete bg token at 10% alpha composited over `surface-base-chat` (dark `#1C1C1C`, light `#FFFFFF`, `tailwind.config.ts:223`).
- Run quality gates one at a time; tests only the ones named here.

## Review Focus

- Tokens are shared by ~70 DELETE consumers (modals, workflow editor, chat abort): the new colours must stay visibly "danger red" and keep default vs hover distinguishable.
- DELETE buttons rendered on other surfaces than `surface-base-chat` (modals, drawers): check the ratio on the modal surface too.
- Disabled DELETE state must not regress (Button disabled classes untouched).

---

### Task 1: Measure current contrast (baseline)

**Files:** none modified (throwaway Node one-liner, not committed).

**Test-first: no — measurement only; produces the baseline numbers used by Task 2.**

- [ ] **Step 1:** Using `node -e` (WCAG relative-luminance formula, 10% alpha composite over the surface), compute ratios for default and hover text vs composited bg, both themes, over `surface-base-chat` and also over the modal surface token used by `ConfirmationModal` (look it up in `src/components/ConfirmationModal`). Confirm the analysis baseline (dark hover 4.52, light hover 4.54, default 4.17 / 3.88) and record the table in the task notes.

### Task 2: Raise the shared delete tokens

**Files:**
- Modify: `tailwind.config.ts:459-462` (`failed.delete`)
- Modify (only if a token change alone cannot reach target): `src/components/Button/Button.tsx:87`

**Test-first: no — a colour-token value change; verified numerically in Task 4 and by the class assertion in Task 3.**

- [ ] **Step 1:** Replace the four values with literals (the file already uses hex literals in tuples, e.g. line 453) chosen so every state/theme/surface from Task 1 is >= 5.0:1. Starting candidates to evaluate: dark default `#FF5A64`, dark hover `#FF7A83` (lighter on hover on dark); light default `#C4202B`, light hover `#A8161F` (darker on hover on light). Adjust until the table passes; keep default and hover visibly distinct and red-hued. Do not edit `failed.primary/secondary/tertiary`, and do not add palette entries unless a literal is reused elsewhere.
- [ ] **Step 2:** Leave the Button DELETE class string unchanged unless Step 1 cannot reach the target; do not introduce new semantic class names (out of scope).

### Task 3: Pin the delete variant in the Button test

**Files:**
- Modify: `src/components/Button/__tests__/Button.test.tsx`

**Test-first: yes — `renders delete variant with failed-delete hover classes` fails if the DELETE variant stops using the shared `failed-delete-*` tokens (e.g. someone reintroduces a per-button override).**

- [ ] **Step 1:** Add one test following the file's existing render pattern: render `<Button type="delete">` and assert `toHaveClass('text-failed-delete-default', 'hover:text-failed-delete-hover', 'hover:bg-failed-delete-hover/10')`.
- [ ] **Step 2:** Run `npx vitest run src/components/Button/__tests__/Button.test.tsx`; expect all pass. (Cheap only; skip token-value assertions, Task 4 covers values.)

### Task 4: Verify computed contrast numerically for both themes

**Files:** none modified.

**Test-first: no — verification of Tasks 2.**

- [ ] **Step 1:** Re-run the Task 1 script against the final token values: default and hover, dark and light, over `surface-base-chat` and the modal surface. Every row must be >= 4.5, target >= 5.0. Quote the resulting table in the handoff notes.
- [ ] **Step 2:** Confirm `#FE3B4C` text over `#333436` cannot occur: grep `tailwind.config.ts` and `Button.tsx` to show the DELETE variant resolves only to `failed.delete.*` tokens and `surface-base-chat`/modal surfaces, never `surface-specific-dropdown-hover` (`#333436`).
- [ ] **Step 3:** Run `npx tsc --noEmit` and `npx eslint tailwind.config.ts src/components/Button` one at a time and report each result.
