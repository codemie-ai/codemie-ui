# Plan: MR !2222 review comments (compareFormData)

Commit per task using the repository's existing convention.

## Acceptance criteria

- An untouched create form (`effort` and `tool_permissions` undefined) is not dirty.
- A real `effort` change is still dirty.
- A real `tool_permissions` change is still dirty.
- `compareFormData.test.ts` covers all three cases.

## Task 1 — Normalize effort and tool_permissions in compareFormData

**Files:**
- `src/pages/assistants/utils/compareFormData.ts:60-92`
- `src/pages/assistants/utils/__tests__/compareFormData.test.ts:137-158`

Test-first: yes — pristine create form with `effort: undefined, tool_permissions: undefined` (initial holds null) reports not dirty; it fails today because undefined and null are not equal.

- [ ] Step 1 (test): In the `pristine create form` `setup()` (test line 144), add `effort: undefined, tool_permissions: undefined` to `current`. The existing "is not dirty when untouched" test now fails. Add two cases in the same block:
  - Initial `effort: null` against current `effort: 'high'` is dirty, and the reverse is dirty.
  - Initial `tool_permissions: null` against current `tool_permissions: { some_tool: 'allow' }` is dirty. Match the real shape of `tool_permissions` from the type used in `AssistantForm.tsx:368-374`.
- [ ] Step 2 (impl): In both `normalizedInitial` and `normalizedCurrent`, add `effort: x.effort ?? null` and `tool_permissions: x.tool_permissions ?? null`. Do this inline, next to the `normalizeNumberField` lines (73-75 and 89-91). Do not add a helper and do not switch to `isEqualWith`.

## Self-check

- negative-constraints: none violated. No docker and no test-run task, because qa-gates runs the tests later. `isEqualWith` is not used.
- The analysis found no other `prepareFormData` field that is undefined on create.
