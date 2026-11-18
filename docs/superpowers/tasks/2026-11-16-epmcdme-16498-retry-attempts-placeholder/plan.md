# EPMCDME-16498 Retry Attempts Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two retry-policy Attempts fields in the workflow editor show the backend default (`10`) and explain that the value counts total attempts.

**Architecture:** String-prop changes only (`placeholder`, `hint`) on two existing `Input` usages. No value prefill, no schema, type, store or backend change. Commit per task using the repository's existing convention.

**Tech Stack:** React, TypeScript, react-hook-form, vitest + Testing Library.

**Spec:** none (requirements inline, ticket EPMCDME-16498); research in `technical-analysis.md` in this directory.

## Acceptance criteria

- Both Attempts fields (workflow "Max Attempts", state "Attempts") show placeholder `10` when unset.
- Each field's description says the value is total attempts including the first execution, and `1` means one execution with no retries.
- The state-level description says an empty field inherits the workflow retry policy, or the server default (10) if none is set; the workflow-level description says an empty field uses the server default (10).
- An empty field is still not saved: `AdvancedConfigTab.tsx:193-205` (`cleanFormValues`) and `CommonStateFields.tsx:629-631` (`onChange` maps empty to `undefined`) are untouched.
- Explicit workflow- and state-level values keep their behavior and precedence (no validation or save-path change).
- Sibling placeholders (`1`, `2`, `60`) are unchanged.

## Global Constraints

- State-level hint copy, verbatim: `Total number of attempts, including the first execution (not the number of retries). 1 means run once with no retries. Leave empty to inherit the workflow retry policy, or the server default (10) if none is set.`
- Workflow-level hint copy, verbatim: `Total number of attempts, including the first execution (not the number of retries). 1 means run once with no retries. Leave empty to use the server default (10). Must be a positive integer. Maximum: 100.`
- Placeholder is the string `"10"` in both places. Never set a default or initial value to 10.

## Assumptions

- Verified: `max_attempts` counts total attempts including the first execution (backend imports `RetryPolicy` from `langgraph.pregel._retry`; LangGraph docs define it as total attempts).
- Backend precedence is default, then workflow `retry_policy`, then state `retry_policy` (`exclude_none`), so an empty state field inherits the workflow value when set and falls back to 10 only otherwise. The state-level hint reflects this.
- Open: the hardcoded `10` in copy and placeholder can drift if the backend default changes.

---

### Task 1: State-level Attempts field

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/CommonStateFields.tsx:618-635`
- Test: `src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx:134`

Test-first: yes — the existing assertion `getByPlaceholderText('3')` at line 134 is changed to `'10'`, and fails until the component placeholder changes.

- [ ] **Step 1:** In the test at `:110` ("keeps every other State Settings field visible..."), change line 134 to `expect(screen.getByPlaceholderText('10')).toBeInTheDocument()`. Do not touch the `'1'`, `'2'`, `'60'` assertions or add other tests.
- [ ] **Step 2:** Run `npx vitest run src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`. Expected: that test FAILS (no element with placeholder `10`).
- [ ] **Step 3:** In the `Input` at `CommonStateFields.tsx:622-633`, change `placeholder="3"` to `placeholder="10"` and add `hint` with the Global Constraints state-level hint copy. Leave `onChange` (`:629-631`) and validation (`:212`) as is.
- [ ] **Step 4:** Re-run the same command. Expected: PASS.

### Task 2: Workflow-level Max Attempts field

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx:441-442`

Test-first: no — `AdvancedConfigTab.test.tsx` has no retry assertions and the repo rule (AGENTS.md) writes tests only when asked; this is a copy-only change verified by the Task 1 run plus type-check and lint.

- [ ] **Step 1:** In the `Input` at `:436-446`, replace the `hint` string (`:441`) with the Global Constraints workflow-level hint copy, and change `placeholder="3"` (`:442`) to `placeholder="10"`. Leave `cleanFormValues` (`:193-205`), `saveData` and the yup rule (`:87-94`) untouched.
- [ ] **Step 2:** Run `npx tsc --noEmit` and `npx eslint src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx src/pages/workflows/editor/configPanels/CommonStateFields.tsx`, one at a time. Expected: no new errors.

## Negative-constraint pass

- No prefill or default of 10: Tasks 1 and 2 change only `placeholder` and `hint`.
- Sibling placeholders out of scope: neither task touches them.
- No backend change, no new abstractions or constants: honored.
- Tests limited to the existing `'3'` assertion: honored (Task 1 only).
