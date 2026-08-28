# Technical Research

**Task**: workflow node connection validation edge handle
**Generated**: 2026-08-04T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Invalid connection: unknown node type - when user tries to connect sub-workflow node with existing nodes. maybe there is some input/output filtering for workflow nodes?

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/workflowEditor/helpers/connections/connectionValidator.ts` — sole source of connection validation; defines `NODE_VALIDATION_RULES`, `EXECUTION_NODES`, `checkConnectionRules()`, and `isValidConnection()`; contains the exact error string `'Invalid connection: unknown node type'`
- `src/types/workflowEditor/base.ts` — defines the `NodeTypes` const-object including `SUB_WORKFLOW: 'sub_workflow'`; also contains `nodeTemplates` where sub-workflow is categorized as `ACTION`; defines `isExecutionState()` which already includes `NodeTypes.SUB_WORKFLOW` (line 40)
- `src/pages/workflows/editor/nodes/index.tsx` — registers all node type → React component mappings in `nodeTypeComponents`; `NodeTypes.SUB_WORKFLOW → SubWorkflowNode` is present and correct
- `src/pages/workflows/editor/nodes/SubWorkflowNode.tsx` — the sub-workflow node React component; renders `Handle type="target"` on the left and `Handle type="source"` on the right, identical to other execution nodes (AssistantNode, ToolNode, CustomNode, TransformNode); handles are correctly defined
- `src/hooks/useWorkflowEditor.ts` — React hook that wires ReactFlow to the editor manager; `onConnect` callback calls `manager.validateConnection(source, target, showError=true)` which routes through `isValidConnection()`
- `src/utils/workflowEditor/actions/index.ts` — actions facade; `connections.validate` delegates directly to `isValidConnection`
- `src/pages/workflows/editor/WorkflowEditor.tsx` — top-level editor component; passes `nodeTypeComponents` as `nodeTypes` to ReactFlow and wires `onConnect`; does NOT pass ReactFlow's `isValidConnection` prop (so no drag-time visual feedback — validation only fires on drop)
- `src/hooks/useFeatureFlags.ts` — exports `useSubWorkflowEnabled()` hook (line 117) consuming the `SUB_WORKFLOW` feature flag (`features:subWorkflow`)
- `src/pages/workflows/editor/Sidebar.tsx` — gates sub-workflow node in the sidebar palette at line 80: `(t) => t.type !== NodeTypes.SUB_WORKFLOW || isSubWorkflowEnabled`
- `src/utils/workflowEditor/helpers/states/stateTypeCheckers.ts` — `isExecutionState()` at line 40 already includes `NodeTypes.SUB_WORKFLOW` (correctly wired in Story 1, but not carried through to the validator)

### Architecture and Layers Affected

1. **React component layer** — `WorkflowEditor.tsx` receives the ReactFlow `onConnect` event and dispatches to `editor.onConnect`
2. **Hook layer** — `useWorkflowEditor.ts` calls `manager.validateConnection()` before allowing the edge to be created
3. **Actions facade layer** — `actions/index.ts` wraps `isValidConnection` under `connections.validate`
4. **Validation logic layer** — `connectionValidator.ts` is the single authoritative validator; all real logic lives here
5. **Type / enum layer** — `base.ts` defines `NodeTypes` and `nodeTemplates`; node component registry lives in `nodes/index.tsx`

### Integration Points

- `connectionValidator.ts` is consumed by `useWorkflowEditor.ts` (via `manager.validateConnection`) and by the actions facade (`actions/index.ts`). Any change to its exports or rule shapes affects both call sites.
- `EXECUTION_NODES` in `connectionValidator.ts` is referenced by the `validTargets` field on the `START`, `CONDITIONAL`, and `SWITCH` node rules. Adding `SUB_WORKFLOW` to `EXECUTION_NODES` makes it a valid target from all three control-flow node types simultaneously.
- `NodeTypes` const-object in `base.ts` is the single source of truth for node type string values; the validator keys its rules map by these string values.
- Feature flag `features:subWorkflow` gates sidebar visibility only; it does not gate or bypass connection validation.

### Patterns and Conventions

- **Rule table pattern**: `NODE_VALIDATION_RULES` is a `Record<string, NodeValidationRule>` keyed by node type string. Missing keys produce the unknown-node-type error. Every connectable node type must have an entry.
- **EXECUTION_NODES list**: a separate readonly array drives `validTargets` for `START`, `CONDITIONAL`, and `SWITCH` nodes. It acts as a whitelist of execution nodes that can be downstream of control-flow nodes.
- **Centralized validation**: all connection validity flows through one function (`isValidConnection`) in one file. There is no distributed validation logic.
- **Error-only-on-commit**: `WorkflowEditor.tsx` does not wire ReactFlow's `isValidConnection` prop, so no drag-time ghost feedback is shown. Validation fires in `onConnect` after the drop.
- **Handle symmetry**: all execution nodes use `Handle type="target"` (left) and `Handle type="source"` (right) with no conditional filtering. `SubWorkflowNode.tsx` follows this pattern correctly.
- **`NodeTypes` is a const-object, not a TypeScript enum.** Values are lowercase snake_case strings (e.g., `'sub_workflow'`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/development/workflow-editor-patterns.md` — primary guide for this domain; documents the `connectionValidator.ts` location, the `NODE_VALIDATION_RULES` record, `checkConnectionRules` logic, and the `EXECUTION_NODES` array; also documents node type registration, serializer/deserializer contracts, and iterator nested-node patterns
- `.ai-run/guides/architecture/architecture.md` — layer boundary rules; relevant constraint: no API calls in components, all state mutations through Valtio store methods

### Architectural Decisions

- `NodeTypes` is a const-object with lowercase snake_case values, not a TypeScript enum. Recorded in UI-1 spec §4.
- `SUB_WORKFLOW` is an actor node, not a meta node. It was intentionally excluded from `MetaNodeTypes`. Recorded in UI-1 spec §4.
- `ACTOR_FIELD_MAP` and `NODE_TYPE_TO_CONFIG_ARRAY` have no `sub_workflow` entry by design — sub-workflow references an external workflow entity, not an embedded config array. Recorded in UI-1 spec §2.
- Feature-flag gating is done at render time in `Sidebar.tsx`, not by hiding the node template. `NodeTemplateCategory` was changed from `HIDDEN` (Story 1) to `ACTION` (Story 2, D2). Recorded in UI-2 spec §D2-D3.
- `isExecutionState()` in `stateTypeCheckers.ts` already includes `NodeTypes.SUB_WORKFLOW`. This was wired in Story 1 but the same addition was not made to `connectionValidator.ts`.
- `NodeTypes.ITERATOR` and `NodeTypes.NOTE` are also absent from `NODE_VALIDATION_RULES` intentionally — iterator children are not top-level connectable, and note nodes are decorative. Sub-workflow should follow the execution-node pattern (`ASSISTANT`, `TOOL`, `CUSTOM`, `TRANSFORM`), not the iterator/note pattern.

### Derived Conventions

- Two structures in `connectionValidator.ts` must be kept in sync whenever a new connectable node type is added: `EXECUTION_NODES` and `NODE_VALIDATION_RULES`.
- The `NodeValidationRule` shape for execution nodes is `{ displayName: string, canBeSource: true, canBeTarget: true }` (no `validTargets` restriction).
- The guide `.ai-run/guides/development/workflow-editor-patterns.md` is the reference for this pattern.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/workflowEditor/helpers/connections/__tests__/connectionValidator.test.ts` — covers `isValidConnection` for START, END, ASSISTANT, TOOL, CUSTOM, CONDITIONAL, SWITCH, ITERATOR nodes; circular connection checks; all error messages. Contains zero test cases involving `NodeTypes.SUB_WORKFLOW`.
- `src/utils/workflowEditor/actions/connections/__tests__/createConnection.test.ts` — covers `createConnectionAction` for direct connections, START node wiring, conditional/switch handle routing, connectivity propagation. No `SUB_WORKFLOW` node states.
- `src/utils/workflowEditor/actions/connections/__tests__/deleteConnection.test.ts` — covers `deleteConnectionAction` for all removal scenarios. No `SUB_WORKFLOW` states.
- `src/pages/workflows/editor/nodes/__tests__/SubWorkflowNode.test.tsx` — covers rendering (title display, `findState` invocation, connected/disconnected indicator). Does NOT test handle presence, `isConnectable` propagation, or connection behavior.
- `src/pages/workflows/editor/__tests__/Sidebar.test.tsx` — covers feature-flag gating of the sub-workflow palette entry. Not connection logic.

### Testing Framework and Patterns

- **Framework**: Vitest (workspace config at `vitest.workspace.ts`). Two projects: `unit` (jsdom + mocked Valtio) and `integration` (custom env + real stores). Test API uses `describe/it/expect/vi`.
- `vi.mock(module, factory)` at module level for external deps (`@xyflow/react`, `@/utils/toaster`)
- `vi.fn()` for callbacks; `beforeEach(() => vi.clearAllMocks())` resets state between tests
- Inline fixture construction (plain object literals in `beforeEach`) — no shared factory helpers for `WorkflowNode` / `WorkflowConfiguration`
- `createMockProps` local helper pattern (in `SubWorkflowNode.test.tsx`) accepting `Partial<CommonNodeProps>` overrides
- `render` + `screen` from `@testing-library/react`; `ReactFlowProvider` wrapper for ReactFlow components
- `structuredClone` used in action tests to verify immutability

### Coverage Gaps

1. `connectionValidator.test.ts` — zero test cases for `NodeTypes.SUB_WORKFLOW` as source or target in `isValidConnection`. Needed: `sub_workflow → assistant`, `assistant → sub_workflow`, `start → sub_workflow`, `sub_workflow → end`, `sub_workflow → sub_workflow`, conditional/switch → sub_workflow.
2. `createConnection.test.ts` — no tests with `sub_workflow`-typed state as source or target.
3. `deleteConnection.test.ts` — no tests covering removal of edges to/from a `sub_workflow` node.
4. `SubWorkflowNode.test.tsx` — no tests verifying that target and source handles are rendered, or that `isConnectable` propagates correctly from props.
5. `checkSourceIterKeyConstraint` / `checkTargetIteratorConstraint` — no tests for iterator interaction when the involved node is a sub-workflow type.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — base URL for all backend API calls (default `/api`)
- `VITE_ENV` — runtime environment label (`local`, `dev`, `prod`, etc.)
- `VITE_APP_VERSION` — displayed app version string

No environment variables specific to workflow connection validation or sub-workflow feature.

### Configuration Files

- `config.js` — runtime environment injection via `window._env_`; governs `VITE_API_URL`, `VITE_ENV`, `VITE_APP_VERSION` at deploy time
- `.env` — local-dev Vite env file; defines API URL, assistant slugs, and Keycloak credentials (localhost only)
- `src/constants/featureFlags.ts` — defines all feature flag constants including `SUB_WORKFLOW = 'features:subWorkflow'`

### Feature Flags and Deployment Concerns

- `SUB_WORKFLOW` flag (`features:subWorkflow`) — consumed via `useSubWorkflowEnabled()` hook at `src/hooks/useFeatureFlags.ts` line 117. Controls visibility of the sub-workflow node in `Sidebar.tsx` line 80 only. Does not control connection validation.
- All other feature flags (`WORKFLOW_AI`, `ENTERPRISE_EDITION`, etc.) are not relevant to this bug.
- No deployment manifests or Docker files reference workflow connection logic.

---

## 6. Risk Indicators

- **Root cause — `NodeTypes.SUB_WORKFLOW` absent from `NODE_VALIDATION_RULES`** in `connectionValidator.ts` (lines 85–129). Connecting any node to or from a sub-workflow node returns `ERROR_MSGS.UNKNOWN_NODE_TYPE` unconditionally. This is a structural omission, not a logic error.
- **Root cause — `NodeTypes.SUB_WORKFLOW` absent from `EXECUTION_NODES`** in `connectionValidator.ts` (lines 70–75). Even after adding the validation rule, `START`, `CONDITIONAL`, and `SWITCH` nodes would still be unable to connect to sub-workflow nodes because those rules use `validTargets: EXECUTION_NODES` as a whitelist.
- **Partial implementation inconsistency**: `isExecutionState()` in `stateTypeCheckers.ts` (line 40) already includes `NodeTypes.SUB_WORKFLOW`, but `connectionValidator.ts` does not. Story 1 wired sub-workflow into the type system, serialization, and state checkers, but `connectionValidator.ts` was overlooked.
- **No test coverage for sub-workflow connection validation**: `connectionValidator.test.ts` has zero sub-workflow test cases. The gap was not caught by tests during development.
- **No drag-time visual feedback**: `WorkflowEditor.tsx` does not pass ReactFlow's `isValidConnection` prop, so invalid connections are only rejected after the user completes the drag. This applies to all node types, not just sub-workflow, but it means users get no visual cue that a connection is invalid until they release the mouse.
- **Fix surface is minimal (2 lines in 1 file)**: the validator file is well-structured; the additions follow an established pattern. Low risk of regression if the fix mirrors the `ASSISTANT`/`TOOL`/`CUSTOM`/`TRANSFORM` entries exactly.
- **Test extension required**: the `connectionValidator.test.ts` fixture setup (node type arrays and config objects) must be extended with `sub_workflow` entries. Existing test patterns are consistent and easy to replicate.

---

## 7. Summary for Complexity Assessment

The bug has a precisely located, minimal root cause: `NodeTypes.SUB_WORKFLOW` (`'sub_workflow'`) is absent from two data structures in a single file — `EXECUTION_NODES` (a readonly array, ~line 70) and `NODE_VALIDATION_RULES` (a record, ~lines 85–129) — both in `src/utils/workflowEditor/helpers/connections/connectionValidator.ts`. When `checkConnectionRules()` is called with a sub-workflow source or target, `NODE_VALIDATION_RULES['sub_workflow']` is `undefined`, triggering the `!sourceRule || !targetRule` guard that returns `'Invalid connection: unknown node type'`. The fix requires two additions to that one file, mirroring the existing pattern used by `ASSISTANT`, `TOOL`, `CUSTOM`, and `TRANSFORM`. No other files in the validation stack need changes. The sub-workflow node's React component (`SubWorkflowNode.tsx`) already has correctly defined handles; `nodeTypeComponents` in `nodes/index.tsx` already registers the component; and `isExecutionState()` in `stateTypeCheckers.ts` already includes `NodeTypes.SUB_WORKFLOW`. The validator is the only gap.

The change surface is very small: 2 additions in `connectionValidator.ts`, plus test extensions in `connectionValidator.test.ts` (and optionally `createConnection.test.ts` and `deleteConnection.test.ts`). The architectural layer touched is the validation logic layer only — no API layer, no Valtio store mutations, no serializer changes, no handle or component changes. The pattern to follow is established and documented in `.ai-run/guides/development/workflow-editor-patterns.md`. Technical novelty is near zero; this is a missing-entry bug against a well-understood rule-table pattern.

Test coverage for this specific path is a gap — `connectionValidator.test.ts` covers all existing node types but has no sub-workflow cases. Test extension should be included in the fix to prevent future regression. The `SubWorkflowNode.test.tsx` could also be extended to assert handle rendering, though this is lower priority. Overall complexity is low: one file to fix, one test file to extend, zero integration or deployment concerns.
