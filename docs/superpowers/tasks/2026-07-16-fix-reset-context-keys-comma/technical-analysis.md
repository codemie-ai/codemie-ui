# Technical Research

**Task**: workflow configuration reset-context-keys comma input validation
**Generated**: 2026-07-16T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-13189: The 'Reset Context Keys' field in workflow configuration does not allow users to enter a comma character, although the field description states it accepts a comma-separated list. In version 2.33.0, users try to enter multiple context keys separated by commas (e.g., key1,key2,key3) but the comma character is blocked. Other characters like periods are accepted. Users must use YAML as a workaround to configure multiple reset keys.

Steps to Reproduce:
1. Open a workflow in the workflow editor.
2. Navigate to a state/configuration section containing the 'Reset Context Keys' field.
3. Try to enter multiple context keys separated by a comma.
4. Observe that the comma character cannot be entered.
5. Try entering another punctuation character (e.g., a period) -- it is accepted.

Expected: The field allows comma input (e.g., key1,key2,key3).
Actual: The comma character is blocked.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/editor/configPanels/CommonStateFields.tsx` — the only file rendering the "Reset Context Keys" field (`reset_keys_in_context_store`); contains the buggy `onChange` handler at lines 488–496
- `src/components/form/Input/Input.tsx` — shared `Input` component; exposes an optional `keyfilter?: RegExp` prop that strips disallowed characters via `.replace(regex, '')` on change; this prop is NOT applied to the Reset Context Keys field and is NOT the cause of the bug
- `src/types/workflowEditor/configuration.ts` — declares `NextState.reset_keys_in_context_store?: string[]`; type is correctly defined as an array of strings
- `src/pages/workflows/editor/configPanels/utils/formUtils.ts` — `buildNextStateConfig` serializes the array back to the YAML config; no bug present here
- `src/pages/workflows/editor/configPanels/components/FieldController.tsx` — thin wrapper around react-hook-form `Controller` that injects issue/validation state; no character filtering
- `src/constants/validation.ts` — central validation regex constants (`NAME_ALLOWED_CHARS`, email/password patterns); does NOT define any constraint on `reset_keys_in_context_store`
- `src/constants/workflows.ts` — defines `WORKFLOW_VISUAL_EDITOR_FLAG = 'visualWorkflowEditor'`; the buggy field is only reachable when this flag is active

### Root Cause

The bug is in `CommonStateFields.tsx` lines 488–496. The `onChange` handler for the `reset_keys_in_context_store` field immediately parses the raw typed string into an array on every keystroke, filtering out empty segments. The controlled `value` prop is re-derived from the stored array via `.join(', ')`. This collapses any trailing comma immediately:

```
User types "key1,"
→ onChange fires with "key1,"
→ splits to ["key1", ""], trims, filters empty → ["key1"]
→ field.onChange(["key1"])
→ value re-renders as "key1"  (comma gone)
```

The comma is not blocked by a keyfilter, validator, or `onKeyDown` interceptor. It is accepted by the browser, parsed, and silently discarded because the eager-parse-on-every-keystroke pattern with `.filter((key) => key.length > 0)` collapses trailing delimiters.

### Architecture and Layers Affected

- **UI Component layer**: `Input` (shared form component), `FieldController` (workflow-specific react-hook-form wrapper), `CommonStateFields` (config panel — bug location)
- **Form state layer**: react-hook-form `Controller` / `useForm` — stores parsed `string[]` in form state
- **Schema/Validation layer**: Yup (`validationSchema` in `CommonStateFields`) — `reset_keys_in_context_store` uses `Yup.array().of(Yup.string()).optional()`, which is correct and has no character-level restriction
- **Type layer**: `NextState`, `CommonNodeFieldValues` in `src/types/workflowEditor/configuration.ts`
- **Serialization layer**: `buildNextStateConfig` in `formUtils.ts`

Only the UI Component layer needs to change. The type, schema, and serialization layers are correct.

### Integration Points

- `CommonStateFields` → `FieldController` → react-hook-form `Controller`
- `CommonStateFields` → `Input` (shared form component)
- `CommonStateFields` → `formUtils.buildNextStateConfig` (serialization on form submit)
- `formUtils` → `CommonStateConfiguration` / `NextState` (type definitions)
- The affected field is gated behind `WORKFLOW_VISUAL_EDITOR_FLAG` (`visualWorkflowEditor`)

### Patterns and Conventions

- All other `Input` usages in workflow config panels do not attempt parse-on-every-keystroke; this pattern is unique to the Reset Context Keys field
- `Input.keyfilter` is used only in `Login.tsx` for password filtering and is an opt-in, not a default
- Arrays displayed as comma-separated strings are a one-off manual pattern here — there is no shared tag/chip-list input component in `src/components/form/`
- React Hook Form + Yup validation is the project-wide form pattern (see `.ai-run/guides/patterns/form-patterns.md`)
- `validationSchema` is co-located in `CommonStateFields.tsx` rather than a dedicated `formSchema.ts` (minor guide deviation, but consistent with this component's existing approach)

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/form-patterns.md` — project-wide form conventions (React Hook Form + Yup, `Controller` pattern, validation schema placement, accessibility). Directly governs how the fixed field should be implemented.
- `.ai-run/guides/development/workflow-editor-patterns.md` — workflow editor architecture (React Flow + dagre), state management, serialization, and testing strategy. Context for the affected component's module.
- `.ai-run/guides/components/reusable-components.md` — catalogs shared form components including `Input`. Confirms `Input` is the correct component for single-line text fields.

### Architectural Decisions

- No formal ADR files found in `docs/` (only `docs/superpowers/` and `docs/tasks/` exist with runtime artifacts).
- No CHANGELOG entries related to workflow config input validation.
- The `Input.keyfilter` pattern exists as an opt-in mechanism — its deliberate non-use on this field is consistent with the intent that character filtering should be explicit.

### Derived Conventions

- `onChange` handlers for form fields should track the raw string during editing and only convert to the domain type (array) on `onBlur` or form submission, not on every keystroke. This preserves intermediate typing state (trailing commas, spaces).
- Shared multi-value input behavior (comma-separated lists) is not yet abstracted into a reusable component. The fix in `CommonStateFields.tsx` may be a candidate for later extraction.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` — tests `ConfigPanel` tab switching and dirty-check; mocks out `CommonStateFields` entirely — provides no coverage of the field's behavior
- `src/utils/workflowEditor/actions/states/__tests__/duplicateState.test.ts` — verifies `reset_keys_in_context_store: ['key1','key2']` is preserved when a state is duplicated (data layer only; no UI rendering)
- `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — tests workflow form field disable logic; does not touch `reset_keys_in_context_store`

### Testing Framework and Patterns

- **Framework**: Vitest `1.6.1` with two projects: `unit` (jsdom) and `integration` (custom env with real Valtio + mocked API)
- **Libraries**: `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3
- **Patterns**: `vi.hoisted()` + `vi.mock()` for module-level mocks; `forwardRef`-aware component mocks with `useImperativeHandle` stubs; `WorkflowContext.Provider` + `UnsavedChangesProvider` wrapper for config panel tests; `createMockProps()` factory helpers; global fetch mock registry (`requestRegistry`) in `setupTests.tsx`

### Coverage Gaps

- `CommonStateFields.tsx` has **no unit test file**. This is the bug location. There is zero test coverage for rendering, field interaction, the array-to-string display conversion, or comma input behavior.
- `AdvancedConfigTab.tsx` — no dedicated test; only mocked by `ConfigPanel.test.tsx`
- `GeneralConfigTab.tsx` — no dedicated test
- `AssistantTab.tsx` — no dedicated test
- `Input` component (`src/components/form/Input/Input.tsx`) — no test file; `keyfilter` prop behavior is untested
- All Transition Settings accordion fields (`output_key`, `append_to_context`, `include_in_llm_history`, `clear_context_store`, `reset_keys_in_context_store`) — no UI-level interaction tests

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` — enables/disables the visual workflow editor where the buggy field lives; must be active to reproduce the bug
- `VITE_WORKFLOW_YAML_DOCUMENTATION_URL` — URL for YAML config documentation button in `WorkflowConfigField` (the YAML workaround currently used by users)
- `VITE_WORKFLOW_DOCUMENTATION_URL` — URL for workflow creation docs
- `VITE_IS_ENTERPRISE_EDITION` — enterprise edition toggle (local dev)
- `VITE_API_URL` — backend API base path

### Configuration Files

- `config.js` — runtime environment overrides injected into `window._env_`; governs API URL, environment name, app version, banner settings, feature toggles for user/budget management, IDP provider, MCP auth origin
- `vite.config.ts` — Vite build/dev config with path aliases, proxy rules, Vitest runner configuration

### Feature Flags and Deployment Concerns

- `WORKFLOW_VISUAL_EDITOR_FLAG = 'visualWorkflowEditor'` (in `src/constants/workflows.ts`) — the affected field is inside this flag's scope; the bug is only visible when the visual editor is enabled
- `workflowYamlDocumentation` — runtime flag controlling the Documentation button above the YAML editor (the current workaround surface)
- **No deployment changes are required**. This is a purely client-side controlled-input logic fix. No API, schema, or infrastructure changes are needed.

---

## 6. Risk Indicators

- **No unit tests for `CommonStateFields.tsx`**: The bug component has zero test coverage. The fix must be accompanied by new tests for the `reset_keys_in_context_store` field's input behavior (comma entry, multi-key parsing, array-to-string display, `onBlur` sync) or the gap will persist.
- **No shared tag/chip-list input component**: The comma-separated-list UX is a one-off implementation in `CommonStateFields`. The fix (buffering raw string during typing) adds more bespoke logic to an already large component. A follow-up extraction to a reusable component should be considered but is out of scope for this bug fix.
- **`Input.keyfilter` is untested**: The `keyfilter` prop on the shared `Input` component has no test coverage. If a future developer adds `keyfilter` to this field as an apparent fix, they would not receive test feedback and could re-introduce a real character-block.
- **Large component scope**: `CommonStateFields.tsx` handles many fields across multiple accordion sections. The fix is localized to lines 488–496, but the component's size increases the risk of inadvertent side effects if a refactor approach is taken.
- **Eager-parse pattern is unique to this field**: No other field in the workflow config panels uses parse-on-every-keystroke for array conversion. The fix should align with the `onBlur`-parse convention used elsewhere, but there is no existing example in this component to reference directly.
- **`WORKFLOW_VISUAL_EDITOR_FLAG` gate**: The bug is only reproducible with the visual editor flag enabled. Manual QA must verify in an environment where this flag is on.

---

## 7. Summary for Complexity Assessment

This is a low-complexity, single-file bug fix. The root cause is fully identified: in `src/pages/workflows/editor/configPanels/CommonStateFields.tsx` at lines 488–496, the `onChange` handler for the `reset_keys_in_context_store` field eagerly parses the raw typed string into an array on every keystroke and filters out empty segments, causing any trailing comma to be silently stripped on re-render. The fix requires introducing a local `useState` string buffer to hold the raw input value while the user is typing, syncing it from `field.value` on mount and external change (when unfocused), and deferring the array parse to `onBlur` or form submission. Only `CommonStateFields.tsx` needs to change; the type definition, Yup schema, and serialization layer are all correct as written.

The fix follows an established React controlled-input pattern and does not introduce any novel architecture. The `Input` component, `FieldController`, `formUtils`, and all type definitions remain untouched. The `Input.keyfilter` prop is a red herring and must not be used here. The guides in `.ai-run/guides/patterns/form-patterns.md` and `.ai-run/guides/development/workflow-editor-patterns.md` provide sufficient context for implementation.

The primary risk factor is the complete absence of tests for `CommonStateFields.tsx`. There are no existing tests to run against, no regression baseline, and no coverage for any of the Transition Settings fields. The fix should be accompanied by a new test file covering at minimum: (1) typing a comma-separated value and confirming the comma is preserved in the input, (2) `onBlur` triggering the correct array parse, and (3) initial render displaying an existing array as a comma-joined string. The test framework (Vitest + @testing-library/react + @testing-library/user-event) and the `WorkflowContext.Provider` wrapper pattern needed for this test already exist in `ConfigPanel.test.tsx`.
