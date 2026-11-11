
# Technical Research

**Task**: workflow-editor forms accessibility
**Generated**: 2026-10-23
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15960 (Bug): Workflow editor: required list arguments lack required marker and accessibility state in FORM mode.

Problem: Required list-of-string tool arguments with no fixed choices look optional in the workflow editor FORM mode. They have no red asterisk and no aria-required state, unlike required scalar arguments. Example: exchange_forward.message_id shows the required marker, but exchange_forward.to does not. exchange_send.to and other mandatory list arguments are affected too. Authors only discover the requirement when they save.

Affected areas named in the ticket: ToolArgumentsForm, CustomNodeArgumentsForm, DynamicFieldsForm, and InputArray (frontend). Backend (ms_exchange/tools.py, config_extractor.py, routers/tool.py) already validates correctly and is out of scope — this is a frontend-only UI/accessibility bug.

Acceptance Criteria:
1. Required list arguments without fixed choices show a persistent red asterisk in workflow FORM mode.
2. Required array controls expose aria-required="true". Optional controls do not announce themselves as required.
3. Required state is passed from DynamicFieldsForm to InputArray.
4. Both tool-node and custom-node argument forms honor required list state.
5. Empty required lists still block saving. Populated valid lists allow saving.
6. Optional list fields and existing shared InputArray usages stay optional by default.
7. Regression coverage includes required and optional free-entry lists, including exchange_forward.to and exchange_send.to.

Fix consideration from the ticket: adding a prop alone is not enough — required state must be passed from DynamicFieldsForm, rendered in the label, and exposed accessibly. The default must stay off because InputArray is also used in assistant, user, and project forms (so changing InputArray's default behavior would be a regression risk).

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/form/DynamicFieldsForm/DynamicFieldsForm.tsx:93-222` (`renderField`) — switches on the dynamic field schema's `type`. For `FIELD_TYPES.LIST`:
  - If `values && values.length > 0` (fixed choices) → renders `<MultiSelect ... required={required} .../>` (line 174) — required **is** forwarded.
  - Otherwise (free-entry list, the case named in the ticket) → renders `<InputArray key={fieldName} label={label} value={fieldValue} onChange={...} error={error} isAIGenerated={false} ref={...} />` (lines 179-189) — `required` is **not** forwarded at all, confirming the reported bug at its exact source.
  - All scalar branches (BOOLEAN, INTEGER, FLOAT, TEXT, STRING) pass `required={required}` to their respective primitives (`Checkbox`, `Input`, `ExpandableTextarea`).
- `src/components/form/InputArray/InputArray.tsx` — `InputArrayProps` (lines 27-39) has no `required` field at all. The label render (lines 104-112) is a plain `<label>` with the text and an optional hint `TooltipButton`; no asterisk, no `aria-required` anywhere in the component. Each row renders a shared `Input` (line 140) but without passing `required`.
- `src/components/form/Input/Input.tsx` — the convention this fix must match:
  - Label asterisk (lines 118-139): `{required && <span className="text-text-error input-label-required ml-0.5" aria-hidden="true">*</span>}` next to the label text.
  - The underlying `<input>` receives the native HTML `required={required}` attribute (line 184) — not a literal `aria-required="true"` attribute. The accessibility-patterns guide's quick reference still lists `aria-required` as the attribute to use for a required field (see Section 3).
- `src/pages/workflows/editor/configPanels/components/ToolArgumentsForm.tsx` — fetches the tool's `args_schema`, computes `requiredFields` from the schema's `required` flags (lines 67-69) for issue tracking, and renders `<DynamicFieldsForm schema={schema.args_schema} ... />` (lines 106-114). It passes the whole schema through; it does not special-case list fields.
- `src/pages/workflows/editor/configPanels/components/CustomNodeForm/CustomNodeArgumentsForm.tsx` — thin wrapper, renders `<DynamicFieldsForm schema={schema.config_schema} ... issuePathPrefix="config" />` (lines 34-41). Same delegation pattern as ToolArgumentsForm — both node forms share one code path through `DynamicFieldsForm`, so a fix there fixes both (AC 4).
- `src/pages/workflows/editor/configPanels/components/ToolForm.tsx` — the parent of `ToolArgumentsForm`; owns the yup validation schema (`getValidationSchema(schemaRequiredFields)`, referenced at lines 162/337) built from the tool schema's required-field list. This is the save-blocking mechanism (relevant to AC 5) and is **separate** from the visual marker/aria fix — validation already works per the ticket, only the UI signal is missing.

### Architecture and Layers Affected

- **Shared form primitives layer** (`src/components/form/`): `InputArray` needs a new `required` prop, asterisk rendering, and an `aria-required` exposure — mirroring `Input`'s existing pattern.
- **Shared composite-form layer** (`src/components/form/DynamicFieldsForm/`): `DynamicFieldsForm.renderField`'s LIST branch (free-entry case) needs to forward `required` to `InputArray`, matching what it already does for `MultiSelect`.
- **Workflow editor config-panel layer** (`src/pages/workflows/editor/configPanels/components/`): `ToolArgumentsForm.tsx` and `CustomNodeArgumentsForm.tsx` — both already route through `DynamicFieldsForm`, so no changes are evidenced as necessary here beyond what the fix in the shared layer already covers (AC 4 is satisfied by fixing the shared component once).
- Outside this task's touch surface but sharing `InputArray`: `src/pages/assistants/components/AssistantForm/components/AssistantSetup/ConversationStartersField.tsx` and `src/pages/katas/components/KataFormFields.tsx` are two other callers of `InputArray` (per blast-radius data) — neither passes `required` today, so a default-off new prop leaves them unaffected (AC 6).

### Integration Points

- `DynamicFieldsForm` reads `required` off each field's `DynamicFormFieldSchema` entry (`schema[fieldName].required`), which both `ToolArgumentsForm` (from `assistantsStore.getToolSchema`) and `CustomNodeArgumentsForm` (from the custom node's `config_schema`) populate from backend-supplied schemas — this is the single source of truth for which list fields are required; no new data plumbing is needed, only forwarding an already-available value.
- `WorkflowContext.getIssueField` / `markIssueDirty` (used in `DynamicFieldsForm.handleFieldChange` and `renderField`) wire backend-reported issues to field refs; unrelated to the required-marker/aria fix but shares the same render path, so the ref assignment (`ref={issueField?.ref as Ref<HTMLInputElement>}`) on the `InputArray` branch must keep working.

### Patterns and Conventions

- Visual required marker: a `<span aria-hidden="true">*</span>` colored `text-text-error`, placed immediately after the label text, used consistently by `Input`. Any new `InputArray` marker should follow the same markup/class convention for visual consistency.
- The codebase's accessible-attribute convention for required fields is inconsistent in practice: the guide (`accessibility-patterns.md`) calls for `aria-required="true"`, but the existing `Input` component only sets the native HTML `required` attribute, not an explicit `aria-required`. AC 2 explicitly asks for literal `aria-required="true"`, which is stricter than what `Input` itself currently does — worth flagging to the spec writer rather than assuming `Input`'s exact behavior is the bar to match.
- `FieldAnnouncer` is the shared a11y primitive for `aria-invalid`/`aria-describedby`/error announcement, used by `Input`, `MultiSelect`, `Textarea`. `InputArray` does **not** currently use `FieldAnnouncer` — it renders its own inline error `<div>` (line 164) outside that shared contract. Any required/aria change should decide whether to also adopt `FieldAnnouncer` or stay with the existing ad hoc error pattern.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — ARIA quick reference lists `aria-required | Required form field | 'true'` (line 36); "Form Field Accessibility" example shows `aria-required='true'` set directly on an `Input`-wrapped `Controller` field (lines 74-94).
- `.ai-run/guides/patterns/form-patterns.md` — "Accessibility in Forms" table (lines 216-224): "Required indicator → `required` prop on component"; Pre-Delivery Checklist requires "Every field invariant enforced by a Yup validator, not only by component state" (line 241) — relevant to AC 5, confirming that the visual/aria fix must not be the only thing guarding save; schema-level validation (already in place per the ticket) remains the actual gate.
- `.ai-run/guides/development/workflow-editor-patterns.md` — describes the editor's node/edge/state architecture; does not mention tool-argument forms or `DynamicFieldsForm` specifically — this feature sits one layer below what that guide documents (config-panel forms, not canvas/state logic).

### Architectural Decisions

No ADRs found specific to form-primitive required/aria conventions beyond the guide text above; the convention is derived from `Input.tsx`'s existing implementation (Section 2).

### Derived Conventions

- Required-field asterisk markup and required-but-default-off prop design (new props default to not breaking existing callers) is an established pattern across this form library — `Input`'s `required?: boolean` defaults to `undefined`/falsy, same shape to replicate on `InputArray`.

---

## 4. Testing Landscape

### Existing Coverage

- No test files found for `InputArray`, `DynamicFieldsForm`, `ToolArgumentsForm`, or `CustomNodeArgumentsForm` (confirmed via blast-radius lookup: "no tests found within 3 caller hops" for all four).
- `src/components/form/Input/__tests__/Input.test.tsx` exists and covers the primitive this fix should mirror conventions from.
- `src/components/form/FieldAnnouncer/__tests__/FieldAnnouncer.test.tsx` exists, covering the shared a11y contract `InputArray` does not currently use.

### Testing Framework and Patterns

Vitest + React Testing Library (per `AGENTS.md` stack section); two projects, `unit` and `integration`. No test-writing is in scope for this research step; framework confirmed only.

### Coverage Gaps

- `InputArray` has zero existing tests — any new `required`/`aria-required` behavior starts from no regression baseline.
- `DynamicFieldsForm`'s LIST branch (both the fixed-choices `MultiSelect` path and the free-entry `InputArray` path) has zero existing tests.
- `ToolArgumentsForm` and `CustomNodeArgumentsForm` have zero existing tests despite being the two consumer entry points named directly in the ticket (AC 4, AC 7) — `exchange_forward.to` / `exchange_send.to` style scenarios would need new tests from scratch, not an extension of existing ones.

---

## 5. Configuration and Environment

### Environment Variables

None identified specific to this feature area — tool-argument schemas are fetched at runtime via `assistantsStore.getToolSchema(toolName, settingId)`, not environment-gated.

### Configuration Files

None specific to this feature — the required/optional state per field comes from the backend-supplied `args_schema` / `config_schema` payload (`DynamicFormFieldSchema.required`), not from a static config file in this repo.

### Feature Flags and Deployment Concerns

None found guarding this code path.

---

## 6. Risk Indicators

- Zero existing test coverage on all four files the ticket names (`InputArray`, `DynamicFieldsForm`, `ToolArgumentsForm`, `CustomNodeArgumentsForm`) — any regression test suite for this bug is new, not an extension.
- `InputArray` has two other call sites outside the workflow editor (`ConversationStartersField.tsx`, `KataFormFields.tsx`) that do not pass `required` today; Speculative: a new `required` prop must default to its current (unset/optional) behavior for both, or those forms silently start showing an asterisk/aria-required they didn't ask for.
- `Input.tsx`'s own required implementation sets native HTML `required`, not a literal `aria-required="true"` attribute — the accessibility guide and this ticket's AC 2 ask for the literal attribute. Speculative: whichever component ends up owning the fix (InputArray, or each inner `Input` row) may need to add `aria-required` explicitly rather than copy `Input`'s exact current pattern, since `Input` itself may not fully satisfy AC 2 as worded.
- `InputArray` does not currently route its error state through `FieldAnnouncer` (used by `Input`/`MultiSelect`/`Textarea`); Speculative: deciding whether the required/aria fix also needs to touch error-announcement plumbing is a design question, not a discovered requirement.
- `ToolForm.tsx` already computes `schemaRequiredFields` and builds the yup validation schema that blocks save (AC 5) — that mechanism is unrelated to and unaffected by the UI marker/aria fix; confirming AC 5 already passes today is a verification task, not a code change, per the ticket's framing that backend/validation is already correct.

---

## 7. Summary for Complexity Assessment

The change is scoped to the shared form-primitives layer (`src/components/form/InputArray`, `src/components/form/DynamicFieldsForm`) plus verification that the two workflow-editor consumers (`ToolArgumentsForm`, `CustomNodeArgumentsForm`) inherit the fix for free, since both already delegate entirely to `DynamicFieldsForm`. The root cause is a single missing prop-forward: `DynamicFieldsForm`'s free-entry LIST branch passes `required` to `MultiSelect` but not to `InputArray` (lines 174 vs. 179-189), and `InputArray` has no `required` prop, no asterisk markup, and no `aria-required` exposure to receive it even if passed. The fix pattern to copy already exists verbatim in `Input.tsx` (asterisk span at lines 126-133, native `required` attribute at line 184), reducing novelty.

Test coverage posture is a genuine gap: none of the four named files have any existing tests, so the required regression coverage (AC 7: required and optional free-entry lists, specifically `exchange_forward.to` / `exchange_send.to`) is new test authoring rather than extension of an existing suite. The main open design question is whether matching `Input`'s existing convention (native `required` only) satisfies AC 2's literal `aria-required="true"` wording, or whether the accessibility guide's stricter reading needs an explicit attribute addition beyond what the rest of the codebase currently does — flagged as speculative, not resolved, in Section 6. Overall: small, well-localized component change with a clear existing pattern to follow, offset by zero pre-existing test coverage across all touched files.

---

## 8. External References

None named by the task. The ticket names backend files (`ms_exchange/tools.py`, `config_extractor.py`, `routers/tool.py`) only to state they are already correct and out of scope — no absolute path or repository was given for them, and no in-repo path was named as a source of truth to read.
