# EPMCDME-16196 Locale-independent unit tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make number formatting in vitest runs host-independent by defaulting to `en-US`.

**Architecture:** Transcribe the author's "Locale" block into the shared setup file `src/setupTests.tsx`, which both vitest projects (`unit`, `integration`) load first (`vite.config.ts:115-144`). It wraps `Intl.NumberFormat` and `Number.prototype.toLocaleString` to default to `en-US` when no locale is passed.

**Tech Stack:** Vitest, TypeScript, ESLint (airbnb-base, `no-extend-native` active).

**Spec:** none (inline requirements); research in `technical-analysis.md` (same directory), block quoted in section 8.

Commit per task using the repository's existing convention. Do not commit in this run unless the caller asks.

## Acceptance criteria

- [ ] `src/setupTests.tsx` contains a `// ─── Locale ───` block between the jsdom virtualConsole re-route and `// ─── Browser globals ───`.
- [ ] `(12500).toLocaleString()` returns `12,500` and `new Intl.NumberFormat().format(12500)` returns `12,500` regardless of OS locale.
- [ ] An explicitly passed locale still wins (e.g. `toLocaleString('de-DE')` is unchanged).
- [ ] Both vitest projects (`unit`, `integration`) pass after `npm ci`.
- [ ] No lint error on the new block; no commit made.

Negative-constraint pass: Luxon/Date formatting and `localeCompare` are out of scope, so no task touches them; "do not commit" is honored (no commit step). Nothing else stated.

### Task 1: Add Locale block to shared test setup

**Files:**
- Modify: `src/setupTests.tsx` (insert after the jsdom virtualConsole block ending ~l.62, before `// ─── Browser globals ───` at ~l.64)

**Interfaces:**
- Consumes: nothing.
- Produces: global patched `Intl.NumberFormat` and `Number.prototype.toLocaleString` with `'en-US'` default (`locales ?? 'en-US'`), for all suites.

Test-first: no — setup-file change with no existing seam to fail first; the observable behavior (comma-grouped numbers) is verified by the existing ~14 test files that assert comma-grouped numbers, and by the optional runtime check in Step 2.

- [ ] **Step 1: Insert the block verbatim**

Copy lines 64-94 of `C:/Epam/codemie-dev/setupTests.tsx` (the `// ─── Locale ───` block, also quoted in technical-analysis.md section 8) into `src/setupTests.tsx` at the location above, followed by one blank line. Keep prettier style (no semicolons, single quotes); do not alter the `// eslint-disable-next-line no-extend-native` line placement (directly above the `Number.prototype.toLocaleString =` assignment).

- [ ] **Step 2: Sanity-check the patch loads**

Run a single existing formatting test, e.g. `npx vitest run --project unit src/utils/__tests__/currency.test.ts`. Expected: suite imports and passes. If setup throws on `Object.defineProperty(PatchedNumberFormat, 'prototype', ...)` (non-configurable `prototype` on a plain function), instead assign `PatchedNumberFormat.prototype = OriginalNumberFormat.prototype` and re-run. Optionally confirm `(12500).toLocaleString() === '12,500'` with a throwaway assertion, not committed.

- [ ] **Step 3: Lint the file**

Run `npx eslint src/setupTests.tsx`. Expected: no errors (the PostToolUse hook may already have fixed formatting).
