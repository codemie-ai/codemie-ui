# EPMCDME-16088 Clear Numeric Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On assistant edit, clearing Limit Tool Output Tokens sends `tools_tokens_size_limit: null`, as Temperature and Top P already do, so the backend clears the stored value.

**Architecture:** Frontend only. Replace the `delete` branch in `AssistantForm.tsx` `prepareFormData` with the existing `toNumberOrNull` helper. Widen the TS types to admit `null`. The converter (`src/store/utils/assistants.ts`) already passes values through unchanged.

**Tech Stack:** React 18, TypeScript, react-hook-form + Yup, Vitest + RTL (`unit` and `integration` projects).

**Spec:** inline requirements (Jira EPMCDME-16088). Research: `technical-analysis.md` in this folder.

Commit per task using the repository's existing convention (`EPMCDME-16088: <summary>`).

## Acceptance criteria

- [ ] Edit form: clearing a saved Limit Tool Output Tokens and saving sends `tools_tokens_size_limit: null` in the PUT.
- [ ] Edit form: clearing Temperature / Top P still sends `null`. `top_p = 0` and `temperature = 0` are sent as `0`. Non-empty values are sent as numbers.
- [ ] Create/duplicate: empty Temperature, Top P and Limit Tool Output Tokens are omitted from the POST.
- [ ] Opening and closing an untouched edit form does not report unsaved changes.
- [ ] Integration tests cover set → save → clear → save → reload for all three fields, as far as the mocked setup allows.

## Global Constraints

- No backend changes. No changes to `VirtualAssistantForm` (workflows) or the LLM model field.
- Type changes are limited to `tools_tokens_size_limit` in `Assistant` and `CreateAssistantDto`.
- Don't add comments. The existing comment at `AssistantForm.tsx:345-347` already describes the edit-null/create-omit rule.
- Each converter case lives in one of the two converter test files, never both.

## Review Focus

- Untouched edit form with stored `null`s: the initial and current `useUnsavedChanges` snapshots must stay equal (Task 2, compareFormData case).
- `top_p` / `temperature` = 0 on edit must not collapse to `null` (Task 1 test).
- Create with empty fields must omit `tools_tokens_size_limit`, not send `null` (Task 1 test).
- A stored `null` must load as an empty input, not "null" or "0" (Task 2 reload assertions).

---

### Task 1: Send explicit null for cleared tools_tokens_size_limit on edit

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:150-154` (Yup), `:353-358` and `:360-363` (`prepareFormData`)
- Modify: `src/types/entity/assistant.ts:106` (`Assistant`), `:477` (`CreateAssistantDto`)
- Test: `src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx` (`describe('Optional numeric model params')`, l.125-167)
- Test: `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx:1241-1277`
- Test: `src/store/__tests__/utils/assistants.test.ts` (the `tools_tokens_size_limit` describe only)

**Interfaces:**
- Produces: `prepareFormData()` returns `tools_tokens_size_limit: number | null | undefined`. The value is `null` only when `isEditing` is true and the field is empty.

**Test-first:** yes. The new edit test "sends tools_tokens_size_limit: null in the PUT body when cleared" fails today because the key is deleted from the PUT.

- [ ] **Step 1: Write the tests**
  - Edit test `sends tools_tokens_size_limit: null in the PUT body when cleared`: call `openEditForm({ tools_tokens_size_limit: 30000 })`, clear `getByPlaceholderText('30000')`, click Save, then assert `putBodyOf()` has property `tools_tokens_size_limit` equal to `null`.
  - Edit test `sends top_p: 0 and temperature: 0 in the PUT body`: call `openEditForm({ temperature: 0.5, top_p: 0.9 })`, clear both inputs, type `0` into each, save, then assert `putBodyOf().top_p === 0` and `putBodyOf().temperature === 0`.
  - Edit test `sends a typed tools_tokens_size_limit as a number`: open from `undefined`, type `1000`, save, then assert `putBodyOf().tools_tokens_size_limit === 1000`.
  - NewAssistantPage omit test (l.1241): rename it to cover all three fields and add `expect(body).not.toHaveProperty('tools_tokens_size_limit')`.
  - Converter (`src/store/__tests__/utils/assistants.test.ts`): add `forwards explicit null`. Build with `buildAssistant({ tools_tokens_size_limit: null })`, then assert `dto.tools_tokens_size_limit` is `null` and the JSON round-trip keeps `tools_tokens_size_limit: null`.
- [ ] **Step 2: Run the tests.** Command: `npx vitest run --project integration src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx`. Expected: the clear test FAILS because `putBodyOf()` has no `tools_tokens_size_limit` property.
- [ ] **Step 3: Implement the fix.**
  - Delete the `if/else` block at l.353-358.
  - Add `tools_tokens_size_limit: toNumberOrNull(values.tools_tokens_size_limit)` next to `temperature` / `top_p` in the returned object.
  - Add `.nullable()` to the `tools_tokens_size_limit` Yup rule, matching `top_p`.
  - Change both type declarations to `tools_tokens_size_limit?: number | null`.
- [ ] **Step 4: Run the tests again.** Run the three test files above plus `npx tsc --noEmit`. Expected: all pass with no type errors.

### Task 2: Regression for set → save → clear → save → reload, and unsaved-changes guard

**Files:**
- Test: `src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx` (same describe)
- Test: `src/pages/assistants/utils/__tests__/compareFormData.test.ts`

**Interfaces:**
- Consumes: the Task 1 `prepareFormData` behaviour.

**Test-first:** no. This is regression coverage over Task 1's behaviour, and the tests are expected to pass on the first run.

- [ ] **Step 1: Add the tests and run them** (`unit` and `integration` projects).
  - Edit test `persists set → clear → reload for temperature, top_p and tools_tokens_size_limit`:
    1. Open from a fixture with all three `null` and assert all three inputs are empty.
    2. Type `0.4`, `0.8` and `1000`, then Save. Assert the first PUT body carries those numbers.
    3. Unmount, re-mock GET with the saved values, and re-render. Assert the inputs show the values.
    4. Clear all three, then Save. Assert the latest PUT body has all three `null`.
    5. Unmount, re-mock GET with `null`s, and re-render. Assert the inputs are empty.
  - Add a `putBodies()` helper that returns every PUT body in call order. `putBodyOf` returns only the first.
  - If the harness cannot re-render inside one test, split the work at the reload boundaries into separate `it` blocks. Each block should start from the corresponding fixture.
  - compareFormData case `treats null numeric overrides as unchanged`: pass `{ project: 'p', temperature: null, top_p: null, tools_tokens_size_limit: null }` as both initial and current. Assert `compareFormData(...)` is `false`.

## Negative-constraint pass

- Create/duplicate must not send `null`. Task 1 keeps `toNumberOrNull` returning `undefined` when `!isEditing`, and the NewAssistantPage omit test asserts it.
- No backend changes, no `VirtualAssistantForm` changes and no LLM model changes: no task touches those files.
- Minimal type changes: Task 1 widens only `tools_tokens_size_limit` in `Assistant` and `CreateAssistantDto`.
- No duplicated converter cases: Task 1 adds the null case only to `src/store/__tests__/utils/assistants.test.ts`. The temperature/top_p file already covers its own fields.
- No comments: no task adds any.
