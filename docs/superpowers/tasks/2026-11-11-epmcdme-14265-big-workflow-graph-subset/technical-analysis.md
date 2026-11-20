# Technical Research

**Task**: workflow graph nodes edges (EPMCDME-14265)
**Generated**: 2026-11-11
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14265
Big workflow graph renders only a small subset of states despite correct YAML and API payload

Summary
A large Philips-related workflow is displayed on the Workflows page as a much smaller workflow graph. The YAML configuration is correct, and the /v1/workflows/{id}/ endpoint returns the expected/current payload, but the visual graph does not show all workflow states. The execution details panel shows more workflow steps than the graph displays.

Description
When a user opens a large workflow in the Workflows UI, the workflow graph should visually represent the complete workflow structure from the YAML/API payload. Currently, for at least one large Philips workflow, the graph canvas renders only a small subset of nodes and transitions, making the workflow appear much smaller than it actually is.

The provided example shows that the graph displays only several nodes, such as Start, Parse-request, Validate-request, Conditional, Fetch-full-issue, End, and Parse-jira-response. However, the execution steps list contains additional steps such as validate-full-issue, resolve-sme, and route-existing-ai-plan, indicating that the workflow has more states than the visual graph shows.

This creates confusion during workflow review, execution tracking, and debugging because users cannot rely on the visual representation to understand the actual workflow structure. The issue appears to be frontend-related because the YAML and backend payload are reported as correct.

Example affected workflow: https://codemie.lab.epam.com/workflows/ca93a1b3-dbd3-45e0-8723-cebd95e3f1ac

Preconditions: authenticated user; access to Workflows; a large workflow (~50 states) exists; YAML valid; /v1/workflows/{id}/ returns the correct payload.

Steps to Reproduce: open the workflow page; observe the graph; compare with YAML / API response; open execution details panel; compare execution steps list with number of graph nodes.

Expected Result: graph displays all states and transitions defined in the YAML/API payload. Large workflows (~50 states) are rendered completely and remain usable through zoom, pan, fit-to-screen, or fullscreen controls. Number of visible states consistent with YAML/API payload and execution details. No states hidden, truncated, collapsed incorrectly, or omitted.
Actual Result: graph renders as a small workflow with only a limited subset of states; YAML and API payload are correct; execution panel shows more steps than the graph.

Affected Areas: Workflows UI; Workflow graph/canvas rendering; Workflow details page; execution visibility; frontend mapping from workflow payload/YAML to graph nodes and edges.

Acceptance Criteria:
- Large workflows with ~50 states are rendered with all expected nodes and transitions.
- The graph uses the same complete workflow structure as returned by /v1/workflows/{id}/.
- Number of graph nodes matches number of states from YAML/API payload.
- Execution details steps and workflow graph remain consistent for the same workflow.
- Existing graph controls (zoom, pan, fit-to-screen, fullscreen) continue to work for large workflows.
- No regression for small/medium workflows.
- A frontend test or regression check is added for rendering a large workflow graph with many states.
- The affected Philips workflow is verified after the fix and displays all expected states.

Research focus: find the code that maps workflow YAML/payload to graph nodes/edges (parsing, layout, any filtering/dedup/truncation, state-id normalization e.g. case/hyphen/underscore collisions, handling of conditional/switch/iterator/transitions, unreachable or orphan states, fallback to execution states), where the graph is rendered, and existing tests. Identify hypotheses for why a subset renders (e.g. traversal that stops at conditional/parallel branches, id collisions overwriting nodes, edges with unknown target dropped, depth/limit caps).

---

## 2. Codebase Findings

Stack: React 19, Vite, Valtio, `@xyflow/react` 12.8.6, `dagre` 0.8.5, `js-yaml`; tests are vitest (`unit` and `integration` projects) with Testing Library.

### Existing Implementations

Purpose A: turn the workflow YAML into the graph nodes and edges shown on the Workflows details page.
- Pipeline: `createworkflowEditor(yaml)` in `src/utils/workflowEditor/index.ts:70` runs `deserialize` (`serialization/deserializer/deserializer.ts:294`), then `buildGraph` (`build/index.ts:20`: `buildNodes`, `buildEdges`, then `applyLayout` only when no node has a saved position).
- Details page: `WorkflowDetailsPage.tsx:84` calls `useWorkflowExecutionEditor` (`details/hooks/useWorkflowExecutionEditor.tsx:25`), which builds an editor from `workflow.yaml_config` and is used for `editor.config.states` only. `WorkflowExecutionEditor.tsx` renders `WorkflowEditor` (`pages/workflows/editor/WorkflowEditor.tsx`), which builds its own editor through `useWorkflowEditor(yamlConfig)` (`hooks/useWorkflowEditor.ts:78`). The canvas is `<ReactFlow nodes={wrappedNodes} edges={wrappedEdges}>` at `WorkflowEditor.tsx:679`. Nothing slices or filters the nodes. `onlyRenderVisibleElements` is not set. There are no node-count caps. Zoom limits are 0.1 to 1.2 windowed and 0.2 to 1.2 fullscreen (`:147`).
- Deserializer rules (`deserializer.ts:294-337`):
  - The entry state is `states[0]` of the YAML `states:` list (`findEntryState`, `helpers/connections/propagateConnectivity.ts:27`).
  - Reachability is a DFS over `findChildren` (`state_id`, `state_ids`, `condition.then/otherwise`, `switch.cases/default`; `helpers/states/stateRelations.ts:102`). It splits states into connected (`is_connected: true`) and orphan (`false`). The `orphaned_states:` section and `meta_states:` (positions, branch ids) are merged in.
  - Each state with `next.condition` or `next.switch` also gets a separate synthetic branch state, with id `meta_next_state_id` from the YAML or else `generateStateID` (`conditional_N` or `switch_N`, `helpers/states/idGenerators.ts:41`). Branch states are pushed straight after their parent (`processStates`, `:159`).
  - `addIteratorStates` (`iterators.ts:68`) adds `iterator_N` states. `deorphanReferencedStates` (`:265`) later flips any state reachable from a connected state to connected.
  - `fixForbiddenStateIDs` (`:121`) renames a state whose id is `start` or `end` (any case) to `<id>_state`. References to the old id are not rewritten.
- Node build rules (`build/nodes/buildNodes.ts:292`):
  - `buildNodes` first adds `start`. It then splits `config.states` into `connected` (all `is_connected`) and `orphaned` (`!is_connected` and not an iterator) (`categorizeStates`, `:75`).
  - Only the `connected` set goes through `buildStateNodes` (`:225`). That is a recursive walk from ONE entry state (`findConnectedEntryState` = first connected non-meta state, `propagateConnectivity.ts:35`) and it pushes only the nodes it visits.
  - Orphans are all pushed. Orphan iterators are pushed by `buildOrphanedIterators` (`:276`). `end` is added last if missing.
  - A connected state that the walk does not reach is not pushed anywhere. The `connected` list is not used outside the walk.
  - Walk-specific rules (`buildNodeRecursively`, `:181`):
    - A state with `condition` follows only `then`/`otherwise` (`buildConditionNode`, `:123`). The branch node is found with `findMetaState` (`:42`, `config.states.find(id === meta_next_state_id)`). If the branch node is missing, the function returns silently and the children are not walked.
    - `switch` follows `cases`/`default`.
    - `state_ids` follows only `state_ids`.
    - The first matching rule `return`s, so a sibling `state_id` on the same `next` is ignored.
    - `statesMap` is `new Map(connected.map(...))`, so duplicate ids silently overwrite.
    - A child id missing from `statesMap` is skipped without a warning.
  - Iterator parents are created lazily through `buildOrAdjustIteratorNode` (`build/nodes/buildIteratorNode.ts:121`).
- Edge build rules (`build/edges/buildEdges.ts:250`):
  - It loops over ALL `config.states`, independent of the node walk.
  - A non-meta state with a decision gets one edge to its branch node. The branch node gets then/otherwise/case/default edges. `state_ids` and `state_id` give direct edges. `start` is connected to the entry state.
  - Edges are not checked against the node list. React Flow drops edges whose source or target node is absent.
- Layout (`build/layout.ts:146`): dagre, `rankdir: LR`, `ranksep: 100`, `nodesep: 80`. It is skipped when `hasSavedPositions` is true (`helpers/nodes/positionHelpers.ts:94`, `nodes.some(n => state._meta.position !== undefined)`).
  - Any node without a saved position gets `LAYOUT.DEFAULT_NODE_POSITION` {100,100} (`buildNodes.ts:97`, `build/constants.ts:9`).
  - dagre only drops edges whose endpoint is not in the laid-out node set (`layout.ts:195`).
- Dependents of this pipeline: `useWorkflowEditor`, `WorkflowVisualDiffView.tsx`, `utils/workflowEditor/diffWorkflowGraph*.ts` and `buildVisualDiffGraph` (uses `buildNodes`/`buildEdges`), `downloadWorkflowImage.ts`, and the edit page (`WorkflowForm` / `EditWorkflowPage`).

Purpose B: show the execution steps and keep them consistent with the graph.
- Drawer list (`WorkflowDetailsPage.tsx:124-131`): `extendExecutionStates(executionStates, editor.config.states)` then `groupIterationStates`. It lists every state the backend returned. It does NOT run `removeNonExistingStates`, so steps whose `resolvedId` is not in the config still show.
- Graph overlay (`useWorkflowEditorExecution.ts:95`): `removeNonExistingStates` drops execution states whose id is not in the config. It only decorates nodes; it never adds nodes (`applyExecutionStates`).
- So the drawer can list steps that the graph cannot show.
- `resolvedId` = `state.state_id ?? extractStateName(state.name)` (`extendExecutionStates.ts:41`). It is compared to config ids with exact case.

Purpose C: pick which YAML the details page graphs.
- `useWorkflowData.ts:104-136`: with an execution selected, the graph YAML is chosen from `yaml_config_history` plus the current config. It takes the entry with the smallest `date >= execution.date`. Otherwise it uses the current `yaml_config`. This is not the same as "the current /v1/workflows/{id}/ yaml_config".

Other touched code: none beyond the above.

### Decisions Already in the Code
- Reachability is judged from `states[0]`, with no explicit entry marker (`propagateConnectivity.ts:26`, comment: "always assuming it's an entry state"). The alternative is a state with no parents. No recorded reason.
- Unreachable states are rendered as orphans. Connected states that the node walk misses are not rendered. The two paths use different rules: DFS in the deserializer (all `findChildren`) versus a branch-specific walk in `buildNodes` (first-match, requires the branch node). The same state can therefore be "connected" but not walked. No recorded reason.
- Existing positions win over auto-layout whenever any node has one (`build/index.ts:28`). Convention: the YAML `meta_states` carry `position` and `measured`. The serializer writes them back (`serializer.ts:134`).
- Branches (condition/switch) and iterators are modelled as separate synthetic states with generated ids. Convention: `<type>_<n>`, via `generateStateID`.
- The read-only execution graph reuses the full editor component (`WorkflowEditor`, `isFullscreen={false}`), hence the same deserialize/build/layout.
- Duplicate YAML keys are tolerated (`js-yaml` `json: true`, `deserializer.ts:52`), so the last key wins silently.
- No id normalization: state ids are used as-is (case, hyphen and underscore are significant). The only rewrite is `start`/`end` to `*_state`.

### Task Statements Checked Against the Code
- "YAML valid and /v1/workflows/{id}/ payload correct": unverified. It is about the backend and the Philips data, and no sample is in the repo. The YAML, or the `yaml_config`/`yaml_config_history` payload, would settle it.
- "frontend mapping from payload/YAML to nodes and edges is the cause": holds as a location. The mapping is `deserialize` + `buildNodes`/`buildEdges`/`applyLayout` (Purpose A). The specific cause is unconfirmed.
- "graph uses the same complete structure as returned by /v1/workflows/{id}/": contradicted in one path. With an execution selected the details page may graph a historical YAML (`useWorkflowData.ts:104-136`), and without one it graphs `yaml_config`.
- "number of graph nodes matches number of states": contradicted by design. Iterator and branch nodes are extra synthetic nodes (`iterator_N`, `conditional_N`, `switch_N`), plus `start`/`end`. No existing check compares graph-node count to YAML states.
- "execution steps and graph remain consistent": the drawer and the graph take different filters (Purpose B). The graph filters execution states with `removeNonExistingStates`; the drawer list does not.
- "existing controls (zoom, pan, fit-to-screen, fullscreen) keep working": holds for the current implementation. `EditorControls`, `adjustViewport` and `fitView` have no node-count dependency.

### Consumers of Changed Contracts
Searched by name across `src/`. The task changes `buildNodes`, `deserialize`, and possibly `useWorkflowData`.
- `buildNodes` (`build/nodes`): `build/index.ts:24,30`, `utils/workflowEditor/index.ts:203` (`createState`), `buildVisualDiffGraph` (diff graph; test `utils/workflowEditor/__tests__/buildVisualDiffGraph.test.ts`).
- `buildEdges`: `build/index.ts:25`, `index.ts:220`, `buildVisualDiffGraph`.
- `deserialize` / `findOrphanedStates` / `deorphanReferencedStates`: used by `createworkflowEditor` and the diff utilities. Tests are in `deserializer/__tests__`.
- `hasSavedPositions`: `build/index.ts:28,38`. The unit test is `positionHelpers.test.ts:31-53`.
- `findConnectedEntryState`: `buildNodes.ts:239`, `buildEdges.ts:60`.
- `useWorkflowData`: `WorkflowDetailsPage.tsx:75`; test `details/hooks/__tests__/useWorkflowData.test.ts`, which covers polling only.

### Architecture and Layers Affected
Pure util layer (`src/utils/workflowEditor/{serialization,build,helpers}`), hooks (`useWorkflowEditor`, `useWorkflowData`), and page components (`WorkflowDetailsPage`, `WorkflowEditor`). No backend, store or API layer is involved in graph building.

### Integration Points
`workflowExecutionsStore.getWorkflow` (`store/workflowExecutions`) supplies `workflow` with `yaml_config` and `yaml_config_history`. Execution states come from `useExecutionStates`. ReactFlow and dagre are used as libraries.

### Patterns and Conventions
Pure functional utils with thin barrel `index.ts` files. Helpers are grouped by theme (`helpers/states|connections|nodes|executions`). `_meta` on each state holds all UI data (`type`, `position`, `measured`, `is_connected`, `data`).

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/development/workflow-editor-patterns.md` covers this domain. Its Serialization and Auto-Layout sections describe a `transitions`/`rankdir: TB` model that does not match the source (`next.*`, `rankdir: LR`). Per AGENTS.md "Conflict handling", trust the source.
- `.ai-run/guides/testing/testing-patterns.md` and `.ai-run/guides/testing/local-verification.md` apply to tests and the verification step.

### Architectural Decisions
None recorded for reachability, orphan handling or graph/execution consistency.

### Derived Conventions
See "Decisions Already in the Code".

---

## 4. Testing Landscape

### Existing Coverage
- Deserializer: `serialization/deserializer/__tests__/{deserializer,iterators,cleanupMetaStateReferences,deorphanReferencedStates}.test.ts`, with YAML fixtures `fixtures/workflow-with-{branches,iterator,multiple-iterators,same-iter-key}.yaml`.
- `helpers/nodes/__tests__/positionHelpers.test.ts`.
- `helpers/executions/__tests__/*` (applyExecutionStates, buildExecutionPath, removeNonExistingStates, buildStatesStatusMap).
- `utils/workflowEditor/__tests__/buildVisualDiffGraph.test.ts`.
- `pages/workflows/editor/__tests__/WorkflowEditor.test.tsx`.

### Testing Framework and Patterns
vitest 5 with Testing Library. Pure util tests sit in `__tests__` folders beside the code. YAML fixtures are used for deserializer tests. ReactFlow-dependent components are tested with mocks. Test naming and layout rules are in the testing guide.

### Coverage Gaps
- No test for `buildNodes` or `buildGraph` (`build/` has no `__tests__`).
- No test that compares node and edge counts to the YAML state count.
- No large or ~50-state fixture exists.
- `layout.ts` (`applyLayout`) is untested.
- No test covers a connected-but-unwalked state, partial `meta_states` positions, a missing branch node, or the drawer and graph consistency.

---

## 5. Configuration and Environment

### Environment Variables
None found relating to the graph (searched for graph, layout and workflow keywords in `src/`).

### Configuration Files
`build/constants.ts` (layout spacing, default position), `utils/workflowEditor/constants.ts` (ids, edge styling), `WorkflowEditor.tsx:141-156` (viewport and zoom).

### Feature Flags and Deployment Concerns
None found. The fix is frontend-only, shipped through `dist/`.

---

## 6. Risk Indicators

Hypotheses are ordered by how directly the code supports them. None is confirmed, because the Philips YAML is not in the repository.
- H1 (`buildNodes.ts:75,225,239`): a connected state the entry walk does not reach is never pushed. Candidates are a branch node missing from `config.states` (`findMetaState` returns null, so the children are dropped), a duplicate or colliding branch id, or a state with both a decision and `state_id`/`state_ids`. The matching symptom is that nodes after "Conditional" (Fetch-full-issue, then validate-full-issue) vanish. Edges for those states are still built but are dropped by React Flow.
- H2 (`createBranchState`, `deserializer.ts:144`): `generateStateID` is based only on states already loaded. A later `meta_next_state_id: conditional_1` from YAML `meta_states` can duplicate an earlier generated id. `Map` overwrites in the walk, and `.find` picks the first match.
- H3 (`positionHelpers.ts:100`, `buildNodes.ts:97`): the layout is skipped if any node has a saved position. All unpositioned nodes then share {100,100} and stack, so a partially positioned large workflow looks small. This is a rendering overlap, not a node omission.
- H4 (`useWorkflowData.ts:104-136`): with an execution selected the graph may show an older `yaml_config_history` entry, while the drawer shows the steps of that run. `removeNonExistingStates` is applied to the graph overlay only.
- H5 (`deserializer.ts:121`): a state named `Start`/`End` is renamed, and references to it keep the old id. Case-only differences in ids are never merged.
- The existing walk-versus-DFS rule split (Purpose A) means any fix in one place can change the other. `buildEdges` already uses a different, all-states rule.
- Speculative: any fix that changes `buildNodes` also affects the edit page, the visual diff and `createState`; no `buildNodes` tests exist today to catch regressions.
- Speculative: the acceptance criterion "node count equals YAML state count" has to account for synthetic iterator, branch, `start` and `end` nodes.
- The guide `workflow-editor-patterns.md` is out of date and cannot be used as a spec.
- The Philips YAML/payload is needed to confirm any hypothesis. It is not in the repo and is not named by a local path.

---

## 7. Summary for Complexity Assessment

The graph is produced entirely in the frontend utils layer: `deserialize` (YAML to states, with synthetic branch/iterator states and reachability flags), `buildNodes`/`buildEdges` (state config to React Flow elements), and `applyLayout` (dagre). The result is rendered by one component, `WorkflowEditor`, with no node caps, filtering or virtualization. The likely change surface is `build/nodes/buildNodes.ts`, `serialization/deserializer/deserializer.ts`, and possibly `details/hooks/useWorkflowData.ts` and the drawer-versus-graph filtering in `WorkflowDetailsPage.tsx`. Several consumers share these functions (edit page, visual diff, `createState`).

The code has no single obvious truncation point. It has several places where a state can silently disappear or overlap: an unwalked connected state, a branch id collision, a missing branch node, stacked unpositioned nodes, and a historical YAML. The deciding factor is the actual Philips YAML, which is not in the repo. The root cause therefore needs reproduction before the size can be fixed, and reproduction needs a ~50-state fixture.

Test posture is thin for this area. Deserializer and position helpers have tests, but `buildNodes`, `buildGraph` and `layout` have none, and no large-workflow fixture exists. The acceptance criteria require a new regression test and a manual check against the real workflow.

---

## 8. External References

None named by the task. The example workflow is a URL on `codemie.lab.epam.com`, which this agent could not reach. Its YAML is not available locally, so every cause above is unverified.
