# Technical Research

**Task**: advanced-config workflow-form pool-config feature-flag sub-workflow
**Generated**: 2026-08-04T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-11609-UI-3 — Expose pool_config (pre-instantiation pool settings) and max_nesting_level (maximum sub-workflow nesting depth) as editable fields in the workflow create/edit UI, gated behind useSubWorkflowEnabled(). Primary target is AdvancedConfigTab.tsx — add a collapsible "Sub-workflow Pool" section following the existing max_concurrency/recursion_limit field pattern. The WorkflowPoolConfig type, WorkflowConfiguration.pool_config, and WorkflowConfiguration.max_nesting_level already exist from Story 1 (UI-1). The useSubWorkflowEnabled() hook is also already wired. WorkflowFormFields.tsx may also need these fields if the ticket owner confirms — but that confirmation is pending. Size: S.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx` — Primary change target. `forwardRef` component exposing `isDirty()` and `save()` via `useImperativeHandle`. Contains three existing collapsible sections: "Summarization Settings", "Performance Settings" (hosts `max_concurrency` and `recursion_limit`), and "Retry Policy". No `pool_config` or `max_nesting_level` fields exist yet. All fields use `FieldController` over react-hook-form `Controller`. Uses a module-level `const schema` (Yup) and a `getDefaultValues()` function with dual-fallback.
- `src/types/workflowEditor/configuration.ts` — Defines `WorkflowPoolConfig` (lines 247–252: `enabled: boolean`, `min_size?: number`, `max_size?: number`, `refill_interval_seconds?: number`) and `WorkflowConfiguration` (lines 289–290: `pool_config?: WorkflowPoolConfig`, `max_nesting_level?: number`). No changes needed.
- `src/types/entity/workflow.ts` — Top-level `Workflow` entity also already carries `pool_config?: WorkflowPoolConfig` and `max_nesting_level?: number`. No changes needed.
- `src/hooks/useFeatureFlags.ts` — `useSubWorkflowEnabled()` defined at line 116; returns `[isEnabled: boolean, isLoaded: boolean]`. Delegates to `useFeatureFlag(FEATURE_FLAGS.SUB_WORKFLOW)`. Already imported in other files; ready to consume in AdvancedConfigTab.
- `src/constants/featureFlags.ts` — `FEATURE_FLAGS.SUB_WORKFLOW = 'features:subWorkflow'`. Canonical constant; flag is server-managed, not build-time.
- `src/pages/workflows/editor/configPanels/components/ConfigAccordion.tsx` — Collapsible section wrapper over PrimeReact `Accordion`. Props: `title`, `expanded`, `onExpandedChange`, `defaultExpanded`, `headerActions`, `className`. Supports both controlled and uncontrolled expansion modes. This is the pattern to follow for the new "Sub-workflow Pool" section.
- `src/pages/workflows/editor/configPanels/components/FieldController.tsx` — Extends react-hook-form `Controller` with workflow issue integration. Used instead of bare `Controller` throughout AdvancedConfigTab.
- `src/pages/workflows/editor/configPanels/components/TabFooter.tsx` — Sticky Save/Cancel/Delete/Duplicate footer; shared across all config tabs.
- `src/pages/workflows/editor/ConfigPanel.tsx` — Orchestrator that renders `AdvancedConfigTab` via `renderAdvancedConfigTab()`. Maps `NodeTypes.SUB_WORKFLOW` to `SubWorkflowTab`. No changes expected here.
- `src/utils/workflowEditor/actions/config/updateAdvancedConfig.ts` — Generic key-level merge of `Partial<WorkflowConfiguration>` into existing config. Handles `pool_config` automatically via spread — no changes needed.
- `src/utils/helpers.ts` — `cleanObject` removes `null | undefined | '' | []` but preserves `false`. This means `pool_config.enabled: false` survives cleaning. However, a guard is needed to prune an all-null `pool_config` object (same treatment already applied to `retry_policy`).
- `src/pages/workflows/components/WorkflowFormFields.tsx` — Workflow create/edit modal form (name, YAML, project, guardrails). Does NOT currently include `pool_config` or `max_nesting_level`. Owner confirmation is pending before changes are made here.
- `src/pages/workflows/components/workflowSchema.ts` — Yup schema for `WorkflowFormFields`. No sub-workflow fields present. Only extend if owner confirms.
- `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx` — Node-level config panel for sub-workflow nodes; uses `ConfigAccordion`, `WorkflowSelector`, `InputMappingEditor`. Does not consume `pool_config` or `max_nesting_level` — correct, those are workflow-level settings.
- `src/utils/workflowEditor/serialization/types.ts` — `SerializedWorkflowConfig` already includes `pool_config` and `max_nesting_level`. Serialization layer requires no changes.

### Architecture and Layers Affected

- **Config-panel UI layer** (`AdvancedConfigTab.tsx`): The sole file requiring definite code changes. New accordion section, expanded state, Yup schema extension, `getDefaultValues` extension, `activeIssueAccordion` mapping, and `cleanFormValues` guard.
- **Schema layer** (inline `const schema` inside `AdvancedConfigTab.tsx`): Extend with `pool_config: yup.object().shape({...}).optional()` following the `retry_policy` precedent, and `max_nesting_level: yup.number().nullable().optional().transform(transformToInteger).positive().integer()`.
- **Feature-flag layer** (`useSubWorkflowEnabled()` → `appInfoStore`): Already wired. Consumed with destructuring: `const [isSubWorkflowEnabled] = useSubWorkflowEnabled()`. Optionally also destructure `isLoaded` to avoid flash-of-hidden-content.
- **Type layer**: Already complete. No changes to `WorkflowPoolConfig`, `WorkflowConfiguration`, or `Workflow` entity types.
- **Action layer** (`updateAdvancedConfig`): No changes needed — generic merge handles nested objects.
- **WorkflowFormFields / workflowSchema** (conditional): Only touch if ticket owner confirms. Isolated from the AdvancedConfigTab path.

### Integration Points

- `ConfigPanel.tsx` → `AdvancedConfigTab.tsx`: passes `config: WorkflowConfiguration` (post-save yaml_config) and `workflow: Workflow` (pre-save backend entity). `getDefaultValues` must maintain the dual-fallback: `config.pool_config ?? workflow?.pool_config`.
- `appInfoStore` → `useFeatureFlag` → `useSubWorkflowEnabled()`: server-managed flag; fetched once at app startup from `v1/config` API. `isLoaded` from the hook guards rendering until the API call completes.
- `updateAdvancedConfig` → `onConfigChange` callback: the action merge is generic; new `pool_config` and `max_nesting_level` keys flow through without any action-layer changes.
- `cleanObject` in `cleanFormValues`: preserves `false` (safe for `pool_config.enabled: false`), but an explicit guard must prune the `pool_config` key when all its numeric sub-fields are null and `enabled` is also null/undefined.

### Patterns and Conventions

- **ConfigAccordion for each logical grouping**: each section in AdvancedConfigTab is a `ConfigAccordion` with its own `useState` bool for expanded state.
- **FieldController instead of Controller**: all inputs in AdvancedConfigTab use `FieldController` to participate in the workflow issue highlighting system.
- **Yup nested object shape**: `retry_policy` (lines 80–121 of the schema) is the direct precedent for `pool_config`'s nested Yup shape.
- **Horizontal orientation for numeric fields**: `max_concurrency` and `recursion_limit` use `orientation="horizontal"` with `inputClass="w-12"` — use the same layout for `min_size`, `max_size`, `refill_interval_seconds`, and `max_nesting_level`.
- **Switch for boolean fields**: `pool_config.enabled` should render as a `Switch` component (same approach used for boolean toggles elsewhere in config panels).
- **activeIssueAccordion mapping**: a `useMemo` maps active workflow issue paths (e.g. `pool_config.min_size`) to accordion keys so the relevant section auto-expands when an issue is present. New `pool_config.*` and `max_nesting_level` paths must be added to this mapping.
- **transformToInteger transform**: Yup `.transform(transformToInteger)` converts empty-string number inputs to `null`. Apply to all numeric pool fields.
- **getDefaultValues dual-fallback**: `config?.field ?? workflow?.field ?? undefined`. New fields must follow this exact pattern.
- **Feature-flag conditional render**: `{isSubWorkflowEnabled && <ConfigAccordion ...>...</ConfigAccordion>}`. Pattern already established in `Sidebar.tsx`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/patterns/form-patterns.md` — Primary governance for React Hook Form + Yup conventions, `FieldController` pattern, schema-in-`formSchema.ts` rule (note: AdvancedConfigTab keeps its schema inline — trust source over guide), and accessibility requirements.
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/development/workflow-editor-patterns.md` — Secondary: thin-component rule (logic to `utils/`), ConfigAccordion usage. Note: guide documents a slightly different path convention (`src/utils/workflowEditor/`) than the actual code (`src/pages/workflows/editor/`); trust the source code, not the guide.
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/architecture/architecture.md` — Cross-cutting: Valtio store pattern, `useSnapshot` for reads, feature-flag hook conventions, Tailwind-only styling, DO/DON'T boundary table.
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/quality-gates.md` — Gate commands: `npm run lint`, `npm run typecheck`, `npm run test:unit`. All must pass before MR.

### Architectural Decisions

- D1 (UI-1): `WorkflowPoolConfig` and `WorkflowConfiguration.pool_config` / `.max_nesting_level` were added in Story 1. Both are fully typed and present in `configuration.ts` (lines 247–290) and `workflow.ts` (lines 46–47). No type-layer work remains for UI-3.
- D2: `useSubWorkflowEnabled()` at `src/hooks/useFeatureFlags.ts:116` is the sole gate for all sub-workflow UI additions. It is the established pattern.
- D3: `AdvancedConfigTab` is the canonical location for workflow-level numeric configuration fields. New fields belong here, not in `WorkflowFormFields.tsx` unless owner confirms.
- D4: "Performance Settings" accordion (horizontal `Input` fields, `w-12` width, integer transforms) is the exact layout pattern to replicate for the new section.
- D5: Serialization layer (`SerializedWorkflowConfig`) already includes `pool_config` and `max_nesting_level` — confirmed by `serializer.test.ts` round-trip test at line 247.
- D6: Prior task directory `docs/superpowers/tasks/2026-07-31-epmcdme-11609-ui2-sub-workflow-visual/` contains `spec.md` and `technical-analysis.md` documenting all Story-2 decisions; they confirm the Story-1 type additions are the foundation for this task.

### Derived Conventions

- New accordion key for issue-tracking should be `'poolConfig'` (following camelCase accordion key pattern seen for `'performance'`, `'retry'`).
- `pool_config.enabled` toggle should be placed first in the section, followed by the numeric inputs, following the general "toggle then detail" layout observed in Retry Policy.
- `isLoaded` from `useSubWorkflowEnabled()` should be used to suppress the section until the feature flag API response arrives, preventing flash-of-hidden-content.
- Do not add pool fields to `workflowSchema.ts` or `WorkflowFormFields.tsx` until ticket owner confirms — the task explicitly marks this as pending.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/editor/__tests__/Sidebar.test.tsx` — Tests `useSubWorkflowEnabled` gating: renders/hides sub-workflow node when flag is on/off. Direct precedent for how to test the new section's conditional render.
- `src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` — Tests `ConfigPanel` imperative ref contract; mocks `AdvancedConfigTab` as a stub. Does NOT test AdvancedConfigTab internals.
- `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx` — Tests `SubWorkflowTab` render, save shape, isDirty, and child component presence.
- `src/utils/workflowEditor/serialization/__tests__/serializer.test.ts` — One round-trip test case for `pool_config` + `max_nesting_level` at line 247. Confirms serialization is covered.
- `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — Tests `WorkflowFormFields` share/disable behavior; no pool_config coverage.
- `src/pages/workflows/components/__tests__/WorkflowForm.test.tsx` — Tests `replaceYamlConfig` ref method; no pool_config coverage.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two projects: `unit` (jsdom, mocked Valtio) and `integration` (custom env, real Valtio + mocked API).
- **Libraries**: `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3.
- **Module-level store mocking via `vi.hoisted`**: `vi.hoisted(() => { mockStore = {...} })` then `vi.mock('@/store/...')`.
- **Forwarded-ref stubs**: complex child components replaced with `forwardRef` + `useImperativeHandle` returning `{ isDirty, save, validate, getValues }`.
- **Inline typed fixtures**: `const mockConfig: WorkflowConfiguration = { states: [...] }` at module scope.
- **`defaultProps` + partial override pattern**: `const defaultProps = {...}; render(<Component {...defaultProps} {...overrides} />)`.
- **Imperative ref testing**: `createRef<TabRef>()` to exercise `save()`, `isDirty()`, `getValues()` contracts.
- **ConfigAccordion transparent mock**: `vi.mock('../components/ConfigAccordion', () => ({ default: ({ children }) => <div>{children}</div> }))` to make nested fields accessible.
- **Feature-flag mock per test**: `vi.mocked(useSubWorkflowEnabled).mockReturnValue([true, true])` — pattern from Sidebar.test.tsx.

### Coverage Gaps

- `AdvancedConfigTab` has **no test file** — no coverage for `isDirty`/`save` imperatives, Yup validation, `getDefaultValues` dual-fallback logic, or accordion auto-expand for issues.
- No test exists for the new "Sub-workflow Pool" section's conditional render based on `useSubWorkflowEnabled()`.
- No UI-level test for `pool_config` field interactions (`enabled` toggle, numeric inputs for `min_size`, `max_size`, `refill_interval_seconds`) or `max_nesting_level` input.
- `useSubWorkflowEnabled()` hook itself has no dedicated unit test (only mocked as a dependency in Sidebar.test.tsx).
- `cleanFormValues` pool_config guard (prune empty `pool_config` object) has no test coverage.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — base path for all API calls (default `/api`); unrelated to this task.
- `VITE_ENV` — environment name (`local`, `staging`, etc.); unrelated.
- No sub-workflow-specific environment variables exist or are needed for this task.

### Configuration Files

- `src/constants/featureFlags.ts` — Canonical registry of feature flag IDs; `SUB_WORKFLOW = 'features:subWorkflow'` already present.
- `src/hooks/useFeatureFlags.ts` — All `useXxxEnabled()` hooks; `useSubWorkflowEnabled()` at line 116.
- `src/store/appInfo.ts` — Valtio store; fetches `v1/config` from backend API and populates `configs[]`. Feature flag state lives here.
- `config.js` — Runtime `window._env_` bootstrap; overridden in production by Helm ConfigMap at `deploy-templates/templates/configmap.yaml`. No sub-workflow entries needed here.

### Feature Flags and Deployment Concerns

- `features:subWorkflow` (`FEATURE_FLAGS.SUB_WORKFLOW`) — Server-managed flag. Sourced entirely from the backend `v1/config` API response at runtime. Must be enabled in the backend config store for new fields to appear. No frontend config or deploy changes are needed to activate the flag.
- `useSubWorkflowEnabled()` returns `[isEnabled, isLoaded]`. The `isLoaded` boolean tracks whether the API call has completed. The new section should check `isLoaded` (or gate on both `isEnabled && isLoaded`) to avoid a flash-of-hidden-content when the app is initializing.
- No Helm chart, `config.js`, or `.env` changes are required for this task.

---

## 6. Risk Indicators

- **No existing test coverage for `AdvancedConfigTab`** — the component has no test file. Adding a new gated section increases the untested surface area. The imperative ref contract (`isDirty`, `save`) and feature-flag conditional render are not tested.
- **`cleanFormValues` pool_config guard** — `cleanObject` preserves `false`, so `pool_config.enabled: false` is safe. However, a new guard is needed to prune the `pool_config` key when all its numeric sub-fields are null and `enabled` is also null/undefined (same treatment as `retry_policy`). If omitted, the save payload will contain a sparse `pool_config: { enabled: null, ... }` object.
- **isLoaded check not yet in pattern for AdvancedConfigTab** — the existing three sections do not gated behind feature flags. The `isLoaded` tuple from `useSubWorkflowEnabled()` must be checked; omitting it will cause the section to flash visible (or hidden) before the API response arrives.
- **WorkflowFormFields.tsx scope is unresolved** — the task explicitly defers adding pool fields to `WorkflowFormFields.tsx` pending owner confirmation. If that confirmation arrives mid-implementation, it adds a second schema (`workflowSchema.ts`) and a second form component to the change surface.
- **Guide/source path mismatch** — `.ai-run/guides/development/workflow-editor-patterns.md` documents a `src/utils/workflowEditor/` path convention that does not match the actual code at `src/pages/workflows/editor/`. Trust source code; do not reorganize files to match the guide during this task.
- **`activeIssueAccordion` mapping must be extended** — missing entries cause related workflow validation issues to not auto-expand the correct accordion. `pool_config.*` and `max_nesting_level` paths must be explicitly mapped to the new accordion key. Omitting this is a subtle UX bug with no compile-time error.
- **No codegraph indexing** — codegraph MCP tool was unavailable; all research performed via filesystem. Symbol cross-references are based on grepped imports only, not a full call graph.

---

## 7. Summary for Complexity Assessment

This task touches a narrow slice of the UI layer: the primary change file is `AdvancedConfigTab.tsx` (one file, approximately 40–60 lines of new code covering a new accordion state, a Yup schema extension, `getDefaultValues` additions, `activeIssueAccordion` mapping updates, and the gated JSX block). All prerequisite infrastructure — the `WorkflowPoolConfig` type, `WorkflowConfiguration.pool_config` and `.max_nesting_level` fields, `useSubWorkflowEnabled()` hook, `ConfigAccordion` component, `FieldController`, and the `updateAdvancedConfig` action merge — was delivered in prior UI-1/UI-2 stories. The implementation pattern is fully established by the "Performance Settings" accordion block: identical layout, identical Yup integer transform, identical dual-fallback `getDefaultValues` logic. The `retry_policy` Yup shape provides the nested-object schema precedent for `pool_config`. No new dependencies, no new store methods, and no routing or API changes are required.

The technical novelty is low but there is one non-trivial detail: the `cleanFormValues` guard for `pool_config` must correctly distinguish between a user-cleared object (prune it) and a user-set `enabled: false` with null numeric fields (preserve `enabled: false`, strip nulls). This mirrors the existing `retry_policy` guard logic but requires explicit attention because `cleanObject` preserves `false` while `null` is stripped. The second open question — whether `WorkflowFormFields.tsx` also needs these fields — is deferred by the task itself and does not block the primary delivery.

Test coverage posture is a risk factor disproportionate to the small code surface. `AdvancedConfigTab` has zero test coverage today. While the task does not explicitly require new tests, the complexity assessor should note that the component's `isDirty`/`save` contract and the feature-flag conditional render for the new section are both untested. The `isLoaded` flash-of-content guard and the `activeIssueAccordion` mapping extension are behavioral requirements that carry no compile-time safety net. Overall complexity aligns with the S sizing stated in the ticket, with the caveat that the `cleanFormValues` guard and the `isLoaded` check are precise correctness requirements that must not be overlooked.
