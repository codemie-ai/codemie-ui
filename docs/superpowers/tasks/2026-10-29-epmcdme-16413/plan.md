# EPMCDME-16413 Assistant create: false "Unsaved changes" dialog Implementation Plan

**Goal:** A pristine Assistant create form is not reported dirty; real edits still are.

**Architecture:** Fix in the shared pure comparator `compareFormData` by normalizing optional numeric fields symmetrically. No change to the hook, blocker or `AssistantForm`.

Commit per task using the repository's existing convention ("EPMCDME-16413: Capital sentence").

## Acceptance criteria

- Leaving the create page with no field changed shows no dialog.
- Changing at least one field then leaving still shows the dialog.
- Reverting edited fields to their initial values shows no dialog.
- Saving an assistant does not trigger the dialog.
- Edit page unsaved-changes behavior is unchanged.

## Assumptions

- Root cause (from research, not runtime-verified): on create, `AssistantForm.tsx:348-363` yields `undefined` for `temperature`/`top_p`, while the `useUnsavedChanges` snapshot JSON-clone turns it into `null`; `compareFormData` does not normalize these, so lodash `isEqual` reports a diff immediately. On edit `toNumberOrNull` returns `null`, so no mismatch.
- `tools_tokens_size_limit` is `delete`d at `AssistantForm.tsx:353-358` on both sides when empty, so it already matches. It is normalized anyway for symmetry.
- Other async defaults are already handled: empty `llm_model_type` maps to the store default and an empty initial `project` adopts the current one (`compareFormData.ts:46-48,84-86`). `slug` is derived from `name` in `prepareFormData` on both sides. `shared`, `toolkits` and `mcp_servers` effects are assumed not to differ from the snapshot; they are covered by Task 2's pristine-form test and not changed unless that test fails.
- AC4 (save) is untouched: `unblockTransition()` in the submit path is not modified.

## Task 1: Normalize optional numeric fields in compareFormData

**Files:** Modify `src/pages/assistants/utils/compareFormData.ts:23-82`; Test `src/pages/assistants/utils/__tests__/compareFormData.test.ts`

Test-first: yes — `compareFormData(initial{temperature:null, top_p:null, tools_tokens_size_limit:null}, current{same keys undefined})` expects `false` (currently `true`).

- [ ] Add a helper `normalizeNumberField = (v: number | null | undefined) => v ?? null` next to the other helpers (line ~38).
- [ ] Apply it to `temperature`, `top_p` and `tools_tokens_size_limit` in both `normalizedInitial` and `normalizedCurrent`.
- [ ] Add tests in a new `describe('compareFormData — numeric overrides')` block using `base`:
  - undefined current vs null initial is not dirty (all three fields);
  - missing key vs null is not dirty;
  - `temperature` 0.5 vs null is dirty, and null vs 0.5 is dirty (symmetry, guards AC2/AC5);
  - `temperature` 0 vs null is dirty (0 must not collapse to null).

## Task 2: Regression test for a pristine create form

**Files:** Test `src/pages/assistants/utils/__tests__/compareFormData.test.ts`

Test-first: no — characterization test over the Task 1 fix; it passes once Task 1 is applied.

- [ ] Add one test that builds a create-shaped `current` (the `base` fields plus `temperature`/`top_p` undefined, `llm_model_type: ''`, `project` filled) and an `initial` that is its JSON-clone with `undefined` replaced by `null` (the hook's snapshot behavior), then expects `compareFormData(initial, current)` to be `false`. Set `mockAppInfoStore.llmModels` to a default model, as the existing `llm_model_type default` block does.
- [ ] Add one test that changing `name` on that same pair returns `true` (AC2).

## Negative-constraint pass

negative-constraints: none stated beyond "no dialog when untouched" and "edit page must not regress". Task 1 is symmetric (both sides) and keeps real value changes detectable, and no task touches the hook, `AssistantForm` or the submit path.
