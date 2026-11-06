# EPMCDME-8467 Bottom-Nav Label Contrast — Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that the already-committed fix for EPMCDME-8467 is correct and all quality gates pass, then produce the MR artifacts.

**Architecture:** Fix lives entirely in `src/utils/customAppearance/rules.ts` + `colorUtils.ts`. Two CSS vars are derived via `blendColorsHex` + `deriveContrastGray`; no component, store, or preset data changed. This is a verification-only run — no code will be written.

**Tech Stack:** TypeScript 5, Vitest (unit project), ESLint, tsc

**Spec:** Requirements supplied inline (no spec file). See Acceptance Criteria below.

## Acceptance Criteria

- [ ] WCAG AA contrast ratio (≥4.5:1) is met for `--colors-surface-specific-bottom-navigation-label` hover background across all 12 built-in appearance presets.
- [ ] The fix uses `blendColorsHex` + `deriveContrastGray` with named constants (`BOTTOM_NAV_LABEL_ALPHA = 0.8`, `MIN_LABEL_CONTRAST = 4.55`), not hardcoded black/white logic.
- [ ] `--colors-surface-specific-bottom-navigation-label` is present in the `CssVar` union in `schema.ts`.
- [ ] All quality gates pass: typecheck, unit tests, lint (pre-existing lint failures excepted).

## Global Constraints

- Branch: `EPMCDME-8467_bottom-nav-label-contrast`
- Commit per task using the repository's existing convention (ticket prefix `EPMCDME-8467:`).
- No new dependencies.
- No implementation code changes — verification only.

**negative-constraints:** The requirements state no hardcoded black/white logic. Task 1 confirms that constraint is honored. No task in this plan introduces any code.

---

### Task 1: Code-review the committed fix

**Files:**
- Read: `src/utils/customAppearance/rules.ts:236-259`
- Read: `src/utils/customAppearance/colorUtils.ts` (blendColorsHex, deriveContrastGray exports)
- Read: `src/utils/customAppearance/schema.ts` (CssVar union)
- Read: `src/utils/customAppearance/__tests__/rules.test.ts:178-198`

**Test-first: no — this task reads and verifies; it produces no code artifact.**

- [ ] **Step 1: Confirm rule implementation**

  Read `rules.ts` lines 33–56 (constants block) and 236–259 (§3 rules). Verify:
  - `BOTTOM_NAV_LABEL_ALPHA = 0.8` and `MIN_LABEL_CONTRAST = 4.55` are named constants.
  - `--colors-text-specific-bottom-navigation-label` calls `blendColors(navigationTextColor, navigationBackground, BOTTOM_NAV_LABEL_ALPHA)`.
  - `--colors-surface-specific-bottom-navigation-label` calls `deriveContrastGray(blendColorsHex(navigationTextColor, navigationBackground, BOTTOM_NAV_LABEL_ALPHA), MIN_LABEL_CONTRAST)`.
  - No hardcoded `#000000` / `#ffffff` / `black` / `white` in either rule.

- [ ] **Step 2: Confirm colorUtils exports**

  Read `src/utils/customAppearance/colorUtils.ts`. Verify:
  - `blendColorsHex` is exported and returns a hex string (used as intermediate, not emitted to CSS).
  - `deriveContrastGray` is exported and accepts `(hex: string, minContrast: number)`.
  - Output type of both paths is the same `"R G B"` channel string that the rest of the rules engine emits.

- [ ] **Step 3: Confirm schema coverage**

  Read `src/utils/customAppearance/schema.ts`. Verify `--colors-surface-specific-bottom-navigation-label` appears in the `CssVar` union type. If absent, this is a type-safety gap to flag (not to fix in this run).

- [ ] **Step 4: Confirm test coverage**

  Read `rules.test.ts` lines 178–198 (`describe('opacity.bottomNavigationLabelSurface')`). Verify:
  - Two cases: dark bg `#000000` / text `#A3A3A3` and light bg `#ffffff` / text `#525252`.
  - Both assert `contrastRatio(text, surface) >= 4.5` where `text` is `--colors-text-specific-bottom-navigation-label` and `surface` is `--colors-surface-specific-bottom-navigation-label`.

---

### Task 2: Run quality gates

**Files:** none modified.

**Test-first: no — gate execution, not feature implementation.**

- [ ] **Step 1: Install dependencies**

  ```
  npm ci
  ```
  Required before trusting any gate result (per project rules).

- [ ] **Step 2: Run typecheck**

  ```
  npm run typecheck
  ```
  Expected: zero new errors. Record the exit code and any error lines.

- [ ] **Step 3: Run unit tests**

  ```
  npm run test:unit
  ```
  Expected: `opacity.bottomNavigationLabelSurface` describe block passes (2 tests). Quote the `Test Files` line from the output. A broken import environment reports a falsely high pass count — confirm the line includes the rules.test.ts file.

- [ ] **Step 4: Run lint**

  ```
  npm run lint
  ```
  Pre-existing lint failures are excepted. Record whether any *new* errors appear in files touched by this commit (`rules.ts`, `colorUtils.ts`).

---

### Task 3: Produce MR artifacts

**Files:** none modified.

**Test-first: no — artifact generation, not code change.**

- [ ] **Step 1: Confirm branch and commit**

  ```
  git log --oneline -3
  git status
  ```
  Confirm the branch is `EPMCDME-8467_bottom-nav-label-contrast`, working tree is clean, and the top commit message begins with `EPMCDME-8467:`.

- [ ] **Step 2: Collect gate results**

  Assemble the gate summary for the MR description:
  - typecheck: pass / error count
  - unit tests: Test Files line, pass/fail counts
  - lint: new errors in touched files / none

- [ ] **Step 3: Check CURRENT-RULES.md sync (documentation risk)**

  Read `src/utils/customAppearance/CURRENT-RULES.md` (or locate it under its actual path). Confirm whether `--colors-surface-specific-bottom-navigation-label` appears in the §3 rules section. If absent, note it as documentation debt in the MR description — do not edit the file in this run.
