# Technical Research

**Task**: assistant form numeric overrides
**Generated**: 2026-10-27
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-16088 (Bug, fix version Prod 2.63.0) — "Clearing assistant Top P, Temperature, and Limit Tool Output Tokens does not persist after Save".
Repository: codemie-ui (C:\Users\KostiantynPshenychny\Documents\epm-cdme\repos\codemie-ui), branch EPMCDME-16088_clear-numeric-overrides from origin/main (2.62.0).

Ticket description (AI-generated, line refs are from 2.50.0/2.58.0 and may be stale):
Users cannot remove a previously saved Top P override through the UI. Clearing the field and clicking Save appears successful, but reopening restores the previous value. Same explicit-null omission identified in source for temperature and tools_tokens_size_limit.
Root cause per ticket: AssistantForm.tsx form preparation deleted empty top_p instead of sending null; request converter src/store/utils/assistants.ts used `top_p: assistant.top_p || undefined` (drops null and 0). Backend PUT v1/assistants/{id} (_map_assistant_request in codemie src/codemie/rest_api/models/assistant.py) uses request.model_fields_set: omitted field = preserve stored value, explicit null = clear.
Suggested fix: send explicit null when users clear saved numeric overrides; fix form prep and request conversion; preserve null and valid top_p = 0; update TS DTO/form types as needed; apply to temperature and tools_tokens_size_limit; keep backend omission semantics.
Acceptance criteria:
1. A previously saved Top P value can be cleared through the UI.
2. After Save and reload, Top P remains empty, and both master record and current configuration contain top_p = null.
3. Setting top_p = 0 persists correctly.
4. Setting a nonzero Top P value still persists correctly.
5. An API update that omits top_p preserves its previous value.
6. Regression coverage includes set → save → clear → save → reload.
7. The same clearing sequence works for Temperature and Limit Tool Output Tokens, persisting explicit null values.
8. Backend omission semantics remain unchanged for partial-update clients.

Already established: commit dc10f3dc0 (EPMCDME-15208, in 2.62.0) added `toNumberOrNull` in AssistantForm.tsx (~line 348) sending null on edit for temperature/top_p, and assistants.ts converter now passes temperature/top_p/tools_tokens_size_limit through unchanged. tools_tokens_size_limit is still `delete`d from preparedValues when empty (~lines 353-358) — the remaining defect. Verify this, check whether any other path (TS types for the request DTO, other converters, assistant config/versions, form initial values, Yup schema for tools_tokens_size_limit, other edit surfaces such as workflow/assistant duplicates or a separate "configuration" panel) still drops null for any of the three fields, check whether the backend actually accepts null for tools_tokens_size_limit (codemie repo at ../codemie — read-only), and locate existing unit tests covering dc10f3dc0's change to extend for regression coverage.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx`
  - Yup `formSchema` (l.143-154): `temperature: buildTemperatureRule().nullable()`; `top_p: Yup.number().nullable().min(0).max(1)` with `'' → undefined` transform; `tools_tokens_size_limit: Yup.number().integer().positive()` with `'' → undefined` transform and **no `.nullable()`**.
  - `defaultValues` (l.305-307): all three use `assistant?.X ?? undefined`, so a stored `null` loads as an empty input.
  - `prepareFormData` (l.327-372): `toNumberOrNull` (l.348-351) returns `Number(v)` for non-empty input, `null` when `isEditing`, else `undefined`. It is applied only to `temperature` and `top_p` in the returned object (l.362-363). **Confirmed remaining defect, l.353-358:**
    ```ts
    if (preparedValues.tools_tokens_size_limit == null || (preparedValues.tools_tokens_size_limit as unknown) === '')
      delete preparedValues.tools_tokens_size_limit
    else preparedValues.tools_tokens_size_limit = Number(preparedValues.tools_tokens_size_limit)
    ```
    The key is omitted from the PUT, so the backend keeps the stored value. This `delete` dates from `53f01abf1` (EPMCDME-9988 form redesign) and was not touched by dc10f3dc0.
  - `prepareFormData` also feeds `useUnsavedChanges({ getCurrentValues: prepareFormData, comparator: compareFormData })` (l.374-378). Initial and current snapshots both go through the same function, so the null/undefined choice is applied symmetrically.
- `src/store/utils/assistants.ts` `transformAssistantToCreateDTO` (l.86-88): passes `temperature`, `top_p` and `tools_tokens_size_limit` through as-is. No `||` coercion remains, so `null` and `0` survive. It is used by both `createAssistant` (`src/store/assistants.ts:769`) and `updateAssistant` (`src/store/assistants.ts:859-868`, `api.put('v1/assistants/${id}', ...)`).
- `src/types/entity/assistant.ts`: `Assistant.temperature?: number | null`, `top_p?: number | null` (l.104-105), but `tools_tokens_size_limit?: number` (l.106). `CreateAssistantDto` follows the same pattern: `temperature`/`top_p` are `number | null` (l.475-476) and `tools_tokens_size_limit?: number` (l.477). The `tools_tokens_size_limit` types do not admit `null`.
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx` (l.294-340): plain `Input` controllers. `tools_tokens_size_limit` has placeholder "30000" and no test id. `temperature` has `data-testid="assistant-temperature-input"`. `top_p` has placeholder "0-1" and no test id.

### Architecture and Layers Affected

- UI form layer: `AssistantForm.tsx` (schema, defaults, `prepareFormData`).
- Types: `src/types/entity/assistant.ts` (`Assistant`, `CreateAssistantDto`).
- Store / request conversion: `src/store/utils/assistants.ts` and `src/store/assistants.ts`. Both already pass null through.

### Integration Points

- Edit surfaces that share `AssistantForm` with `isEditing`: `src/pages/assistants/EditAssistantPage.tsx:126-127`, and the chat "configuration" panel `src/pages/chat/components/ChatConfiguration/ChatConfigAssistants/ChatConfigAssistantForm.tsx`, which renders `<AssistantForm isEditing isChatConfig>` and calls `assistantsStore.updateAssistant`. Fixing `prepareFormData` therefore covers both surfaces.
- Create and duplicate use `NewAssistantPage.tsx:198-200` with `isEditing={false}` (POST, optionally with `source_assistant_id`). Empty fields are omitted there by design, and the existing test asserts this.
- Not in scope (separate entity): `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` is a workflow virtual-assistant form, not a PUT to `v1/assistants`. It has its own `top_p` and `temperature` (non-nullable types, `top_p` default always `undefined`) and has no `tools_tokens_size_limit`.
- Not in scope: MCP server `tools_tokens_size_limit` (`MCPToolkit/.../formHelpers.ts`, `useMCPForm.ts`) is a per-MCP-server field, not the assistant-level override.
- Backend (codemie, read-only, HEAD `b6fb1e7d0`), `src/codemie/rest_api/models/assistant.py`:
  - `AssistantRequest` (l.338-342): `temperature: Optional[float] = None`, `top_p: Optional[float] = None`, `tools_tokens_size_limit: Optional[int] = Field(default=None, gt=0, ...)`. **Null is accepted.** `0` is rejected (`gt=0`).
  - `_map_assistant_request` (l.889-923) iterates request fields and applies `_should_update_field` = `fields_set is None or field in fields_set` (l.872-874). `_get_field_value_for_update` (l.877-881) only special-cases `prompt_variables` and `categories`. Explicit null clears the field and omission preserves it.
  - `src/codemie/service/assistant/assistant_version_service.py` (l.104-125): `versioned(name)` takes the request value if `name in fields_set`, else the merged assistant value (EPMCDME-14150). It includes `temperature`, `top_p` and `tools_tokens_size_limit`, so the configuration/version snapshot also records explicit null.
  - Backend test `tests/codemie/rest_api/models/test_assistant_request_validation.py:124-141` parametrizes `tools_tokens_size_limit` over `[None, 1, 100, 30000]`.
  - Runtime consumers treat falsy as "no limit": `agents/assistant_agent.py:390`, `agents/langgraph_agent.py:1182`, `service/script_tool_calls/context.py:165-166`.

### Patterns and Conventions

- Explicit-null-on-edit / omit-on-create via `toNumberOrNull` plus the `isEditing` prop, with an explanatory comment at l.345-347.
- react-hook-form with `yupResolver` and `Controller`-wrapped `Input`. Empty inputs are normalized with a Yup `transform('' → undefined)`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/form-patterns.md`, `.ai-run/guides/testing/testing-patterns.md` and `.ai-run/guides/testing/qa-strategy.md` exist (routed from `AGENTS.md`). Tests are Vitest with two projects (`unit`, `integration`).
- The prior run's analysis lives under `docs/superpowers/tasks/` (added by dc10f3dc0).

### Architectural Decisions

- Backend partial-update contract: omitted = preserve, explicit null = clear (`_map_assistant_request`, EPMCDME-14150 comment in `assistant_version_service.py:104-107`).
- UI: the comment at `AssistantForm.tsx:345-347` records the edit-null / create-omit decision from EPMCDME-15208.

### Derived Conventions

- Regression tests for request bodies use `global.fetch` mock-call inspection (`putBodyOf()` helper) in page integration tests.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx`, `describe('Optional numeric model params')` (l.125-167):
  - clearing temperature and top_p sends `null` in the PUT
  - a changed temperature sends the new value
  - Helpers: `openEditForm(overrides)` and `putBodyOf()`.
  - No coverage for `tools_tokens_size_limit`, a `top_p = 0` PUT, or reload after save.
- `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` (l.1208-1278): POST includes temperature and top_p, and omits them when empty on create.
- `src/store/utils/__tests__/assistants.test.ts`, `describe('optional numeric model params')` (l.38-68): keeps `0`, forwards `null`, omits `undefined`. Covers temperature and top_p only.
- `src/store/__tests__/utils/assistants.test.ts`: a second, separately located file that tests only `tools_tokens_size_limit` set/undefined for the converter. It has no null case.
- `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigAssistantForm.test.tsx` mocks `updateAssistant` and does not inspect numeric fields.
- `src/pages/assistants/utils/__tests__/compareFormData.test.ts` covers other fields only.

### Testing Framework and Patterns

Vitest with React Testing Library and `userEvent`. Integration tests use `renderPage` and `mockAPI` from `@/test-utils/integration`, and router mocks from `@/hooks/__mocks__/useVueRouter`.

### Coverage Gaps

- `tools_tokens_size_limit` clear → PUT `null`: no test.
- `top_p = 0` on edit PUT: no test (converter-level only).
- Set → save → clear → save → reload sequence (AC6): no test. The existing tests stop at the PUT body.
- Chat config panel PUT body: no numeric-field assertions.

---

## 5. Configuration and Environment

### Environment Variables

None relevant.

### Configuration Files

None relevant.

### Feature Flags and Deployment Concerns

None. The fields render unconditionally inside the assistant setup accordion.

---

## 6. Risk Indicators

- The `tools_tokens_size_limit` Yup rule (`AssistantForm.tsx:150-154`) lacks `.nullable()`. Form state currently never holds `null` (defaults use `?? undefined`). A `null` value introduced into form state would hit `typeError`.
- `tools_tokens_size_limit` is typed `number` (not `number | null`) in `Assistant` and `CreateAssistantDto`. Passing null through will hit TS type errors unless those types change, as `top_p` and `temperature` did in dc10f3dc0.
- Speculative: changing only `prepareFormData` also changes the `useUnsavedChanges` snapshot for edit forms (undefined → null on both sides). This should remain symmetric, but it is worth confirming that no false "unsaved changes" prompt appears.
- Two converter test files exist (`src/store/utils/__tests__/` and `src/store/__tests__/utils/`). Extending the wrong one, or duplicating cases, is likely.
- AC2 and AC5 (master record plus configuration `null`, API omission preserved) are backend behaviours. The UI repo can only assert the request body. Persistence after reload can only be simulated with mocks in UI tests. Real verification needs the local stack.
- `VirtualAssistantForm.tsx` (workflows) ignores the configured `top_p` (default always `undefined`). This is adjacent and out of scope, but may be raised in review.
- The `top_p` and `tools_tokens_size_limit` inputs have no `data-testid`. Tests rely on placeholders ("0-1", "30000").

---

## 7. Summary for Complexity Assessment

The remaining defect is confined to one UI layer. In `AssistantForm.tsx` `prepareFormData` (l.353-358), an empty `tools_tokens_size_limit` is still deleted from the payload, so a PUT omits it and the backend's `model_fields_set` contract preserves the old value. `temperature` and `top_p` were already fixed in dc10f3dc0 via `toNumberOrNull`. The request converter (`src/store/utils/assistants.ts`) and the store's `updateAssistant` already pass `null` and `0` through unchanged. The other edit surface, the chat configuration panel, reuses the same `AssistantForm` with `isEditing`, so it inherits any fix. Create and duplicate use `isEditing={false}` and intentionally omit empty fields.

Technical novelty is minimal: the pattern already exists in the same function. The likely change surface is `AssistantForm.tsx` and `src/types/entity/assistant.ts`, because `tools_tokens_size_limit` is typed `number` without `null` in `Assistant` and `CreateAssistantDto`. The non-nullable Yup rule is also a consideration. The backend (codemie, read-only) accepts `null` for `tools_tokens_size_limit` (`Optional[int]`, `gt=0`, with a parametrized test including `None`). It clears it on the master record and snapshots it in the configuration version via `versioned()`, so no backend change is indicated.

Test coverage is partial. The edit integration test covers clearing temperature and top_p, and converter unit tests cover null and 0 for those two fields. Nothing covers `tools_tokens_size_limit` null, a `top_p = 0` PUT, or the set → save → clear → save → reload sequence that AC6 requires. The main risks are TS typing, the non-nullable Yup rule, and two parallel converter test files. Overall this is a small, low-risk fix.

---

## 8. External References

The task names `../codemie` (sibling repo, read-only) for backend behaviour. It resolved to `C:\Users\KostiantynPshenychny\Documents\epm-cdme\repos\codemie` (HEAD `b6fb1e7d0`).

- `src/codemie/rest_api/models/assistant.py:338-342`: `top_p: Optional[float] = None`, `tools_tokens_size_limit: Optional[int] = Field(default=None, gt=0, description="Max token size limit for tool outputs for this assistant")`.
- `assistant.py:872-874`: `_should_update_field` returns `fields_set is None or field in fields_set`. `_map_assistant_request` (l.889-923) sets every updatable field present in `model_fields_set`, including explicit `None`.
- `src/codemie/service/assistant/assistant_version_service.py:104-125`: "Fields the client omitted are absent from request.model_fields_set, so snapshot them from the merged assistant ... explicitly-set fields still come from the request". `temperature`, `top_p` and `tools_tokens_size_limit` all use `versioned(...)`.
- `tests/codemie/rest_api/models/test_assistant_request_validation.py:124-141`: `tools_tokens_size_limit` accepts `None, 1, 100, 30000` and defaults to `None`.
