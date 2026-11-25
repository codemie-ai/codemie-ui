# Technical Research

**Task**: assistants compareFormData unsaved-changes
**Generated**: 2026-11-24
**Research path**: filesystem

---

## 1. Original Context

Address MR !2222 review comments on branch EPMCDME-16413_fix-assistant-create-unsaved-dialog (now merged with origin/main). The MR fixes false 'Unsaved changes' dialog on assistant create: src/pages/assistants/utils/compareFormData.ts normalizes temperature, top_p, tools_tokens_size_limit so undefined==null. Reviewer comments (both on compareFormData.ts:91): (1) main now has `effort` (EPMCDME-13335); AssistantForm.prepareFormData returns it as undefined on create, so untouched create form reads dirty again. It's a string so normalizeNumberField doesn't fit; normalize `effort` with `?? null` on both sides or switch to isEqualWith treating null/undefined equal. (2) With feature flag `features:tool_permissions` off, untouched create form still reads dirty: prepareFormData sends `tool_permissions: assistant?.tool_permissions` (undefined on create), snapshot stores null. Normalize tool_permissions too, or isEqualWith. Add/extend tests in src/pages/assistants/utils/__tests__/compareFormData.test.ts. Also check whether any other prepareFormData field can be undefined on create.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/assistants/utils/compareFormData.ts:60-99` builds normalizedInitial/normalizedCurrent (spread + per-field normalizers) and returns `!isEqual(...)` (lodash). Lines 73-75 / 89-91 normalize temperature, top_p, tools_tokens_size_limit via `normalizeNumberField` (`value ?? null`, line 36). `effort` and `tool_permissions` are not normalized.
- `AssistantForm.tsx:330-376` `prepareFormData`: `effort: toEffortOrNull(values.effort)` returns undefined on create (357-360); `tool_permissions` is `assistant?.tool_permissions` when flag off or non-codemie assistant (368-374), undefined on create. Passed as `getCurrentValues` and `comparator: compareFormData` to `useUnsavedChanges` (378-382). The initial snapshot stores undefined as null (per the reviewer and the test helper at test lines 144-145 that maps undefined to null via JSON).
- Other touched code: `DashboardForm.tsx` also references prepareFormData (separate, not using compareFormData per grep scope).

### Decisions Already in the Code
- Convention: one normalizer per field type, applied symmetrically to initial and current.
- On create, optional params are deliberately omitted (undefined), AssistantForm.tsx:349-355.

### Task Statements Checked Against the Code
- Comment 1 (effort undefined on create): holds, AssistantForm.tsx:357-360, 366.
- Comment 2 (tool_permissions undefined with flag off): holds, AssistantForm.tsx:368-374.
- "Other prepareFormData fields undefined on create": defaultValues (292-323) set everything to a defined value except temperature, top_p, effort, tools_tokens_size_limit (all `?? undefined`). prepareFormData then adds: toolkits, disabled_context_tools, mcp_servers, conversation_starters (all defined), enable_image_generation, image_generation_model (null), file_attachment_enabled, is_react (boolean), slug (defined). `hedging_config` defaults to null (stays null). So the only remaining undefined-on-create fields are `effort` and `tool_permissions`. Lines 324+ of defaultValues were not read past line 323; tool_call_policy and allow_override are defined.

### Consumers of Changed Contracts
- `compareFormData` is consumed only via useUnsavedChanges in AssistantForm (grep of prepareFormData; comparator usage not exhaustively searched elsewhere).

### Architecture and Layers Affected
UI utility (compareFormData) and its unit test.

### Integration Points
`appInfoStore` (mocked in test), `useUnsavedChanges` hook.

### Patterns and Conventions
Small per-field normalizers; tests use `base` object and describe blocks per field.

---

## 3. Documentation Findings
Not consulted (small task). Conventions derived from code.

---

## 4. Testing Landscape

### Existing Coverage
`src/pages/assistants/utils/__tests__/compareFormData.test.ts`: file_attachment_enabled, hide_tool_outputs, numeric overrides (null/undefined/0), llm default, "pristine create form" block (lines 137-158) with a `setup()` that builds initial from current by mapping undefined to null.

### Testing Framework and Patterns
vitest, `vi.hoisted` mock of `@/store/appInfo`.

### Coverage Gaps
No test for effort or tool_permissions undefined vs null. The pristine-create `setup()` current has only temperature/top_p undefined; adding `effort: undefined, tool_permissions: undefined` there covers both.

---

## 5. Configuration and Environment
Feature flag `features:tool_permissions` (`toolPermissionsEnabled` in AssistantForm) governs which branch tool_permissions takes.

---

## 6. Risk Indicators
- Speculative: `effort` and `tool_permissions` can be handled with `?? null` in both normalized objects; alternative is `isEqualWith` with a null/undefined-equal customizer, which would also cover any future field (the root-cause option, since the recurring bug is every new optional field).
- Edit mode: effort and numeric params are sent as null when cleared; `?? null` keeps that equal to a stored null/undefined.
- Pre-existing `project` special case (compareFormData.ts:94-96) unaffected.

---

## 7. Summary for Complexity Assessment
Single utility file plus its test file; no new layers. Two fields (`effort`, `tool_permissions`) are undefined on create in prepareFormData and not normalized. All other prepareFormData fields have defined defaults on create.

Tests exist and have a pristine-create block that can be extended. Risk is low.

---

## 8. External References
None named by the task.
