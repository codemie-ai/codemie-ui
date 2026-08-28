# Technical Research

**Task**: workflow editor sub-workflow node-type serialization feature-flag
**Generated**: 2026-07-31T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Implement UI for EPMCDME-11609 Sub-workflow Node Support. The backend has already been implemented. The UI needs to:

1. Add a new Sub-Workflow node type to the visual workflow editor (drag-and-drop canvas)
2. Add a configuration panel tab for Sub-Workflow nodes where users can select a target workflow from GET /v1/workflows/selectable and configure input_mapping
3. Add pool_config and max_nesting_level fields to the Workflow create/edit form
4. Add the SUB_WORKFLOW feature flag to featureFlags constants
5. Add API method getSelectableWorkflows to workflowsStore (calls GET /v1/workflows/selectable?exclude_id=<id>&per_page=100)
6. Handle serialization/deserialization of workflow_id states in the YAML editor
7. Wire the sub-workflow node into the existing node type system (NodeTypes enum, sidebar templates, configPanel dispatch, serializer, deserializer, WorkflowEditor)

Backend API surface created:
- GET /v1/workflows/selectable?exclude_id=<uuid>&page=0&per_page=100 → WorkflowListResponse (id, name, project, mode, shared, description, icon_url)
- Workflow model now has pool_config (JSONB: {enabled, min_size, max_size, refill_interval_seconds}) and max_nesting_level (integer)
- Feature flag: features.subWorkflow.enabled

Working directory: /home/user/projects/codemie/codemie-ui
Run dir: /home/user/projects/codemie/codemie-ui/docs/superpowers/tasks/2026-07-31-epmcdme-11609-sub-workflow-node-ui

---

## 2. Codebase Findings

### Existing Implementations

**Node type system (entry points):**
- `/home/user/projects/codemie/codemie-ui/src/types/workflowEditor/base.ts` — `NodeTypes` const-object (not enum; values are lowercase strings like `'assistant'`, `'tool'`, `'iterator'`), `MetaNodeTypes` array, `NodeTemplate` interface, and `nodeTemplates` array that drives the sidebar drag palette
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/nodes/index.tsx` — `nodeTypeComponents` map passed as `nodeTypes` prop to ReactFlow; add `[NodeTypes.SUB_WORKFLOW]: SubWorkflowNode` here
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/ConfigPanel.tsx` — `nodeConfigPanels` map dispatches `NodeTypes.X → XTab`; add `[NodeTypes.SUB_WORKFLOW]: SubWorkflowTab` here
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/Sidebar.tsx` — reads `nodeTemplates` filtered by `NodeTemplateCategory`; automatically picks up new templates added to `base.ts`

**Node component patterns (copy for SubWorkflowNode):**
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/nodes/AssistantNode.tsx` — canonical node component: `BaseNode` wrapper + `Handle` (left target, right source) + `NodeHeader`
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/nodes/ToolNode.tsx` — second reference (same pattern, no extra state)

**Config panel patterns (copy for SubWorkflowTab):**
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/configPanels/AssistantTab.tsx` — canonical config tab: `forwardRef`, `useImperativeHandle` exposing `{ isDirty, save }`, `useForm`/`yupResolver`, `CommonStateFields`, `TabFooter`, `registerFields(paths, nodeType)` call at module level
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/configPanels/ToolTab.tsx` — second pattern reference

**Serialization layer:**
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/serialization/types.ts` — `SerializedState` (YAML-level state shape) and `SerializedWorkflowConfig`; add `workflow_id?: string` and `input_mapping?: Record<string, string>` to `SerializedState`; add `pool_config` and `max_nesting_level` to `SerializedWorkflowConfig`
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/serialization/serializer.ts` — spreads all top-level fields via `...rest`; actor nodes (non-meta) pass through `processConnectedState`; `_meta` is stripped before output; sub-workflow fields should propagate automatically but must be verified
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/serialization/deserializer/deserializer.ts` — `inferNodeType()` inspects serialized-state fields to determine visual node type; must add: `if (state.workflow_id) return NodeTypes.SUB_WORKFLOW`; `pool_config`/`max_nesting_level` flow through `...rest` at top-level automatically

**State creation and type system:**
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/actions/states/createState.ts` — `buildState()` switch per `NodeType`; add `NodeTypes.SUB_WORKFLOW` case with initial shape `{ id, workflow_id: '', input_mapping: {}, next: {}, _meta: { position, type, is_connected: false, selected: true } }`
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/constants.ts` — `ACTOR_FIELD_MAP`, `NODE_TYPE_TO_CONFIG_ARRAY`, `ISSUE_FIELD_MAP`; all three must gain a `sub_workflow` / `NodeTypes.SUB_WORKFLOW` entry
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/helpers/states/stateTypeCheckers.ts` — `isExecutionState()` lists ASSISTANT/TOOL/CUSTOM/TRANSFORM; add `NodeTypes.SUB_WORKFLOW` here so it is treated as an execution state

**Type definitions:**
- `/home/user/projects/codemie/codemie-ui/src/types/workflowEditor/configuration.ts` — all state config interfaces and `WorkflowConfiguration`; add `SubWorkflowStateConfiguration` interface with `workflow_id: string` and `input_mapping: Record<string, string>` fields; add to `StateConfiguration` union; add `pool_config` and `max_nesting_level` to `WorkflowConfiguration`
- `/home/user/projects/codemie/codemie-ui/src/types/entity/workflow.ts` — `Workflow` entity type; adding typed fields for `pool_config` / `max_nesting_level` is preferred over relying on the `[key: string]: any` catch-all

**Store:**
- `/home/user/projects/codemie/codemie-ui/src/store/workflows.ts` — Valtio `proxy<WorkflowsStore>`; add to interface: `getSelectableWorkflows: (excludeId: string) => Promise<Workflow[]>`; implement following `getWorkflowOptions` pattern: `api.get('v1/workflows/selectable?exclude_id=' + excludeId + '&per_page=100').then(r => r.json()).then(r => r.data ?? r)`

**Workflow form:**
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/components/workflowSchema.ts` — `WorkflowFormValues` interface and `baseWorkflowSchema` Yup object; add `pool_config` (object with `enabled`, `min_size`, `max_size`, `refill_interval_seconds`) and `max_nesting_level` (number) fields
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/components/WorkflowFormFields.tsx` — renders form fields; add input fields for new schema entries
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx` — alternative location for `pool_config`/`max_nesting_level` if treated as advanced workflow settings; mirrors existing `max_concurrency`/`recursion_limit` pattern

**Feature flags:**
- `/home/user/projects/codemie/codemie-ui/src/constants/featureFlags.ts` — `FEATURE_FLAGS` const object; add `SUB_WORKFLOW: 'features:subWorkflow'`
- `/home/user/projects/codemie/codemie-ui/src/hooks/useFeatureFlags.ts` — named hook wrappers; add `export const useSubWorkflowEnabled = () => useFeatureFlag(FEATURE_FLAGS.SUB_WORKFLOW)`
- `/home/user/projects/codemie/codemie-ui/src/utils/featureFlags.ts` — non-reactive utility functions; add `isSubWorkflowEnabled` if non-React usage is needed

**Visual field registry:**
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/utils/visualEditorFieldRegistry.ts` — `registerFields(paths, nodeType)` called at module init in each config tab; call `registerFields(['workflow_id'], NodeTypes.SUB_WORKFLOW, 'resource_validation')` in `SubWorkflowTab.tsx`

**Workflow selector component:**
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/components/WorkflowSelector.tsx` — pre-existing component for selecting a workflow; use inside `SubWorkflowTab` for the `workflow_id` field

### Architecture and Layers Affected

| Layer | Components Touched |
|---|---|
| Feature flags constants | `src/constants/featureFlags.ts`, `src/hooks/useFeatureFlags.ts` |
| Store | `src/store/workflows.ts` |
| Entity types | `src/types/workflowEditor/base.ts`, `src/types/workflowEditor/configuration.ts`, `src/types/entity/workflow.ts` |
| Serialization types | `src/utils/workflowEditor/serialization/types.ts` |
| Serialization | `src/utils/workflowEditor/serialization/serializer.ts`, `deserializer/deserializer.ts` |
| Action layer | `src/utils/workflowEditor/actions/states/createState.ts` |
| Helpers/checkers | `src/utils/workflowEditor/helpers/states/stateTypeCheckers.ts`, `src/utils/workflowEditor/constants.ts` |
| Node component (new) | `src/pages/workflows/editor/nodes/SubWorkflowNode.tsx`, `nodes/index.tsx` |
| Config panel (new) | `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx`, `ConfigPanel.tsx` |
| Field registry | `src/pages/workflows/editor/utils/visualEditorFieldRegistry.ts` |
| Workflow form | `src/pages/workflows/components/workflowSchema.ts`, `WorkflowFormFields.tsx` |

`WorkflowEditor.tsx` itself does not require direct changes — it wires via the `nodeTypeComponents` and `nodeConfigPanels` maps that are modified in `nodes/index.tsx` and `ConfigPanel.tsx`.

### Integration Points

**Internal dependencies:**
- `SubWorkflowTab` → `workflowsStore.getSelectableWorkflows` → `src/utils/api.ts` (HTTP client)
- `SubWorkflowTab` → `WorkflowSelector` component (pre-existing)
- `deserializer.ts` → `NodeTypes.SUB_WORKFLOW` (from `base.ts`)
- `SubWorkflowTab` → `visualEditorFieldRegistry.registerFields` (for issue validation)
- `SubWorkflowNode` → `BaseNode`, `NodeHeader` (shared node UI primitives)
- All config tabs → `CommonStateFields` (shared task/output schema/retry fields)

**External service:**
- `GET /v1/workflows/selectable?exclude_id=<uuid>&per_page=100` — new endpoint; returns `WorkflowListResponse` with `id, name, project, mode, shared, description, icon_url`

**Feature flag backend dependency:**
- The `features:subWorkflow` config entry must be emitted by the backend `/v1/configs` endpoint for `useSubWorkflowEnabled()` to return `true`; the UI flag alone is insufficient

### Patterns and Conventions

- `NodeTypes` is a `const` object (not a TypeScript enum); `NodeType` is the derived union `(typeof NodeTypes)[keyof typeof NodeTypes]`; new types are added as `KEY: 'snake_case_value'` entries
- All config panel tabs use `forwardRef` + `useImperativeHandle({ isDirty, save })`; validation uses `react-hook-form` + `yup` with schema in a separate `formSchema.ts` file (`yup.InferType` for the TS type)
- `registerFields([...paths], NodeTypes.X)` is called at module level (not inside render) in each config tab file to register issue-validation paths
- `nodeTemplates` entry uses `NodeTemplateCategory.ACTION` for actor/callable nodes; `NodeTemplateCategory.HIDDEN` removes it from the sidebar drag palette (for feature-flag gating)
- Sub-workflow is an actor node (not meta), so the serializer's actor-node path applies; `_meta` is stripped automatically
- All API calls live in the Valtio store proxy; no `fetch`/`axios` calls in components
- License header (Apache 2.0 copyright block) is required on every new `.ts`/`.tsx` file
- File size limits: components 300 lines, hooks 200 lines, utils/helpers 150-200 lines; sub-components over 30 lines must be extracted
- SVG icons follow naming `node-<type>.svg` in `src/assets/icons/`, imported as `?react` for inline SVG
- Code style: single quotes, no semicolons, `??` not `||`, `for...of` not `.forEach`, constants in `src/constants/`

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/development/workflow-editor-patterns.md` — PRIMARY guide: full architecture map, node/edge type table, serializer/deserializer contract, iterator nested-node pattern, `createState`/`updateState`/`deleteState` step-by-step walkthrough, viewport API, and testing strategy for the workflow editor
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/patterns/form-patterns.md` — required for config panel tab: RHF + Yup, `Controller` over `register`, schema in separate `formSchema.ts`, form reset on close, 300-line component limit
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/patterns/state-management.md` — Valtio store pattern: all API calls in store methods, `useSnapshot` in components, proxy-object shape
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/development/api-integration.md` — `import api from '@/utils/api'`, always `await response.json()`, never `response.data`, store-only API calls
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/architecture/architecture.md` — layer boundaries (page → store → API), feature flag pattern (`useFeatureFlag`), extension point checklist: types → constants → store → pages → routes → navigation → enterprise gate → tests
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/components/component-organization.md` — feature-private components go in `src/pages/workflows/editor/`; 300-line hard cap; `index.ts` re-export required; sub-components >30 lines extracted to own file
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/development/code-organization.md` — style rules: single quotes, no semicolons, `??` not `||`, `for...of` not `.forEach`
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/quality-gates.md` — must pass `lint → typecheck → test:unit → test:integration` before MR

### Architectural Decisions

- `MetaNodeTypes` array in `base.ts` controls which node types are structural (start, end, conditional, switch, iterator, note); actor/callable nodes are not in this array — sub-workflow should be an actor node (not added to `MetaNodeTypes`)
- `createState.ts` uses explicit per-type branches; every new node type requires its own branch with the correct initial state shape
- `registerFields([...], NodeTypes.X)` is called at module level (not inside render) so that issue-validation works at startup
- Feature flag gating for the sidebar: use `NodeTemplateCategory.HIDDEN` in the template entry and conditionally set it, or filter `nodeTemplates` in `Sidebar.tsx` — the guide's extension point checklist explicitly lists an "enterprise gate" step

### Derived Conventions

- Iterator node (`NodeTypes.ITERATOR: 'iterator'`) is the closest existing analog for sub-workflow (also an actor node with references to other resources); the iterator deserialization tests and YAML fixtures are the direct pattern to follow for sub-workflow deserialization tests
- `AdvancedConfigTab.tsx` is the established location for workflow-level scalar config fields (e.g. `max_concurrency`, `recursion_limit`); `pool_config` and `max_nesting_level` likely belong there rather than in `WorkflowFormFields.tsx`, but clarification from the ticket owner is advisable
- The `input_mapping` field is a `Record<string, string>` (key-value pairs); no existing UI component for a key-value editor has been identified — this is a novel UI requirement that needs design consideration

---

## 4. Testing Landscape

### Existing Coverage

- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/serialization/__tests__/serializer.test.ts` — `serialize()`: states, orphaned_states, meta-node exclusion; no sub-workflow state cases
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/serialization/deserializer/__tests__/deserializer.test.ts` — `deserialize()` for branching workflows using YAML fixtures; no sub-workflow fixture
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/serialization/deserializer/__tests__/iterators.test.ts` — iterator-specific deserialization; direct pattern to follow for sub-workflow
- `/home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/helpers/nodes/__tests__/nodeTypeCheckers.test.ts` — only `isIteratorNode` tested
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` — tab rendering/switching for all existing tabs; no SubWorkflowTab mock
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/nodes/__tests__/AssistantNode.test.tsx` — rendering and data wiring; pattern to follow for SubWorkflowNode
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/nodes/__tests__/ToolNode.test.tsx` — same pattern
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx` — YAML editor panel; no `workflow_id` serialization scenario
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — `share_with_project` toggle; no `pool_config`/`max_nesting_level` coverage
- `/home/user/projects/codemie/codemie-ui/src/utils/__tests__/featureFlags.test.ts` — tests other flags only; no `SUB_WORKFLOW`
- `/home/user/projects/codemie/codemie-ui/src/store/__tests__/workflows.generateWorkflow.test.ts` — `generateWorkflow` method only; no `getSelectableWorkflows`
- `/home/user/projects/codemie/codemie-ui/src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` — full edit-page integration (real stores, mocked fetch)

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two workspace projects (`unit`: jsdom + mocked Valtio/API; `integration`: real Valtio + fetch-intercepted API)
- **Libraries**: `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3
- **No MSW** — integration tests use a custom `requestRegistry`/`mockAPI` fetch intercept in `src/test-utils/integration.tsx`
- **Node component tests**: `createMockProps()` factory + wrap in `<ReactFlowProvider>` (see `AssistantNode.test.tsx`, `ToolNode.test.tsx`)
- **Deserializer tests**: YAML fixture files loaded via `readFileSync` from `serialization/deserializer/__tests__/fixtures/`; add `workflow-with-sub-workflow.yaml` as a new fixture
- **Page integration tests**: `renderPage(path)` helper renders full app at in-memory route
- **PrimeReact widget helpers**: `src/test-utils/component-interactions/` (`autocomplete.ts`, `select.ts`, `multi-select.ts`)

### Coverage Gaps

- `SubWorkflowNode` component — no test file under `editor/nodes/__tests__/`
- `SubWorkflowTab` config panel — no test file; `ConfigPanel.test.tsx` has no SubWorkflowTab mock
- `pool_config` and `max_nesting_level` fields in `WorkflowFormFields` or `AdvancedConfigTab`
- `SUB_WORKFLOW` entry in `FEATURE_FLAGS` constants — `featureFlags.test.ts` tests other flags only
- `isSubWorkflowEnabled()` utility function (if added)
- `workflowsStore.getSelectableWorkflows()` — no store test covers this method
- `workflow_id` state serialization round-trip in the YAML editor
- `workflow_id` deserialization in `deserializer.ts` — no YAML fixture with a sub-workflow state
- Sub-workflow type check helper (if added) — `nodeTypeCheckers.test.ts` only covers `isIteratorNode`
- Connection validation rules specific to sub-workflow nodes in `connectionValidator.test.ts`

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — Base URL for all API calls (default `/api`); resolved as `window._env_.VITE_API_URL || import.meta.env.VITE_API_URL` in `src/utils/api.ts`; no new env var required for this task
- `VITE_ENV` — Environment name (`local`, etc.)
- `VITE_APP_VERSION` — App version string injected at runtime

### Configuration Files

- `/home/user/projects/codemie/codemie-ui/config.js` — Runtime `window._env_` overrides (deployed environments); no change required for this task
- `/home/user/projects/codemie/codemie-ui/.env` — Local dev Vite env vars; no change required
- `/home/user/projects/codemie/codemie-ui/src/constants/featureFlags.ts` — Single source of truth for all feature flag string IDs; `SUB_WORKFLOW: 'features:subWorkflow'` must be added

### Feature Flags and Deployment Concerns

- **New flag to add**: `SUB_WORKFLOW: 'features:subWorkflow'` in `FEATURE_FLAGS`; string value follows `features:camelCase` convention used by all existing workflow/feature flags
- **Backend dependency**: The `features:subWorkflow` config entry must be emitted by the backend `/v1/configs` endpoint for `isConfigFetched` to resolve the flag to `true`; the UI constant alone does not activate the feature
- **Gating strategy**: The workflow-editor-patterns guide's extension checklist includes an explicit "enterprise gate" step; the sidebar template entry can use `NodeTemplateCategory.HIDDEN` combined with a conditional override, or the `Sidebar.tsx` filter can check `useSubWorkflowEnabled()` — the exact gate strategy is not specified in the task context and may need clarification
- No new environment variables or deployment manifests are required for this task

---

## 6. Risk Indicators

- **No test coverage for any new sub-workflow path**: `SubWorkflowNode`, `SubWorkflowTab`, `getSelectableWorkflows`, `workflow_id` serialization, `workflow_id` deserialization, `pool_config`/`max_nesting_level` form fields, `SUB_WORKFLOW` flag, and connection validation for sub-workflow nodes are all untested — each requires a new test file or fixture
- **`input_mapping` UI is a novel requirement**: `input_mapping` is a `Record<string, string>` (key-value map); no existing key-value editor component has been identified in the codebase; this may require building a new reusable widget and is the highest UX design risk in the task
- **`pool_config` form complexity**: `pool_config` is a JSONB object with 4 subfields (`enabled: boolean`, `min_size: number`, `max_size: number`, `refill_interval_seconds: number`); the Yup schema for a nested object with cross-field validation (`min_size <= max_size`) adds non-trivial form work
- **Large file change surface**: Minimum ~15 files modified plus 4-6 new files; the task touches all layers of the workflow editor stack simultaneously, increasing merge-conflict risk on an active branch
- **Placement ambiguity for pool_config/max_nesting_level**: Task context says "Workflow create/edit form" but `AdvancedConfigTab.tsx` (YAML editor panel) is the established location for scalar workflow-level config; if they belong in both places, deduplication logic is required
- **Feature flag gating strategy not fully specified**: It is unclear whether the sidebar entry, config panel tab, WorkflowFormFields fields, and store method should each be individually gated or if a single top-level flag controls all; inconsistent gating will cause partial-feature leakage
- **Serializer actor-path verification needed**: Although `...rest` spread in the serializer should pass `workflow_id`/`input_mapping` through automatically, this must be verified against `processConnectedState` internals — the iterator node (which has nested structure) had explicit serializer handling; sub-workflow may also need it
- **`WorkflowSelector` API compatibility unknown**: The pre-existing `WorkflowSelector` component needs to be verified for compatibility with the `SubWorkflowTab` form context (RHF `Controller` wrapping, `onChange` signature)
- **codegraph not available** — repo was not indexed; research relied entirely on filesystem traversal

---

## 7. Summary for Complexity Assessment

This task touches every layer of the workflow editor stack simultaneously: feature flag constants, the Valtio store, entity type definitions, serialization types, the serializer and deserializer, the state-action layer, node component rendering, config panel dispatch, the visual-field registry, and the workflow create/edit form. The minimum file change surface is approximately 15 modified files plus 4–6 new files (two new components, fixture YAML, and test files). The Iterator node is the closest structural analog and provides a proven step-by-step pattern for most of the wiring, but sub-workflow introduces two novel elements that Iterator does not cover: a `workflow_id` foreign-key selector (handled by the existing `WorkflowSelector` component) and an `input_mapping` key-value editor for which no UI widget currently exists.

The affected area is mixed in terms of test coverage. The serialization layer (serializer/deserializer), `ConfigPanel`, node components, `WorkflowFormFields`, and `featureFlags` utilities all have existing test infrastructure, but none of these tests cover any sub-workflow-specific path. All new sub-workflow code paths are effectively untested at the start of implementation: the deserializer's `inferNodeType` branch, the `createState` switch case, the `getSelectableWorkflows` store method, the `workflow_id` serialization round-trip, the config panel tab, the node component, and the feature flag constant all need new tests or new test fixtures. The YAML fixture pattern (used for iterator deserialization) is the model for adding sub-workflow deserialization coverage.

Key risk factors that should influence complexity scoring: (1) the `input_mapping` key-value editor is genuinely novel UI work with no existing component to clone; (2) the `pool_config` JSONB form with cross-field validation is non-trivial Yup schema work; (3) the feature flag gating strategy is underspecified and if implemented inconsistently will require a follow-up cleanup pass; and (4) the large cross-cutting change surface across 20+ files in parallel active code makes this a high integration-risk delivery even though each individual change follows a well-established pattern. Overall, the implementation pattern is clear and the guides are thorough, but the breadth of touch points and the two novel UI requirements push this beyond a simple copy-paste-and-wire task.
