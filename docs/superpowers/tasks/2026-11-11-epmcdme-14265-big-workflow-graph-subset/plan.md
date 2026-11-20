# EPMCDME-14265 Workflow graph renders every state - Implementation Plan

**Goal:** a ~50-state workflow graphs every state and transition; unique branch ids, flat node membership, and placed unpositioned nodes.
**Spec:** `spec.md` (this folder). **Analysis:** `technical-analysis.md`. Tests follow `.ai-run/guides/testing/testing-patterns.md`; run one test file at a time with vitest.
Commit per task using the repository's existing convention (ticket key EPMCDME-14265). New files copy the licence header of their sibling files.
Out of plan (owned by the flow): Step 0 H4 data check, Philips verification, whole-suite gates. Utils live in `src/utils/workflowEditor/`.

### Task 1: Characterize existing fixtures through buildGraph
Test-first: no - characterization; passes on current code and must stay green after Tasks 2-4 (spec AC6).
- [ ] Create `build/__tests__/existingFixtures.test.ts`. For each `serialization/deserializer/__tests__/fixtures/workflow-with-{branches,iterator,multiple-iterators,same-iter-key}.yaml`: `deserialize` then `buildGraph(config, true)` (`build/index.ts:20`); assert sorted node ids and sorted `source->target` edge strings against literal arrays pasted from a run on the unchanged code.
- [ ] Run it, and run `utils/workflowEditor/__tests__/buildVisualDiffGraph.test.ts` as the baseline.

### Task 2: Unique branch ids in the deserializer
Test-first: yes - two parents sharing `meta_next_state_id: conditional_7` end with the same branch id; a user state named `conditional_1` collides with a generated branch id.
Files: `helpers/states/idGenerators.ts:41`, `serialization/deserializer/deserializer.ts:132-181,322-327`; create `serialization/deserializer/__tests__/branchIds.test.ts`.
- [ ] Failing tests with small inline YAML: (a) duplicate `meta_next_state_id`: both branch states exist with distinct ids, each parent's `next.meta_next_state_id` points at its own branch, and the second branch holds the second parent's condition; (b) user state `conditional_1` plus an unnamed condition: generated branch id is not `conditional_1`; (c) a legitimate single `meta_next_state_id` that appears in `meta_states` keeps its id and position.
- [ ] Give `generateStateID` an optional third param `reservedIds: Iterable<string> = []`, counted like existing ids (existing callers unchanged).
- [ ] In `deserialize` build the reserved set once from user state ids, `orphanedStates` ids and `metaStates` ids; pass it through `processStates` to `createBranchState`. A `meta_next_state_id` is a duplicate when already used by a pushed state or equal to a user state id; the duplicate gets a generated id and an empty meta (not the first branch's position). `processStates` already writes the branch id into the parent's `next`.

### Task 3: Flat node-membership pass in buildNodes
Test-first: yes - a connected state the entry walk skips (decision plus sibling `state_id`) has no node today.
Files: `build/nodes/buildNodes.ts:292-319`; create `build/nodes/__tests__/buildNodes.test.ts`.
- [ ] Failing tests with hand-built configs (the backend may forbid the sibling form, so it lives only here): (a) parent with `condition` and sibling `state_id: c`: exactly one node per state id, walk nodes first, `c` appended, `console.warn` called once for `c`; (b) same for an iterator child (`next.meta_iter_state_id`) with its iterator node: one iterator node, one child with `parentId`, warn for the child only; (c) no duplicate ids, no second `start`/`end`, and no warn for a fully walked config.
- [ ] Add a pass inside `buildNodes`, after `buildOrphanedIterators` and before the `end` fallback: loop `configuration.states` in order; for each non-iterator, non-`start`/`end` state with no node yet, push `buildNode(...)` and `console.warn(\`Node added outside entry walk: ${id}\`)`. A decision parent also brings its branch node (if absent); a branch state with no parent in config is never added. Do not touch the walk.

### Task 4: Place unpositioned nodes before positions are saved
Test-first: yes - with partial saved positions, unpositioned nodes share {100,100} and that default is written to config.
Files: `build/index.ts:20-45`; create `build/__tests__/buildGraph.test.ts`.
- [ ] Failing test: YAML (or hand-built config) with `position` on some states only, `buildGraph(config, true)`: positioned nodes unchanged; unpositioned nodes pairwise distinct; returned `config` states carry no duplicate {100,100} (`saveStatesToMetaState`, `actions/states/utils.ts:78`, writes every node position, so placement must run first). Second test: all positioned leaves every position untouched; none positioned still takes the existing layout path.
- [ ] Before the `isInitialLoad && hasSavedPositions` block, when `isInitialLoad`, some node has a saved position and some lacks one: run `applyLayout(nodes, edges)` on all nodes and copy its position onto nodes whose state `_meta.position` is undefined. For an iterator child, convert the layout position into the child's actual parent frame (layout positions are relative to the layout's own iterator). Confirm by grep that the details page reaches `buildGraph` with `isInitialLoad` true (`hooks/useWorkflowEditor.ts:78`).

### Task 5: ~50-state fixture and build-layer regression test
Test-first: no - regression lock over the assembled fix; Tasks 2-4 carry their own failing tests.
Files: create `build/__tests__/fixtures/large-workflow.yaml`, `build/__tests__/largeWorkflow.test.ts`.
- [ ] Synthetic YAML, ~50 states: linear chains, `condition` branches, `switch` cases, a `state_ids` fan-out, an iterator with children, two parents sharing one `meta_next_state_id`, a user state named `conditional_1`, a `meta_next_state_id` equal to a would-be generated id, and `meta_states` with positions for only part of the states.
- [ ] Tests (`deserialize` + `buildGraph`): node ids contain every YAML state id plus only `start`, `end`, branch and iterator nodes, with the exact total asserted; no duplicate node ids; edge set equals the fixture's transitions (one edge per `state_id`, `state_ids`, `condition`, `switch` target from its source or branch node, both endpoints present); unpositioned nodes pairwise distinct and positioned nodes unchanged.

### Task 6: Large workflow through WorkflowEditor
Test-first: no - guards the component path; passes on arrival once Tasks 2-5 land.
Files: create `src/pages/workflows/editor/__tests__/WorkflowEditor.largeWorkflow.test.tsx`.
- [ ] Render `WorkflowEditor` (`isFullscreen={false}`, read-only props as in `details/WorkflowExecutionEditor.tsx:57`) with the fixture YAML and the real `useWorkflowEditor`. Mock `@xyflow/react`'s `ReactFlow` to capture its `nodes` prop (mock pattern: `WorkflowEditor.test.tsx:29-149`, but do not mock the hook). Assert the captured node ids equal the Task 5 expected set.

## Self-review
- Coverage: AC1-3,5 Task 5; AC4 Task 2 (+5); AC6 Task 1; AC7 Task 6; AC10 Task 3; Approach 3 Task 3; 4 Task 2; 5 Task 4. AC8-9 are manual (flow-owned).
- negative-constraints: honored. No backend, payload or schema change (all tasks frontend). Zoom, `EditorControls`, `fitView`, fullscreen, virtualization and node caps untouched (no task). Reachability from `states[0]`, the DFS and `buildEdges` untouched (Task 3 adds a pass and leaves the walk). Drawer listing and execution-only nodes untouched. `useWorkflowData` untouched. Saved positions never changed, only unpositioned nodes placed (Task 4). `workflow-editor-patterns.md` untouched. No Philips data (Task 5 is synthetic). The pass never adds `start`, `end`, iterators or parentless branch states, and never an id twice (Task 3).
- Plan notes applied: placement before `saveStatesToMetaState` (Task 4), `console.warn` asserted (Task 3), duplicate-branch and user-named `conditional_N` fixture cases (Tasks 2 and 5).
