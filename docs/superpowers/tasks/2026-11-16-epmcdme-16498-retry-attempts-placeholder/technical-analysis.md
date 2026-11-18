# Technical Research

**Task**: workflow retry-policy attempts editor (EPMCDME-16498)
**Generated**: 2026-11-16
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-16498, Bug, Minor; bug already reproduced locally by the user; stick strictly to ticket scope.

Title: Workflow retry policy shows misleading Attempts placeholder instead of backend default

Summary: The workflow editor displays `3` as the placeholder for Retry Policy → Attempts, while the backend default is `10` total attempts, including the initial execution.

Description: A placeholder can reasonably be read as the value that will apply when the field is left empty. This mismatch may cause users to expect three attempts when a failing workflow node can execute up to ten times. Slow operations, such as SMTP calls, can therefore take substantially longer to fail than expected.

Preconditions: A user can edit a workflow in the workflow editor. The Retry Policy → Attempts field has no explicitly configured value.

Steps to Reproduce: 1. Open a workflow in the editor. 2. Expand the Retry Policy settings in the configuration panel. 3. Observe the `3` placeholder in the Attempts field. 4. Leave the field empty and compare the implied value with the effective backend default of `10` total attempts.

Expected: The UI accurately communicates the effective default when Attempts is unset. The field description makes clear that the value counts total attempts, including the initial attempt; `1` means no retries.

Actual: The field shows `3` as a placeholder, suggesting a default of three attempts even though the backend default is 10. The meaning of Attempts is not made clear in the field description.

Affected Areas:
- Workflow editor Retry Policy configuration: codemie-ui/src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx
- Backend default and effective policy, for reference only (separate repo, not in this checkout): codemie/src/codemie/core/workflow_models/constants.py and codemie/src/codemie/core/workflow_models/workflow_config.py (get_effective_retry_policy())

Acceptance Criteria:
1. The Attempts placeholder or default hint reflects the effective backend default of `10` when the field is unset.
2. The field description distinguishes total attempts from retries and explains that `1` means one execution with no retries.
3. Leaving Attempts unset continues to use the backend default; the UI fix does not save a value merely to match the hint.
4. Explicitly configured workflow- and state-level retry policies retain their existing behavior and precedence.

feature_area: workflow retry-policy attempts editor

---

## 2. Codebase Findings

Project: React/TypeScript, Vite, Valtio, react-hook-form + yup, vitest (`package.json`). Guides in `.ai-run/guides/` exist; none mention workflow retry.

### Existing Implementations

Purpose: tell the editor user what Attempts value applies when the field is empty, and what the number means.

- Workflow-level field, `src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx:432-448`: `name="retry_policy.max_attempts"`, `label="Max Attempts"`, `placeholder="3"`, `hint="Upper limit of retry attempts after a failure. Must be a positive integer. Maximum: 100."`. The hint is rendered by `Input` as a tooltip (`src/components/form/Input/Input.tsx:135`). This is the only place the task's "Affected Areas" names. Hint text calls it "retry attempts after a failure", which is the retries-vs-total ambiguity.
  - Validation `:87-94`: positive integer, max 100 (so `1` is allowed). Empty maps to `null` via `transformToInteger` (`:40-43`).
  - Empty is preserved: `getDefaultValues` `:172-188` only seeds `retry_policy` when some value is non-null; `cleanFormValues` `:193-205` drops `retry_policy` when all values are null or empty; `saveData` `:265-274` passes the cleaned value to `onConfigChange`. Placeholder is display-only and does not enter form values.
  - Mounted once, `src/pages/workflows/editor/ConfigPanel.tsx:391`.
- State-level field, `src/pages/workflows/editor/configPanels/CommonStateFields.tsx:618-635`: `name="retry_policy.max_attempts"`, `label="Attempts"`, `placeholder="3"`, **no `hint`**. This is the field whose label matches the ticket's "Attempts". It is not in the ticket's Affected Areas.
  - Validation `:212`: `min(1)`, optional. `onChange` maps empty to `undefined` (`:629-631`).
  - Rendered by every node tab: `AssistantTab.tsx:385`, `ToolTab.tsx:267`, `SubWorkflowTab.tsx:163`, `CustomTab.tsx:200`. `TransformTab.tsx:200` passes `showAllFields={false}`, which hides the retry section per `docs/stories/2026-10-21-workflow-node-schema-visibility/technical-analysis.md`.
- Sibling retry placeholders in both files: initial interval `1`, backoff `2`, max interval `60` (`AdvancedConfigTab.tsx:460,497,479`; `CommonStateFields.tsx:567,586,605`). Backend defaults: 0.5, 2.0, 128.0, attempts 10.
- Backend, outside this checkout but present as a sibling at `C:/Users/Anton_Tomashevskyi/source/epam/codemie-dev/codemie/src/codemie/core/workflow_models/` (read-only, reference):
  - `constants.py:1-4`: `RETRY_POLICY_DEFAULT_INITIAL_INTERVAL = 0.5`, `BACKOFF_FACTOR = 2.0`, `MAX_INTERVAL = 128.0`, `MAX_ATTEMPTS = 10`.
  - `workflow_config.py:291-298` `get_effective_retry_policy(state)`: starts from the defaults, applies `self.retry_policy.model_dump(exclude_none=True)`, then `state.retry_policy.model_dump(exclude_none=True)`. Precedence is state, then workflow, then default, per field.
  - `workflow_config.py:301-307` `_get_default_retry_policy()` uses those constants.

Other touched code:
- `src/types/workflowEditor/configuration.ts:20-25` `RetryPolicy` (all fields optional); used at `:199` (state) and `:300` (workflow).
- `src/pages/workflows/editor/utils/visualEditorFieldRegistry.ts:139-142` lists `retry_policy.*` as advanced-config fields (routing only, no copy).
- `src/pages/workflows/editor/configPanels/utils/formUtils.ts:29` passes `retry_policy` through.

### Decisions Already in the Code
- Unset means omitted: empty Attempts is stripped before save (`AdvancedConfigTab.tsx:193-205`) and `undefined` at state level (`CommonStateFields.tsx:629-631`); the server fills the default. Alternative (prefilling the field with the default) is not used; reason: none found in comments.
- Convention for explaining a field: workflow-level uses `hint` prop (tooltip) plus `placeholder`; state-level fields use `placeholder` only, no hints in the retry section.
- Placeholders are hardcoded string literals; no shared constant for retry defaults in the UI (Grep `RETRY|max_attempts` in `src/constants`: none found).
- Backend default is not exposed to the UI by any API found; the number `10` would be a copy of a backend constant.

### Task Statements Checked Against the Code
- "Editor displays `3` as placeholder for Attempts": holds, in two places (`AdvancedConfigTab.tsx:442`, `CommonStateFields.tsx:624`).
- "Affected area is AdvancedConfigTab.tsx": partly holds. That file has `Max Attempts` and `3`; the field labelled `Attempts` is in `CommonStateFields.tsx`, which the ticket does not list. Which of the two the user reproduced is unverified.
- "Backend default is 10 total attempts": holds for the value (`constants.py:4`, `workflow_config.py:306`). "Including the initial execution" is not verifiable from these files; it depends on how LangGraph `RetryPolicy.max_attempts` counts (library, not read). Unverified; the ticket itself asserts it as the premise.
- "Unset keeps using backend default" (AC3): holds today via `get_effective_retry_policy` and the UI strip logic above. This keeps in place the cleanup in `AdvancedConfigTab.tsx:193-205` and the `undefined` mapping at `CommonStateFields.tsx:629-631`.
- "Workflow- and state-level policies retain precedence" (AC4): holds, `workflow_config.py:293-296`; the UI does no merging.

### Consumers of Changed Contracts
- The `placeholder="3"` string is asserted by `src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx:134` (`getByPlaceholderText('3')`) inside the test at `:110`. It would stop matching if the state-level placeholder changes.
- No test references the AdvancedConfigTab retry placeholder or hint (Grep for `placeholder|Retry|Attempts` in `AdvancedConfigTab.test.tsx`: no matches).
- `getByPlaceholderText('1')` / `'2'` / `'60'` at `:131-133` match the sibling placeholders and the other fields; a new placeholder of `10` is not currently asserted anywhere.
- Saved-config shape (`retry_policy` object) is unchanged by a copy change; consumers `ConfigPanel.tsx:391`, `formUtils.ts:29` unaffected.

### Architecture and Layers Affected
UI only: editor config-panel components (presentation strings). No store, API, or type change observed as necessary for the copy itself.

### Integration Points
Backend contract only by value (`max_attempts` default 10); no runtime link from UI to backend constants.

### Patterns and Conventions
`FieldController` + `Input` with `label`, `hint`, `placeholder`, `orientation="horizontal"`; yup schema for validation; hints are plain strings ending with constraints ("Must be a positive integer. Maximum: 100."). The `Max Concurrency` and `Max Nesting Level` hints state defaults in text (`:523` "Empty = server default").

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` present (components, patterns, testing); nothing specific to workflow retry copy. Checked `docs/` and `CHANGELOG.md` for retry/attempts: no relevant entries.

### Architectural Decisions
None found for retry defaults.

### Derived Conventions
See Patterns above. Placeholders in this tab mirror (or intend to mirror) defaults: `100000`, `20`, `10`, `25` for sibling numeric fields.

---

## 4. Testing Landscape

### Existing Coverage
- `configPanels/__tests__/CommonStateFields.test.tsx:110-135` asserts all four retry placeholders including `'3'`.
- `configPanels/__tests__/AdvancedConfigTab.test.tsx`: no retry-related assertions found.
- `editor/utils/__tests__/visualEditorFieldRegistry.test.ts:284-306` covers `retry_policy.*` routing only.

### Testing Framework and Patterns
vitest + Testing Library (`render`, `screen.getByPlaceholderText`); `vite.config.ts` `test.projects`. Per AGENTS.md, tests are written or run only when the user explicitly asks.

### Coverage Gaps
No test asserts the AdvancedConfigTab Max Attempts placeholder or hint, or that an empty Attempts is not saved.

---

## 5. Configuration and Environment

### Environment Variables
None found for retry/attempts.

### Configuration Files
None; the values are literals in the components.

### Feature Flags and Deployment Concerns
None found for this area (`useSubWorkflowEnabled` gates only the Sub-workflow accordion in the same file).

---

## 6. Risk Indicators

- Two fields carry the same misleading `3` placeholder (`AdvancedConfigTab.tsx:442`, `CommonStateFields.tsx:624`), but the ticket names only the first. Scope decision needed from the requester; see Section 2 "Task Statements".
- The state-level field has no `hint` prop, so AC2 (description) has no existing slot there; the workflow-level field does.
- `CommonStateFields.test.tsx:134` asserts placeholder `'3'` and would need to match any change at state level.
- Sibling placeholders (`1`, `2`, `60`) also differ from backend defaults (0.5, 2.0, 128.0). Outside this ticket's scope; noted as a fact only, not to be changed under this ticket.
- Hardcoded `10` duplicates a backend constant with no link; it can drift. No UI-readable source for the default found.
- "Includes the initial execution" depends on LangGraph semantics not verifiable in this repo.
- Speculative: any change that prefills the field with `10` rather than altering placeholder/hint copy would be saved by `saveData` (`AdvancedConfigTab.tsx:265-274`), contradicting AC3.
- Existing mechanism kept in place: the strip-empty logic (Section 2, Task Statements) supports AC3; it has no test coverage.

---

## 7. Summary for Complexity Assessment

The change sits entirely in the UI presentation layer: string props (`placeholder`, `hint`, possibly `label`) on one or two `Input` usages in `AdvancedConfigTab.tsx` (workflow-level "Max Attempts") and `CommonStateFields.tsx` (state-level "Attempts", shared by five node tabs). No type, store, API, schema or backend change is observable as part of the existing code; the backend default (10) and precedence (state, then workflow, then default) already hold in the sibling `codemie` checkout.

There is no technical novelty. Test posture is thin: one existing assertion on the state-level `'3'` placeholder (`CommonStateFields.test.tsx:134`) is directly affected by a state-level change; the workflow-level field has no retry tests. Empty-value handling (stripping empty `retry_policy`) already satisfies AC3 and is untested.

Main risk is scope: the ticket's named file holds the "Max Attempts" field, while the "Attempts" field the title describes is in `CommonStateFields.tsx` with the same placeholder and no hint. The ticket does not say whether both are in scope.

---

## 8. External References

None named by the task as a source of truth. The ticket cites backend files "for reference only"; they were read from the sibling checkout `C:/Users/Anton_Tomashevskyi/source/epam/codemie-dev/codemie/src/codemie/core/workflow_models/` and resolve: `constants.py` sets `RETRY_POLICY_DEFAULT_MAX_ATTEMPTS = 10`; `workflow_config.py:291-298` `get_effective_retry_policy` overlays workflow then state policy (`exclude_none=True`) on defaults. Whether `max_attempts` includes the initial execution was not verified (LangGraph library semantics not read).
