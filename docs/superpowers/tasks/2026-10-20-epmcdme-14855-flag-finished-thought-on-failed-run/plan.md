# Flag finished thought on failed run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** On an error terminal chunk with no in-progress thought, flag the last top-level thought so ThoughtHeader shows "Failed".

**Architecture:** Single edit to module-private `flagThoughtError` in the store; tests go through `_handleChunk`. Commit per task using the repository's existing convention.

**Spec:** requirements inline (EPMCDME-14855 follow-up); analysis in `technical-analysis.md` beside this file.

## Acceptance criteria

- Error terminal chunk, no in-progress thought, thoughts non-empty: last top-level thought gets `error = errorText`; its children are untouched.
- Several finished top-level thoughts: only the last is flagged.
- In-progress flagging (nested/parallel) is unchanged; no extra thought flagged when some were in progress.
- No thoughts: toast only, no crash.
- Success terminal chunk flags nothing.

### Task 1: Fallback flag in flagThoughtError

**Files:**
- Modify: `src/store/chatGeneration.ts:284-291` (comment plus `flagThoughtError`)
- Test: `src/store/__tests__/chatGeneration.terminalChunk.test.ts`

Test-first: yes — a finished single thought with an error terminal chunk currently keeps `error` undefined; the inverted test expects it set.

- [ ] **Step 1: Write failing tests** (reuse `createHistoryItem`, `handleChunk`, error chunk `{last:true, success:false, execution_error:'agent_token_limit', generated:'Token limit reached'}`):
  - Rename/invert test at lines 243-257 to "flags the last top-level thought when no thought is still in progress": `thoughts[0].error` truthy, toast called once.
  - New: three finished top-level thoughts, only `thoughts[2].error` truthy, `[0]` and `[1]` undefined.
  - New: finished last thought with finished child, parent `error` truthy, `children[0].error` undefined.
  - New: success chunk (`last:true, success:true`) with a finished thought, `error` undefined and toast not called.
- [ ] **Step 2:** Run `npx vitest run --project unit src/store/__tests__/chatGeneration.terminalChunk.test.ts`. Expected: the inverted, multi and children tests FAIL; success test passes.
- [ ] **Step 3:** In `flagThoughtError`, keep the `collectInProgressThoughts` flagging unchanged. When it returns empty and `historyItem.thoughts?.length` is truthy, set `error = errorText` on `thoughts[thoughts.length - 1]` only. Do not touch `collectInProgressThoughts`. Rewrite the comment above it: finished thoughts are left alone when others are live; when none are live, the last top-level thought is flagged (heuristic, reverses c43179bda to meet AC8; `interrupted`/`aborted` still win in `getThoughtStatus`).
- [ ] **Step 4:** Re-run the same test file. Expected: all pass, including existing nested, parallel and no-thoughts tests.
- [ ] **Step 5:** Run `npx tsc --noEmit` and `npx eslint src/store/chatGeneration.ts src/store/__tests__/chatGeneration.terminalChunk.test.ts` as separate commands. Expected: clean.

## Negative-constraint pass

negative-constraints checked: "children untouched" and "only last top-level" (Task 1 step 3 and children test); "leave collectInProgressThoughts unchanged" and "no extra thought when some in progress" (step 3, existing parallel test); "success flags nothing" (success test); "no presentation-layer or type change" (only the store file and its test are touched); "no thoughts: no crash" (existing test).
